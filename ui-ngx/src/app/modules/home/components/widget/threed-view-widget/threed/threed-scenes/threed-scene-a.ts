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
import { ThreedListenersComponent } from "../threed-components/threed-listeners-component";

export class ThreedSceneA {

    public static init(): ThreedGenericSceneManager {
        const builder = new ThreedSceneBuilder({ shadow: true })
            .add(new ThreedPerspectiveCameraComponent())
            .add(new ThreedDefaultAmbientComponent())
            .add(new ThreedOrbitControllerComponent())
            .add(new ThreedListenersComponent());
        //.add(new IntersectObserver());

        return builder.build();
    }
}