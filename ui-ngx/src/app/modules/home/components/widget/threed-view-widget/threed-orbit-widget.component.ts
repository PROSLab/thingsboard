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

import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { PageComponent } from '@shared/components/page.component';
import { WidgetContext } from '@home/models/widget-component.models';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@core/services/threed-model-loader.service';
import { ThreedComplexOrbitWidgetSettings, ThreedSimpleOrbitWidgetSettings } from '@home/components/widget/threed-view-widget/threed-models';
import { ThreedOrbitScene } from './threed-orbit-scene';


@Component({
  selector: 'tb-threed-orbit-widget',
  templateUrl: './threed-orbit-widget.component.html',
  styleUrls: ['./threed-orbit-widget.component.scss']
})
export class ThreedOrbitWidgetComponent extends PageComponent implements OnInit, AfterViewInit {

  settings: ThreedSimpleOrbitWidgetSettings | ThreedComplexOrbitWidgetSettings;

  @Input()
  ctx: WidgetContext;

  @ViewChild('rendererContainer') rendererContainer?: ElementRef;

  private threedOrbitScene: ThreedOrbitScene<any, any>;

  constructor(
    protected store: Store<AppState>,
    protected cd: ChangeDetectorRef,
    private threedModelLoader: ThreedModelLoaderService
  ) {
    super(store);

    this.threedOrbitScene = new ThreedOrbitScene();
  }

  ngOnInit(): void {
    this.ctx.$scope.threedOrbitWidget = this;
    this.settings = this.ctx.settings;

    this.threedOrbitScene.updateValue(this.settings);

    this.loadModels();
  }

  private isThreedSimpleOrbitWidgetSettings(obj: any): obj is ThreedSimpleOrbitWidgetSettings {
    return 'useAttribute' in obj;
  }

  private isThreedComplexOrbitWidgetSettings(obj: any): obj is ThreedSimpleOrbitWidgetSettings {
    return 'type' in obj && obj.type == 'COMPLEX';
  }

  private loadModels() {
    if (this.isThreedSimpleOrbitWidgetSettings(this.settings)) {
      this.loadSingleModel(this.settings);
    } else if (this.isThreedComplexOrbitWidgetSettings(this.settings)) {
      this.loadEnvironment();
      this.loadDevices();
    } else {
      console.error("Orbit Settings not valid...");
    }
  }
  
  private loadSingleModel(settings: ThreedSimpleOrbitWidgetSettings) {
    if(this.ctx.datasources && this.ctx.datasources[0]){
      const datasource = this.ctx.datasources[0];

      const config: ThreedUniversalModelLoaderConfig = {
        entityLoader: this.threedModelLoader.toEntityLoader2(settings, datasource.aliasName),
        aliasController: this.ctx.aliasController
      }
      this.loadModel(config);
    }
  }

  private loadEnvironment() {
    /*
    const config: ThreedUniversalModelLoaderConfig = {
      entityLoader: this.threedModelLoader.toEntityLoader(this.settings.threedSceneSettings.threedEnvironmentSettings),
      aliasController: this.ctx.aliasController
    }

    console.log(config);

    this.loadModel(config, ENVIRONMENT_ID, false);
    */
  }

  private loadDevices() {
    /*
    this.settings.threedSceneSettings.threedDevicesSettings.threedDeviceGroupSettings.forEach((deviceGroup: ThreedDeviceGroupSettings) => {
      const loaders = this.threedModelLoader.toEntityLoaders(deviceGroup);
      loaders.forEach(entityLoader => {
        const config: ThreedUniversalModelLoaderConfig = {
          entityLoader,
          aliasController: this.ctx.aliasController
        }

        this.loadModel(config);
      })
    });
    */
  }

  private loadModel(config: ThreedUniversalModelLoaderConfig, id?: string, hasTooltip: boolean = true) {
    if (!this.threedModelLoader.isConfigValid(config)) return;

    this.threedModelLoader.loadModelAsGLTF(config).subscribe(res => {
      this.threedOrbitScene.replaceModel(res.model, id ? id : res.entityId/*TODO: , hasTooltip */);
    });
  }

  ngAfterViewInit() {
    this.threedOrbitScene.attachToElement(this.rendererContainer);
  }


  public onDataUpdated() {

  }

  public onResize(width: number, height: number): void {
    this.threedOrbitScene?.resize(width, height);
  }

  @HostListener('window:keyup', ['$event'])
  keyUpEvent(event: KeyboardEvent) {
    this.threedOrbitScene?.onKeyUp(event);
  }
  @HostListener('window:keydown', ['$event'])
  keyDownEvent(event: KeyboardEvent) {
    this.threedOrbitScene?.onKeyDown(event);
  }
  @HostListener('window:mousemove', ['$event'])
  public mousemove(event: MouseEvent): void {
    this.threedOrbitScene?.onMouseMove(event);
  }
  @HostListener('window:click', ['$event'])
  public mouseclick(event: MouseEvent): void {
    this.threedOrbitScene?.onMouseClick(event);
  }
}