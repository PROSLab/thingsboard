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

import * as THREE from 'three';
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { IThreedMesh } from "./ithreed-mesh";
import { ThreedBaseComponent } from "./threed-base-component";
import { ThreedUtils } from '../threed-utils';

export class ThreedGameObjectComponent extends ThreedBaseComponent implements IThreedMesh {

    protected gltf: GLTF;
    protected clonedGLTF: { animations: THREE.AnimationClip[], scene: THREE.Group };
    protected mesh: THREE.Object3D;
    private addToScene: boolean;

    constructor(mesh: THREE.Object3D | GLTF, addToScene: boolean = true) {
        super();
        if (mesh instanceof THREE.Object3D) {
            this.mesh = mesh;
        } else {
            this.gltf = mesh;
            this.clonedGLTF = ThreedUtils.cloneGltf(mesh);
        }
        this.addToScene = addToScene;
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        if (this.addToScene) {
            if (!this.mesh) {
                this.mesh = this.clonedGLTF.scene;
            }
            this.sceneManager.scene.add(this.mesh);
        }
    }

    getMesh(): THREE.Object3D {
        return this.mesh;
    }
}