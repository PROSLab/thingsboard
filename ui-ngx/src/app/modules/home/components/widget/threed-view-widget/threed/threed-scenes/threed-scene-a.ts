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
import { ThreedRaycasterComponent } from "../threed-components/threed-raycaster-component";
import { ThreedFirstPersonControllerComponent } from "../threed-components/threed-first-person-controller-component";

export class ThreedSceneA {

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
            .add(new ThreedRaycasterComponent('click'));

        return builder.build();
    }

    //* INFO: Navigation scene 
    public static createNavigationScene(): ThreedGenericSceneManager {
        const builder = new ThreedSceneBuilder({ shadow: true })
            .add(new ThreedPerspectiveCameraComponent())
            .add(new ThreedDefaultAmbientComponent(true))
            .add(new ThreedFirstPersonControllerComponent())
            .add(new ThreedUpdateViewSettingsComponent())
            .add(new ThreedRaycasterComponent('hover'));

        return builder.build();
    }
}