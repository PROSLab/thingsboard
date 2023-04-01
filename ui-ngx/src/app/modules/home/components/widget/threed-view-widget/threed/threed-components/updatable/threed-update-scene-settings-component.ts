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

import { ThreedBaseComponent } from "../threed-base-component";
import { IThreedUpdatable } from "../ithreed-updatable";
import { ThreedEnvironmentSettings, ThreedSceneSettings } from "../../../threed-models";
import { ENVIRONMENT_ID } from "../../../threed-constants";
import { IThreedSceneManager } from "../../threed-managers/ithreed-scene-manager";
import { ThreedUpdateEnvironmentComponent } from "./threed-update-environment-component";
import { ThreedUpdateCameraComponent } from "./threed-update-camera-component";
import { ThreedUpdateDevicesComponent } from "./threed-update-devices-component";


export class ThreedUpdateSceneSettingsComponent extends ThreedBaseComponent implements IThreedUpdatable {

    private environment: ThreedUpdateEnvironmentComponent;
    private camera: ThreedUpdateCameraComponent;
    private devices: ThreedUpdateDevicesComponent;

    override initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.environment = new ThreedUpdateEnvironmentComponent();
        this.camera = new ThreedUpdateCameraComponent(/* TODO: pass camera! */);
        this.devices = new ThreedUpdateDevicesComponent();

        this.environment.initialize(sceneManager);
        this.camera.initialize(sceneManager);
        this.devices.initialize(sceneManager);
    }

    onUpdateValues(values: any): void {

        console.log("Update values ThreedUpdateSceneSettingsComponent", values);

        if(!values) return;
        const settings: ThreedSceneSettings = values;
        if(!settings) return;

        this.environment.onUpdateValues(settings.threedEnvironmentSettings);
        this.camera.onUpdateValues(settings.threedCameraSettings);
        this.devices.onUpdateValues(settings.threedDevicesSettings);
    }
}