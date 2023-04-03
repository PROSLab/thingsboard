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

import { ThreedSceneBuilder } from "./threed-scene-builder";
import { ThreedDefaultAmbientComponent } from "../threed-components/threed-default-ambient-component";
import { ThreedOrbitControllerComponent } from "../threed-components/threed-orbit-controller-component";
import { ThreedPerspectiveCameraComponent } from "../threed-components/threed-perspective-camera-component";
import { ThreedGenericSceneManager } from "../threed-managers/threed-generic-scene-manager";
import { ThreedUpdateViewSettingsComponent } from "../threed-components/updatable/threed-update-view-settings-component";
import { ThreedHightlightRaycasterComponent } from "../threed-components/threed-hightlight-raycaster-component";
import { ThreedFirstPersonControllerComponent } from "../threed-components/threed-first-person-controller-component";
import { ThreedUpdateSceneSettingsComponent } from "../threed-components/updatable/threed-update-scene-settings-component";
import { ThreedTransformControllerComponent } from "../threed-components/threed-transform-controller-component";
import { ThreedTransformRaycasterComponent } from "../threed-components/threed-transform-raycaster-component";
import { ThreedCameraPreviewComponent } from "../threed-components/threed-camera-preview-component";
import { CAMERA_ID, OBJECT_ID_TAG } from "../../threed-constants";
import * as THREE from 'three';
import { ThreedHightlightTooltipRaycasterComponent } from "../threed-components/threed-hightlight-tooltip-raycaster-component";

export class ThreedScenes {

    //* INFO: Simple Orbit scene 
    public static createSimpleOrbitScene(): ThreedGenericSceneManager {
        const builder = new ThreedSceneBuilder({ shadow: true })
            .add(new ThreedPerspectiveCameraComponent())
            .add(new ThreedDefaultAmbientComponent(false))
            .add(new ThreedOrbitControllerComponent())
            .add(new ThreedUpdateViewSettingsComponent());

        return builder.build();
    }

    //* INFO: Complex Orbit scene 
    public static createComplexOrbitScene(): ThreedGenericSceneManager {
        const builder = new ThreedSceneBuilder({ shadow: true })
            .add(new ThreedPerspectiveCameraComponent())
            .add(new ThreedDefaultAmbientComponent(false))
            .add(new ThreedOrbitControllerComponent())
            .add(new ThreedUpdateViewSettingsComponent())
            .add(new ThreedHightlightRaycasterComponent('click', 'root'));

        return builder.build();
    }

    //* INFO: Navigation scene 
    public static createNavigationScene(): ThreedGenericSceneManager {
        const cameraComponent = new ThreedPerspectiveCameraComponent();

        const builder = new ThreedSceneBuilder({ vr: true })
            .add(cameraComponent)
            .add(new ThreedDefaultAmbientComponent(true))
            .add(new ThreedFirstPersonControllerComponent())
            .add(new ThreedUpdateViewSettingsComponent(cameraComponent))
            .add(new ThreedHightlightTooltipRaycasterComponent('hover', 'single', new THREE.Vector2()));

        return builder.build();
    }

    //* INFO: Editor scene for FPS
    public static createEditorSceneWithCameraDebug(): ThreedGenericSceneManager {
        const transformControllercomponent = new ThreedTransformControllerComponent(true);
        const cameraPreviewComponent = new ThreedCameraPreviewComponent();
        const builder = new ThreedSceneBuilder({ shadow: false })
            .add(new ThreedPerspectiveCameraComponent())
            .add(new ThreedDefaultAmbientComponent(true))
            .add(new ThreedOrbitControllerComponent())
            .add(transformControllercomponent)
            .add(new ThreedTransformRaycasterComponent('click', transformControllercomponent))
            .add(cameraPreviewComponent)
            .add(new ThreedUpdateSceneSettingsComponent(cameraPreviewComponent));

        transformControllercomponent.onChangeAttachTransformController.subscribe(model => {
            cameraPreviewComponent.enabled = model ? model.userData[OBJECT_ID_TAG] == CAMERA_ID : false;
        })

        return builder.build();
    }


    //* INFO: Editor scene for Complex Orbit
    public static createEditorSceneWithoutCameraDebug(): ThreedGenericSceneManager {
        const transformControllercomponent = new ThreedTransformControllerComponent(true);
        const builder = new ThreedSceneBuilder({ shadow: false })
            .add(new ThreedPerspectiveCameraComponent())
            .add(new ThreedDefaultAmbientComponent(true))
            .add(new ThreedOrbitControllerComponent())
            .add(transformControllercomponent)
            .add(new ThreedTransformRaycasterComponent('click', transformControllercomponent))
            .add(new ThreedUpdateSceneSettingsComponent());

        return builder.build();
    }
}