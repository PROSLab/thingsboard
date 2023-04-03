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
import * as THREE from 'three';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { ThreedTransformControllerComponent } from "./threed-transform-controller-component";


export class ThreedOrbitControllerComponent extends ThreedBaseComponent implements IThreedOrbitController {

    private orbit?: OrbitControls;
    private focusingOnObject = false;

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

    public focusOnObject(object?: THREE.Object3D, millis: number = 0) {
        if (this.focusingOnObject) return;

        //this.raycastEnabledLastFrame = false;
        const transformComponent = this.sceneManager.getComponent(ThreedTransformControllerComponent);
        object = object || transformComponent?.getSelectedObject();

        if (millis > 0) {
            this.focusingOnObject = true;
            const duration = 300; // Duration of animation in milliseconds
            const initialPosition = this.orbit.target || new THREE.Vector3(0, 0, 0); // Start value of variable
            const finalPosition = object?.position || new THREE.Vector3(0, 0, 0); // End value of variable
            let currentPosition = new THREE.Vector3();

            new TWEEN.Tween({ value: 0 })
                .to({ value: 1 }, duration)
                .onUpdate((update: { value: number }) => {
                    currentPosition.lerpVectors(initialPosition, finalPosition, update.value);
                    this.updateOrbitTarget(currentPosition);
                })
                .onComplete(() => {
                    this.focusingOnObject = false;
                })
                .start();
        } else {
            this.updateOrbitTarget(object?.position);
        }
    }

    private updateOrbitTarget(position?: THREE.Vector3) {
        position = position || new THREE.Vector3(0, 0, 0);
        this.orbit.target.copy(position);
        this.orbit.update();
    }
}