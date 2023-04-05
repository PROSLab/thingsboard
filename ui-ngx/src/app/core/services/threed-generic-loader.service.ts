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

import { Injectable } from '@angular/core';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from './threed-model-loader.service';
import { ThreedDeviceGroupSettings, ThreedDevicesSettings, ThreedEnvironmentSettings, ThreedSimpleOrbitWidgetSettings } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { IThreedSceneManager } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-managers/ithreed-scene-manager';
import { IAliasController } from '../public-api';

@Injectable({
  providedIn: 'root'
})
export class ThreedGenericLoaderService {

  constructor(
    private threedModelLoader: ThreedModelLoaderService
  ) { }

  public loadSingleModel(
    settings: ThreedSimpleOrbitWidgetSettings,
    aliasName: string,
    aliasController: IAliasController,
    scene: IThreedSceneManager,
    id?: string, 
    hasTooltip: boolean = true) {

    const config: ThreedUniversalModelLoaderConfig = {
      entityLoader: this.threedModelLoader.toEntityLoader2(settings, aliasName),
      aliasController
    }

    this.threedModelLoader.loadModelInScene(scene, config, id, hasTooltip);
  }

  public loadEnvironment(
    settings: ThreedEnvironmentSettings,
    aliasController: IAliasController,
    scene: IThreedSceneManager,
    id?: string, 
    hasTooltip: boolean = true
  ) {
    const config: ThreedUniversalModelLoaderConfig = {
      entityLoader: this.threedModelLoader.toEntityLoader(settings),
      aliasController
    }

    this.threedModelLoader.loadModelInScene(scene, config, id, hasTooltip);
  }

  public loadDevices(
    settings: ThreedDevicesSettings,
    aliasController: IAliasController,
    scene: IThreedSceneManager,
    id?: string, 
    hasTooltip: boolean = true
  ) {
    settings.threedDeviceGroupSettings.forEach((deviceGroup: ThreedDeviceGroupSettings) => {
      const loaders = this.threedModelLoader.toEntityLoaders(deviceGroup);
      loaders.forEach(entityLoader => {
        const config: ThreedUniversalModelLoaderConfig = {
          entityLoader,
          aliasController
        }

        this.threedModelLoader.loadModelInScene(scene, config, id, hasTooltip);
      })
    });
  }
}
