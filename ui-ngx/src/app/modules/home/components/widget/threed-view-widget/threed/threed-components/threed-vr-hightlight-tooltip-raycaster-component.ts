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
import { A_TAG, LAST_VISIBILITY, VR_MESHES } from '../threed-constants';
import { IThreedSceneManager } from '../threed-managers/ithreed-scene-manager';
import { ThreedWebRenderer } from '../threed-managers/threed-web-renderer';
import { ThreedHightlightTooltipRaycasterComponent } from './threed-hightlight-tooltip-raycaster-component';
import { ThreedVrControllerComponent } from './threed-vr-controller-component';
import { CssObject } from '../threed-managers/threed-css-manager';

export class ThreedVrHightlightTooltipRaycasterComponent extends ThreedHightlightTooltipRaycasterComponent {

    private vrController: ThreedVrControllerComponent;
    private updateCounterIndex = 0;

    constructor(raycastUpdate: 'click' | 'hover' = 'click', resolveRaycastObject: 'single' | 'root' = 'single', raycastOrigin?: THREE.Vector2) {
        super(raycastUpdate, resolveRaycastObject, raycastOrigin);
    }

    public initialize(sceneManager: IThreedSceneManager) {
        super.initialize(sceneManager)

        this.vrController = this.sceneManager.getComponent(ThreedVrControllerComponent);

        this.subscriptions.push(this.vrController.onSelectStartEvent.subscribe(_ => this.onVrSelectPressed()));
        this.subscriptions.push(this.sceneManager.onVRChange.subscribe(_ => this.onVrChanged()))
    }

    private onVrChanged() {
        this.deselectObject();
    }

    private onVrSelectPressed() {
        if (this.raycastUpdate == "click") {
            this.updateRaycaster();
        }

        this.checkClick(this.selectedObject)
    }

    public tick() {
        super.tick();

        if (!this.sceneManager.vrActive || this.updateCounterIndex++ % 2 == 0 || this.raycastUpdate == 'click') return;

        this.updateRaycaster();
    }

    private checkClick(object: THREE.Group) {
        if (!object) return;

        const a = object.userData[A_TAG];
        this.vrController.canMove = !a;
        if (a) {
            document.body.appendChild(a);
            this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer().xr.getSession().end();
            a.dispatchEvent(new PointerEvent('pointerdown'));
            a.remove();
        }
    }

    protected setRaycaster() {

        if (!this.sceneManager.vrActive) {
            super.setRaycaster();
            return;
        }
        const line = this.vrController.line;
        if (!line) return;

        // @ts-ignore
        let startPoint = line.geometry.attributes.position.array.slice(0, 3);
        // @ts-ignore
        let endPoint = line.geometry.attributes.position.array.slice(3, 6);
        const direction = new THREE.Vector3().subVectors(
            new THREE.Vector3().fromArray(endPoint),
            new THREE.Vector3().fromArray(startPoint)
        );

        const tempMatrix = new THREE.Matrix4()
        tempMatrix.identity().extractRotation(this.vrController.controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(this.vrController.controller.matrixWorld);
        this.raycaster.ray.direction.set(direction.x, direction.y, direction.z).applyMatrix4(tempMatrix);
    }

    protected onEnableTooltip(object: THREE.Group, cssObject: CssObject): void {
        if (this.sceneManager.vrActive) {
            const vrMeshes = [];
            cssObject.data.forEach(d => {
                if (d.vrMesh) {
                    d.vrMesh.visible = true;
                    d.vrMesh.userData[LAST_VISIBILITY] = true;
                    vrMeshes.push(d.vrMesh);
                }
            })
            object.userData[VR_MESHES] = vrMeshes;
            
        } else {
            super.onEnableTooltip(object, cssObject);
        }
    }

    protected onDisableTooltip(object: THREE.Group): void {
        if (this.sceneManager.vrActive) {
            object.userData[VR_MESHES]?.forEach(m => {
                m.visible = false
                m.userData[LAST_VISIBILITY] = false;
            });
            object.userData[VR_MESHES] = undefined;

        } else {
            super.onDisableTooltip(object);
        }
    }

    /*
    protected getCamera(): THREE.Camera {
        if (this.sceneManager.vrActive)
            return this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer().xr.getCamera();
        return super.getCamera();
    }*/
}