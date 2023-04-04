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
import { ACTIONS, ENVIRONMENT_ID, OBJECT_ID_TAG, ROOT_TAG } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-constants';
import {
  ThreedComplexOrbitWidgetSettings,
  ThreedDeviceGroupSettings,
  ThreedSimpleOrbitWidgetSettings,
  isThreedComplexOrbitWidgetSettings,
  isThreedSimpleOrbitWidgetSettings
} from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { Datasource, WidgetActionDescriptor } from '@app/shared/public-api';
import { AppState } from '@core/core.state';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@core/services/threed-model-loader.service';
import {
  fillDataPattern,
  formattedDataFormDatasourceData,
  mergeFormattedData,
  processDataPattern
} from '@core/utils';
import { WidgetContext } from '@home/models/widget-component.models';
import { Store } from '@ngrx/store';
import { PageComponent } from '@shared/components/page.component';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { parseWithTranslation } from '../lib/maps/common-maps-utils';
import { IThreedTester } from './threed/threed-components/ithreed-tester';
import { ThreedHightlightRaycasterComponent } from './threed/threed-components/threed-hightlight-raycaster-component';
import { ThreedOrbitControllerComponent } from './threed/threed-components/threed-orbit-controller-component';
import { ThreedProgressBarComponent } from './threed/threed-components/threed-progress-bar-component';
import { ThreedGenericSceneManager } from './threed/threed-managers/threed-generic-scene-manager';
import { ThreedScenes } from './threed/threed-scenes/threed-scenes';
import { ThreedUtils } from './threed/threed-utils';


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

  public activeMode = 'selection';
  public explodedView = false;
  public animating = false;
  private lastExplodeFactorValue = 0;
  private currentExplodedObjectId?: string;

  public orbitType: 'simple' | 'complex' = 'simple';
  public loadingProgress = 100;

  private readonly DEFAULT_MODEL_ID = "DefaultModelId"

  private tooltipAction: any;

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
      this.orbitType = 'simple';
      this.orbitScene = ThreedScenes.createSimpleOrbitScene();
      this.loadSingleModel(this.settings);
    } else if (isThreedComplexOrbitWidgetSettings(this.settings)) {
      this.orbitType = 'complex';
      this.orbitScene = ThreedScenes.createComplexOrbitScene();
      this.loadEnvironment(this.settings);
      this.loadDevices(this.settings);
    } else {
      console.error("Orbit Settings not valid...", this.settings);
    }

    this.tooltipAction = this.getDescriptors(ACTIONS.tooltip);
    this.orbitScene.setValues(this.settings);

  }




  getDescriptors(name: string): { [name: string]: ($event: Event, datasource: Datasource) => void } {
    const descriptors = this.ctx.actionsApi.getActionDescriptors(name);
    const actions = {};
    descriptors.forEach(descriptor => {
      actions[descriptor.name] = ($event: Event, datasource: Datasource) => this.onCustomAction(descriptor, $event, datasource);
    }, actions);
    return actions;
  }
  private onCustomAction(descriptor: WidgetActionDescriptor, $event: Event, entityInfo: Datasource) {
    if ($event) {
      $event.preventDefault();
      $event.stopPropagation();
    }
    const { entityId, entityName, entityLabel, entityType } = entityInfo;
    this.ctx.actionsApi.handleWidgetAction($event, descriptor, {
      entityType,
      id: entityId
    }, entityName, null, entityLabel);
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

    const progressBarComponent = this.orbitScene.getComponent(ThreedProgressBarComponent);
    this.threedModelLoader.loadModelAsGLTF(config, progressBarComponent).subscribe(res => {
      const customId = id ? id : res.entityId;
      this.orbitScene.modelManager.replaceModel(res.model, { id: customId, autoResize: true });
      if (hasTooltip) this.orbitScene.cssManager.createLabel(customId);
    });
  }

  ngAfterViewInit() {
    this.orbitScene.attachToElement(this.rendererContainer);
  }


  public onDataUpdated() {
    if (this.orbitType == 'simple') return;

    if (this.ctx.datasources.length > 0) {
      var tbDatasource = this.ctx.datasources[0];
      // TODO...
    }

    const data = this.ctx.data;
    let formattedData = formattedDataFormDatasourceData(data);
    if (this.ctx.latestData && this.ctx.latestData.length) {
      const formattedLatestData = formattedDataFormDatasourceData(this.ctx.latestData);
      formattedData = mergeFormattedData(formattedData, formattedLatestData);
    }

    // We associate the new data with the tooltip settings, according to the entity alias
    formattedData.forEach(fd => {
      (this.settings as ThreedComplexOrbitWidgetSettings).threedSceneSettings?.threedDevicesSettings?.threedDeviceGroupSettings?.forEach(deviceGroup => {
        if (deviceGroup.threedTooltipSettings.showTooltip) {
          if (deviceGroup.threedEntityAliasSettings.entityAlias == fd.aliasName) {
            const pattern = deviceGroup.threedTooltipSettings.tooltipPattern;
            const tooltipText = parseWithTranslation.prepareProcessPattern(pattern, true);
            const replaceInfoTooltipMarker = processDataPattern(tooltipText, fd);
            const content = fillDataPattern(tooltipText, replaceInfoTooltipMarker, fd);

            const tooltip = this.orbitScene.cssManager.updateLabelContent([fd.entityId, ENVIRONMENT_ID], content);
            if (tooltip) this.bindPopupActions(tooltip.divElement, fd.$datasource);
          }
        }
      });
    });

    //this.updateMarkers(formattedData, false, markerClickCallback);
  }

  private bindPopupActions(tooltip: HTMLDivElement, datasource: Datasource) {
    const actions = tooltip.getElementsByClassName('tb-custom-action');
    Array.from(actions).forEach(
      (element: HTMLElement) => {
        const actionName = element.getAttribute('data-action-name');
        if (element && this.tooltipAction[actionName]) {
          element.addEventListener('pointerdown', $event => {
            this.tooltipAction[actionName]($event, datasource);
          });
        }
      });
  }

  public toggleExplodedView() {
    this.explodedView = !this.explodedView;

    const raycastComponent = this.orbitScene.getComponent(ThreedHightlightRaycasterComponent);
    if (raycastComponent) {
      raycastComponent.raycastEnabled = !this.explodedView && this.activeMode == 'selection';
    }

    if (!this.explodedView && this.lastExplodeFactorValue > 0) {
      this.animating = true;
      const duration = 300; // Duration of animation in milliseconds
      const fromValue = this.lastExplodeFactorValue; // Start value of variable
      const toValue = 0; // End value of variable
      new TWEEN.Tween({ value: fromValue })
        .to({ value: toValue }, duration)
        .onUpdate((update: { value: number }) => {
          this.orbitScene.modelManager.explodeObjectByDistance(this.currentExplodedObjectId || this.DEFAULT_MODEL_ID, update.value);
        })
        .onComplete(() => {
          this.lastExplodeFactorValue = 0;
          this.animating = false;
          this.currentExplodedObjectId = undefined;
          this.cd.detectChanges();
        })
        .start();
    }
  }

  public explodeFactorChange(e: MatSliderChange) {
    this.lastExplodeFactorValue = e.value;

    const selectorComponents = this.orbitScene.findComponentsByTester(IThreedTester.isIThreedObjectSelector);
    let selectedObject: THREE.Object3D | undefined;
    for (const c of selectorComponents) {
      selectedObject = c.getSelectedObject();
      if (selectedObject) break;
    }

    let objectId = this.DEFAULT_MODEL_ID;
    if (selectedObject) {
      const root = ThreedUtils.findParentByChild(selectedObject, ROOT_TAG, true);
      objectId = root?.userData[OBJECT_ID_TAG] || objectId;
    }

    this.currentExplodedObjectId = objectId;
    this.orbitScene.modelManager.explodeObjectByDistance(objectId, e.value);
  }

  public focusOnObject() {
    this.orbitScene.getComponent(ThreedOrbitControllerComponent).focusOnObject(undefined, 500);
  }

  public clickMode(mode: 'selection' | 'pan') {
    this.activeMode = mode;
    const raycastComponent = this.orbitScene.getComponent(ThreedHightlightRaycasterComponent);
    if (raycastComponent) raycastComponent.raycastEnabled = mode == 'selection';
  }

  public onResize(width: number, height: number): void {
    this.orbitScene.resize(width, height);
  }
}