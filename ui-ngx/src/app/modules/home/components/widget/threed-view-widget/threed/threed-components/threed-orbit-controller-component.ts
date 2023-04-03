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

import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ThreedBaseComponent } from "./threed-base-component";
import { IThreedOrbitController } from "./ithreed-orbit-controller";

export class ThreedOrbitControllerComponent extends ThreedBaseComponent implements IThreedOrbitController {

    private orbit?: OrbitControls;

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.orbit = new OrbitControls(sceneManager.camera, sceneManager.getRenderer().domElement);
        this.orbit.update();
    }

    tick(): void { 
        this.orbit.update();
    }

    getOrbitController(): OrbitControls {
        return this.orbit;
    }
}