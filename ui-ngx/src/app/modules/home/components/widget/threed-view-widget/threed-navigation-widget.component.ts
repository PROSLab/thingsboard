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

import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AppState } from '@core/core.state';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@core/services/threed-model-loader.service';
import {
  fillDataPattern,
  formattedDataFormDatasourceData,
  mergeFormattedData,
  processDataPattern
} from '@core/utils';
import { ACTIONS, ENVIRONMENT_ID } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-constants';
import { ThreedDeviceGroupSettings, ThreedViewWidgetSettings } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { WidgetContext } from '@home/models/widget-component.models';
import { Store } from '@ngrx/store';
import { PageComponent } from '@shared/components/page.component';
import { ThreedFirstPersonControllerComponent } from './threed/threed-components/threed-first-person-controller-component';
import { ThreedGenericSceneManager } from './threed/threed-managers/threed-generic-scene-manager';
import { ThreedScenes } from './threed/threed-scenes/threed-scenes';
import { ThreedGenericLoaderService } from '@app/core/services/threed-generic-loader.service';
import { ThreedWidgetActionManager } from './threed-widget-action-manager';
import { ThreedWidgetDataUpdateManager } from './threed-widget-data-update-manager';

/*
Widget Type: Ultimi Valori
Widget settings: 
  1) tb-simple-card-widget-settings (from Simple Card)
  2) tb-map-widget-settings (from Image Map)

Per navigare tra le dashboard (ex click su un sensore) mettere a disposizione un Azione click (vedi Image Map -> Azioni) 
Per modificare la posizione , scala... vedi Markers Placement - Image Map (anche se forse è meglio aggiungere qualcosa sui settings anzichè utilizzare un altro widget)

UNA VOLTA CREATO IL WIDGET-CODE:
Per aggiungere in automatico il widget quando si installa thingsboard, aggiungere un file json con le varie properties alla posizione (path assoluto): 'thingsboard-3.4.4\application\src\main\data\json\system\widget_bundles'
Altrimenti, se si aggiunge il widget a mano (tramite librertia widget/amministratore) è necessario premere su modifica (edit / icon penna) ed aggiornare i vari settings (in avanzate).

*/
@Component({
  selector: 'tb-threed-navigation-widget',
  templateUrl: './threed-navigation-widget.component.html',
  styleUrls: ['./threed-navigation-widget.component.scss']
})
export class ThreedNavigationWidgetComponent extends PageComponent implements OnInit, AfterViewInit {

  settings: ThreedViewWidgetSettings;

  @Input()
  ctx: WidgetContext;

  @ViewChild('rendererContainer') rendererContainer?: ElementRef;

  public pointerLocked: boolean = false;

  private navigationScene: ThreedGenericSceneManager;
  private actionManager: ThreedWidgetActionManager;
  private dataUpdateManager: ThreedWidgetDataUpdateManager;

  constructor(
    protected store: Store<AppState>,
    protected cd: ChangeDetectorRef,

    private threedLoader: ThreedGenericLoaderService
  ) {
    super(store);

    this.navigationScene = ThreedScenes.createNavigationScene();
  }

  ngOnInit(): void {
    this.ctx.$scope.threedNavigationWidget = this;
    this.settings = this.ctx.settings;

    this.initializeManagers();

    console.log(this.settings);
    if (!this.settings.hoverColor || !this.settings.threedSceneSettings) {
      console.warn("ThreedViewWidgetSettings object empty!")
      return;
    }

    this.navigationScene.setValues(this.settings);
    this.navigationScene.getComponent(ThreedFirstPersonControllerComponent).onPointerLockedChanged.subscribe(v => {
      this.pointerLocked = v;
      this.cd.detectChanges();
    });

    this.loadModels();
  }
  
  private initializeManagers() {
    this.actionManager = new ThreedWidgetActionManager(this.ctx);
    this.actionManager.createActions(ACTIONS.tooltip);
    this.dataUpdateManager = new ThreedWidgetDataUpdateManager(this.ctx, this.actionManager);
  }

  private loadModels() {
    this.loadEnvironment();
    this.loadDevices();
  }

  private loadEnvironment() {
    this.threedLoader.loadEnvironment(this.settings.threedSceneSettings.threedEnvironmentSettings, this.ctx.aliasController, this.navigationScene, ENVIRONMENT_ID, false);
  }

  private loadDevices() {
    this.threedLoader.loadDevices(this.settings.threedSceneSettings.threedDevicesSettings, this.ctx.aliasController, this.navigationScene);
  }

  ngAfterViewInit() {
    this.navigationScene.attachToElement(this.rendererContainer);
  }

  lockCursor() {
    this.navigationScene.getComponent(ThreedFirstPersonControllerComponent)?.lockControls();
  }

  public onDataUpdated() {
    this.dataUpdateManager.onDataUpdate(this.settings.threedSceneSettings?.threedDevicesSettings, this.navigationScene);

    //this.updateMarkers(formattedData, false, markerClickCallback);
  }

  /*
  updateMarkers(markersData: FormattedData[], updateBounds = true, callback?) {
    const rawMarkers = markersData.filter(mdata => !!this.extractPosition(mdata));

    rawMarkers.forEach(data => {
      const currentImage: MarkerImageInfo = safeExecute(this.settings.parsedMarkerImageFunction,
        [data, this.settings.markerImages, markersData, data.dsIndex]);
    });
  }*/

  public onResize(width: number, height: number): void {
    this.navigationScene.resize(width, height);
  }
}