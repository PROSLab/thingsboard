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
import { IThreedPerspectiveCamera } from "../ithreed-perspective-camera";


export class ThreedUpdateCameraComponent extends ThreedBaseComponent implements IThreedUpdatable {

    private threedCamera?: IThreedPerspectiveCamera;

    constructor(threedCamera?: IThreedPerspectiveCamera) {
        super();
        this.threedCamera = threedCamera;
    }

    onUpdateValues(values: any): void {
        if (!values) return;
        const settings: ThreedCameraSettings = values;
        if (!settings) return;

        this.sceneManager.modelManager.updateModelTransforms(CAMERA_ID, { threedPositionVectorSettings: settings.initialPosition, threedRotationVectorSettings: settings.initialRotation });

        if (this.threedCamera) {
            const camera = this.threedCamera.getPerspectiveCamera();

            const position = settings.initialPosition;
            const rotation = settings.initialRotation;
            if (position) camera.position.set(position.x, position.y, position.z);
            if (rotation) camera.rotation.set(THREE.MathUtils.degToRad(rotation.x), THREE.MathUtils.degToRad(rotation.y), THREE.MathUtils.degToRad(rotation.z));

            camera.far = settings.far || camera.far;
            camera.near = settings.near || camera.near;
            camera.fov = settings.fov || camera.fov;
            camera.updateProjectionMatrix();
        }
    }
}