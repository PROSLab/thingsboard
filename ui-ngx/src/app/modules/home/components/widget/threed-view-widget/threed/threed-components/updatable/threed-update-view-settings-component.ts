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

import { ThreedComplexOrbitWidgetSettings } from "../../threed-models";
import { IThreedSceneManager } from "../../threed-managers/ithreed-scene-manager";
import { IThreedPerspectiveCamera } from "../ithreed-perspective-camera";
import { IThreedUpdatable } from "../ithreed-updatable";
import { ThreedBaseComponent } from "../threed-base-component";
import { ThreedHightlightRaycasterComponent } from "../threed-hightlight-raycaster-component";
import { ThreedUpdateSceneSettingsComponent } from "./threed-update-scene-settings-component";

export class ThreedUpdateViewSettingsComponent extends ThreedBaseComponent implements IThreedUpdatable {

    private scene: ThreedUpdateSceneSettingsComponent; 
    private cameraToUpdate?: IThreedPerspectiveCamera;

    constructor(cameraToUpdate?: IThreedPerspectiveCamera) {
        super();
        this.cameraToUpdate = cameraToUpdate;
    }

    override initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.scene = new ThreedUpdateSceneSettingsComponent(this.cameraToUpdate);
        this.scene.initialize(sceneManager);
    }

    onUpdateValues(values: any): void {
        if(!values) return;
        const settings: ThreedComplexOrbitWidgetSettings = values;
        if(!settings) return;

        this.scene.onUpdateValues(settings.threedSceneSettings);
        const raycasterComponent = this.sceneManager.getComponent(ThreedHightlightRaycasterComponent);
        raycasterComponent?.setHoveringColor(settings.hoverColor);
    }
}