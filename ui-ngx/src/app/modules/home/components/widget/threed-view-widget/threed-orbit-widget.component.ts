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
import { MatSliderChange } from '@angular/material/slider';
import { AppState } from '@core/core.state';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@core/services/threed-model-loader.service';
import { ENVIRONMENT_ID } from '@home/components/widget/threed-view-widget/threed-constants';
import {
  ThreedComplexOrbitWidgetSettings,
  ThreedDeviceGroupSettings,
  ThreedSimpleOrbitWidgetSettings,
  isThreedComplexOrbitWidgetSettings,
  isThreedSimpleOrbitWidgetSettings
} from '@home/components/widget/threed-view-widget/threed-models';
import { WidgetContext } from '@home/models/widget-component.models';
import { Store } from '@ngrx/store';
import { PageComponent } from '@shared/components/page.component';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { ThreedGenericSceneManager } from './threed/threed-managers/threed-generic-scene-manager';
import { ThreedScenes } from './threed/threed-scenes/threed-scenes';
import { ThreedOrbitControllerComponent } from './threed/threed-components/threed-orbit-controller-component';


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

  private orbitScene: ThreedGenericSceneManager;

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

  }

  ngOnInit(): void {
    this.ctx.$scope.threedOrbitWidget = this;
    this.settings = this.ctx.settings;

    if (isThreedSimpleOrbitWidgetSettings(this.settings)) {
      this.orbitScene = ThreedScenes.createSimpleOrbitScene();
      this.loadSingleModel(this.settings);
    } else if (isThreedComplexOrbitWidgetSettings(this.settings)) {
      this.orbitScene = ThreedScenes.createComplexOrbitScene();
      this.loadEnvironment(this.settings);
      this.loadDevices(this.settings);
    } else {
      console.error("Orbit Settings not valid...", this.settings);
    }

    this.orbitScene.setValues(this.settings);
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
      this.orbitScene.modelManager.replaceModel(res.model, { id: id ? id : res.entityId, autoResize: true }/*TODO: , hasTooltip */);
    });
  }

  ngAfterViewInit() {
    this.orbitScene.attachToElement(this.rendererContainer);
  }


  public onDataUpdated() {

  }

  public toggleExplodedView() {
    this.explodedView = !this.explodedView;
    if (!this.explodedView && this.lastExplodeFactorValue > 0) {
      this.animating = true;
      const duration = 300; // Duration of animation in milliseconds
      const fromValue = this.lastExplodeFactorValue; // Start value of variable
      const toValue = 0; // End value of variable
      new TWEEN.Tween({ value: fromValue })
        .to({ value: toValue }, duration)
        .onUpdate((update: { value: number }) => {
          this.orbitScene.modelManager.explodeObjectByDistance(this.DEFAULT_MODEL_ID, update.value);
        })
        .onComplete(() => {
          this.lastExplodeFactorValue = 0;
          this.animating = false;
          this.cd.detectChanges();
        })
        .start();
    }
  }

  public explodeFactorChange(e: MatSliderChange) {
    this.lastExplodeFactorValue = e.value;
    this.orbitScene.modelManager.explodeObjectByDistance(this.DEFAULT_MODEL_ID, e.value);
  }

  public focusOnObject() {
    this.orbitScene.getComponent(ThreedOrbitControllerComponent).focusOnObject(undefined, 500);
  }

  public onResize(width: number, height: number): void {
    this.orbitScene.resize(width, height);
  }
}