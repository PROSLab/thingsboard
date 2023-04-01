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
import { ThreedCameraSettings } from "../../../threed-models";
import { CAMERA_ID } from "../../../threed-constants";
import * as THREE from 'three';


export class ThreedUpdateCameraComponent extends ThreedBaseComponent implements IThreedUpdatable {

    private camera?: THREE.PerspectiveCamera;

    constructor(camera?: THREE.PerspectiveCamera) {
        super();
        this.camera = camera;
    }

    onUpdateValues(values: any): void {
        if (!values) return;
        const settings: ThreedCameraSettings = values;
        if (!settings) return;

        this.sceneManager.modelManager.updateModelTransforms(CAMERA_ID, { threedPositionVectorSettings: settings.initialPosition, threedRotationVectorSettings: settings.initialRotation });

        if (this.camera) {
            const position = settings.initialPosition;
            const rotation = settings.initialRotation;
            if (position) this.camera.position.set(position.x, position.y, position.z);
            if (rotation) this.camera.rotation.set(THREE.MathUtils.degToRad(rotation.x), THREE.MathUtils.degToRad(rotation.y), THREE.MathUtils.degToRad(rotation.z));

            if (this.camera) {
                this.camera.far = settings.far || this.camera.far;
                this.camera.near = settings.near || this.camera.near;
                this.camera.fov = settings.fov || this.camera.fov;
                this.camera.updateProjectionMatrix();
            }
        }
    }
}