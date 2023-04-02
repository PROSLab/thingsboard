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
import {
  isThreedComplexOrbitWidgetSettings,
  isThreedSimpleOrbitWidgetSettings,
  ThreedComplexOrbitWidgetSettings,
  ThreedDeviceGroupSettings,
  ThreedSimpleOrbitWidgetSettings
} from '@home/components/widget/threed-view-widget/threed-models';
import { MatSliderChange } from '@angular/material/slider';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { ENVIRONMENT_ID } from '@home/components/widget/threed-view-widget/threed-constants';
import { ThreedOrbitScene } from './threed-orbit-scene';
import { ThreedGenericSceneManager } from './threed/threed-managers/threed-generic-scene-manager';
import { ThreedScenes } from './threed/threed-scenes/threed-scenes';
import { ThreedFirstPersonControllerComponent } from './threed/threed-components/threed-first-person-controller-component';


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

  private threedOrbitScene: ThreedOrbitScene;
  private sceneA: ThreedGenericSceneManager;

  public explodedView = false;
  public animating = false;
  private lastExplodeFactorValue = 0;

  private readonly DEFAULT_MODEL_ID = "DefaultModelId"

  constructor(
    protected store: Store<AppState>,
    protected cd: ChangeDetectorRef,
    private threedModelLoader: ThreedModelLoaderService
  ) {
    super(store);

    this.threedOrbitScene = new ThreedOrbitScene(undefined, { createGrid: false, shadow: true });
  }

  ngOnInit(): void {
    this.ctx.$scope.threedOrbitWidget = this;
    this.settings = this.ctx.settings;


    if (isThreedSimpleOrbitWidgetSettings(this.settings)) {
      this.sceneA = ThreedScenes.createSimpleOrbitScene();
      this.loadSingleModel(this.settings);
    } else if (isThreedComplexOrbitWidgetSettings(this.settings)) {
      this.sceneA = ThreedScenes.createEditorScene();//ThreedSceneA.createComplexOrbitScene();
      this.loadEnvironment(this.settings);
      this.loadDevices(this.settings);
    } else {
      console.error("Orbit Settings not valid...", this.settings);
    }

    /*
    if (this.ctx.datasources && this.ctx.datasources[0]) {
      const datasource = this.ctx.datasources[0];

      const config: ThreedUniversalModelLoaderConfig = {
        entityLoader: this.threedModelLoader.toEntityLoader2(this.settings as ThreedSimpleOrbitWidgetSettings, datasource.aliasName),
        aliasController: this.ctx.aliasController
      }
      this.threedModelLoader.loadModelAsGLTF(config).subscribe(res => {
        this.sceneA.modelManager.replaceModel(res.model, { id: this.DEFAULT_MODEL_ID, autoResize: true });
      });
    }*/

    this.sceneA.setValues(this.settings);
    //this.threedOrbitScene.updateValue(this.settings);

    //this.loadModels();
  }

  private loadModels() {
    if (isThreedSimpleOrbitWidgetSettings(this.settings)) {
      this.loadSingleModel(this.settings);
    } else if (isThreedComplexOrbitWidgetSettings(this.settings)) {
      this.loadEnvironment(this.settings);
      this.loadDevices(this.settings);
    } else {
      console.error("Orbit Settings not valid...", this.settings);
    }
  }

  private loadSingleModel(settings: ThreedSimpleOrbitWidgetSettings) {
    if (this.ctx.datasources && this.ctx.datasources[0]) {
      const datasource = this.ctx.datasources[0];

      const config: ThreedUniversalModelLoaderConfig = {
        entityLoader: this.threedModelLoader.toEntityLoader2(settings, datasource.aliasName),
        aliasController: this.ctx.aliasController
      }
      this.loadModel(config, this.DEFAULT_MODEL_ID);
    }
  }

  private loadEnvironment(settings: ThreedComplexOrbitWidgetSettings) {
    const config: ThreedUniversalModelLoaderConfig = {
      entityLoader: this.threedModelLoader.toEntityLoader(settings.threedSceneSettings.threedEnvironmentSettings),
      aliasController: this.ctx.aliasController
    }

    console.log(config);

    this.loadModel(config, ENVIRONMENT_ID, false);
  }

  private loadDevices(settings: ThreedComplexOrbitWidgetSettings) {
    settings.threedSceneSettings.threedDevicesSettings.threedDeviceGroupSettings.forEach((deviceGroup: ThreedDeviceGroupSettings) => {
      const loaders = this.threedModelLoader.toEntityLoaders(deviceGroup);
      loaders.forEach(entityLoader => {
        const config: ThreedUniversalModelLoaderConfig = {
          entityLoader,
          aliasController: this.ctx.aliasController
        }

        this.loadModel(config);
      })
    });
  }

  private loadModel(config: ThreedUniversalModelLoaderConfig, id?: string, hasTooltip: boolean = true) {
    if (!this.threedModelLoader.isConfigValid(config)) return;

    this.threedModelLoader.loadModelAsGLTF(config).subscribe(res => {
      this.sceneA.modelManager.replaceModel(res.model, { id: id ? id : res.entityId, autoResize: true });
      //this.threedOrbitScene.replaceModel(res.model, { id: id ? id : res.entityId, autoResize: true }/*TODO: , hasTooltip */);
    });
  }

  ngAfterViewInit() {
    //this.threedOrbitScene.attachToElement(this.rendererContainer);
    this.sceneA.attachToElement(this.rendererContainer);
  }


  public onDataUpdated() {

  }

  public toggleExplodedView() {

    this.sceneA.getComponent(ThreedFirstPersonControllerComponent).lockControls();

    this.explodedView = !this.explodedView;
    if (!this.explodedView && this.lastExplodeFactorValue > 0) {
      this.animating = true;
      const duration = 300; // Duration of animation in milliseconds
      const fromValue = this.lastExplodeFactorValue; // Start value of variable
      const toValue = 0; // End value of variable
      new TWEEN.Tween({ value: fromValue })
        .to({ value: toValue }, duration)
        .onUpdate((update: { value: number }) => {
          this.threedOrbitScene?.explodeObjectByDistance(this.DEFAULT_MODEL_ID, update.value);
          this.sceneA.modelManager.explodeObjectByDistance(this.DEFAULT_MODEL_ID, update.value);
        })
        .onComplete(() => {
          this.lastExplodeFactorValue = 0;
          this.animating = false;
        })
        .start();
    }
  }

  public explodeFactorChange(e: MatSliderChange) {
    this.lastExplodeFactorValue = e.value;
    this.threedOrbitScene?.explodeObjectByDistance(this.DEFAULT_MODEL_ID, e.value);
    this.sceneA.modelManager.explodeObjectByDistance(this.DEFAULT_MODEL_ID, e.value);
  }

  public onResize(width: number, height: number): void {
    //this.threedOrbitScene?.resize(width, height);
    this.sceneA.resize(width, height);
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