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
import { ThreedBaseComponent } from './threed-base-component';
import { IThreedListener } from './ithreed-listener';
import { EventEmitter } from '@angular/core';

export class ThreedMoveToPositionComponent extends ThreedBaseComponent implements IThreedListener {

    public onPointSelected = new EventEmitter<THREE.Vector3>();

    onKeyDown(event: KeyboardEvent): void { }
    onKeyUp(event: KeyboardEvent): void { }
    onMouseMove(event: MouseEvent): void { }
    onMouseClick(event: MouseEvent): void {
        // Calculate the mouse position in normalized device coordinates (NDC)
        const mouse = this.sceneManager.mouse;

        // Create a ray from the camera through the mouse position
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.sceneManager.camera);

        // Find the intersection between the ray and the scene
        const intersects = raycaster.intersectObjects(this.sceneManager.scene.children, true);

        // If there's an intersection, return the point in world coordinates
        if (intersects.length > 0) {
            this.onPointSelected.emit(intersects[0].point);
        }
    }
}