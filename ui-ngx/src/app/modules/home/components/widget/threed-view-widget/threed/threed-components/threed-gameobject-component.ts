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
import { IThreedMesh } from "./ithreed-mesh";
import { ThreedBaseComponent } from "./threed-base-component";

export class ThreedGameObjectComponent extends ThreedBaseComponent implements IThreedMesh {
    
    private mesh: THREE.Object3D;

    constructor(mesh: THREE.Object3D) {
        super();
        this.mesh = mesh;
    }
    
    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.sceneManager.scene.add(this.mesh);
    }

    getMesh(): THREE.Object3D {
        return this.mesh;
    }    
}