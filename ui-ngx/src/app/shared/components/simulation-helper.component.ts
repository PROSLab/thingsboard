///
/// Copyright © 2016-2023 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { ChangeDetectorRef, Input, AfterViewInit, OnDestroy, Component, ElementRef, OnInit, ViewChild, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { IAliasController } from '@app/core/public-api';
import { ThreedDynamicMenuDialogComponent } from '@app/modules/home/components/widget/lib/settings/threed/threed-dynamic-menu-dialog.component';
import { Threed } from '@app/modules/home/components/widget/threed-view-widget/threed/threed';
import { ThreedFirstPersonControllerComponent } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-components/threed-first-person-controller-component';
import { ThreedGenericSceneManager } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-managers/threed-generic-scene-manager';
import { AssetModel, ScriptModel, SimulationState, ThreedSimulationWidgetSettings } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { ThreedScenes } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-scenes/threed-scenes';
import { AppState } from '@core/core.state';
import { Store } from '@ngrx/store';
import { PageComponent } from '@shared/components/page.component';
import { DatasourceData, EntityAlias, EntityAliases, EntityInfo, FormattedData } from "@app/shared/public-api";


@Component({
  selector: 'tb-simulation-helper',
  templateUrl: './simulation-helper.component.html',
  styleUrls: ['./simulation-helper.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SimulationHelperComponent),
      multi: true
    }
  ]
})
export class SimulationHelperComponent extends PageComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('rendererContainer') rendererContainer?: ElementRef;

  @Input()
  public aliasController: IAliasController;

  @Input()
  public settings: ThreedSimulationWidgetSettings;

  @Input()
  public editor: boolean;

  private context: any;
  private timeHandler: NodeJS.Timeout;
  private menuData: any = {};

  public simulationScene: ThreedGenericSceneManager;
  public simulationState: SimulationState = SimulationState.UNCOMPILED;
  public time: number = 0;
  public SimulationState = SimulationState;

  constructor(
    protected store: Store<AppState>,
    private cd: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    super(store);
  }

  ngOnInit(): void {
    this.createSimulationScene();
  }

  ngAfterViewInit(): void {
    this.simulationScene?.attachToElement(this.rendererContainer);
  }

  ngOnDestroy(): void {
    this.simulationScene?.destroy();
  }

  public onEditModeChanged(isEdit: boolean) {
    if (this.simulationScene)
      this.simulationScene.active = isEdit;
  }

  public onResize(width: number, height: number): void {
    this.simulationScene?.resize(width - 2, height - 2);
  }

  public updateSettings(settings: ThreedSimulationWidgetSettings) {
    this.settings = settings;
  }

  async compile() {
    if (this.simulationState == SimulationState.SETUP_DONE || this.simulationState == SimulationState.STARTED) return;

    this.simulationState = SimulationState.COMPILING;
    const a = this.settings.assets;
    const s = this.settings.scripts;
    const assets: { [key: string]: AssetModel } = this.toDictionary(a, i => i.name);
    const entities = await this.getEntities();
    const scripts: { [key: string]: ScriptModel } = this.toDictionary(s, i => i.name);
    this.context = { assets, entities, scripts, userData: {}, menuData: this.menuData };

    const setupScript = scripts["setup.js"];
    const functionRef = new Function('context', 'simulationScene', 'Threed', setupScript.body);

    try {
      this.createSimulationScene();
      const result = functionRef(this.context, this.simulationScene, Threed);
      if (result instanceof Promise)
        await result;
      this.simulationState = SimulationState.SETUP_DONE;
      this.cd.detectChanges();
      console.log(result);
    } catch (error) {
      console.error(error);
      this.simulationState = SimulationState.UNCOMPILED;
    }
  }

  async startSimulation() {
    if (this.simulationState == SimulationState.STARTED) return;

    await this.compile();
    const startScript = this.context.scripts["start.js"];
    const functionRef = new Function('context', 'simulationScene', 'Threed', startScript.body);

    try {
      const result = functionRef(this.context, this.simulationScene, Threed);
      this.simulationState = SimulationState.STARTED;
      console.log(result);
    } catch (error) {
      console.error(error);
      this.simulationState = SimulationState.UNCOMPILED;
    }


    const millis = 200;
    this.time = 0;
    this.timeHandler = setInterval(() => {
      this.time += millis / 1000;
      this.time = Number(this.time.toFixed(2));
      this.cd.detectChanges();
    }, millis);
  }

  public lockCursor() {
    this.simulationScene?.getComponent(ThreedFirstPersonControllerComponent)?.lockControls();
  }

  public stopSimulation() {
    clearInterval(this.timeHandler);
    this.simulationState = SimulationState.UNCOMPILED;
    this.time = 0;

    const stopScript = this.context.scripts["stop.js"];
    const functionRef = new Function('context', 'simulationScene', 'Threed', stopScript.body);

    try {
      const result = functionRef(this.context, this.simulationScene, Threed);
      console.log(result);
    } catch (error) {
      console.error(error);
    }

    this.simulationScene?.destroy();
    this.simulationScene = undefined;
  }

  public resetSimulation() {
    const resetScript = this.context.scripts["reset.js"];
    const functionRef = new Function('context', 'simulationScene', 'Threed', resetScript.body);

    try {
      const result = functionRef(this.context, this.simulationScene, Threed);
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }

  public onDataUpdate(data: FormattedData[]) {
    if (!this.context || !this.context.scripts || !this.context.scripts["onDataUpdate.js"]) return;

    const resetScript = this.context.scripts["onDataUpdate.js"];
    const functionRef = new Function('context', 'simulationScene', 'Threed', 'datasources', resetScript.body);

    try {
      const result = functionRef(this.context, this.simulationScene, Threed, data);
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }

  public openOptionsMenu() {
    const html = this.settings.menuHtml;
    const css = this.settings.menuHtml;
    const jsBody = this.settings.menuJs;
    const fnc = new Function('context', 'simulationScene', 'Threed', jsBody);
    this.dialog.open(ThreedDynamicMenuDialogComponent, {
      width: '50%',
      data: { html, css, js: { fnc, args: [this.context, this.simulationScene, Threed] } }
    });
  }

  public createSimulationScene() {
    this.simulationScene?.destroy();
    this.simulationScene = ThreedScenes.createSimulationScene();
    if (this.rendererContainer)
      this.simulationScene.attachToElement(this.rendererContainer);
  }

  private async getEntities() {
    const entities: {
      entityAliases: EntityAliases,
      entityAliasesList: { alias: string, id: string }[],
      entityInfos: EntityInfo[]
    } = {
      entityAliases: this.aliasController.getEntityAliases(),
      entityAliasesList: [],
      entityInfos: []
    }
    for (const aliasId of Object.keys(entities.entityAliases)) {
      entities.entityAliasesList.push({
        alias: entities.entityAliases[aliasId].alias,
        id: aliasId
      });
      const entityInfo = await this.aliasController.resolveEntitiesInfo(aliasId).toPromise();
      if(Array.isArray(entityInfo)) entityInfo.forEach(e => entities.entityInfos.push(e));
      else entities.entityInfos.push(entityInfo);
    }

    return entities;
  }

  private toDictionary<T>(
    arr: T[],
    keySelector: (item: T) => string
  ): { [key: string]: T } {
    return arr.reduce((obj: { [key: string]: T }, item: T) => {
      const key = keySelector(item);
      obj[key] = item;
      return obj;
    }, {});
  }
}
