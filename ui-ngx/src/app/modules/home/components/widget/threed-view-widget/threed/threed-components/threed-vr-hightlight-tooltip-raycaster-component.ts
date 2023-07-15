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
import { A_TAG, LAST_VISIBILITY, VR_IMAGE, VR_MESHES } from '../threed-constants';
import { IThreedSceneManager } from '../threed-managers/ithreed-scene-manager';
import { ThreedWebRenderer } from '../threed-managers/threed-web-renderer';
import { ThreedHightlightTooltipRaycasterComponent } from './threed-hightlight-tooltip-raycaster-component';
import { ThreedVrControllerComponent } from './threed-vr-controller-component';
import { CssData, CssObject } from '../threed-managers/threed-css-manager';

export class ThreedVrHightlightTooltipRaycasterComponent extends ThreedHightlightTooltipRaycasterComponent {

    private vrController: ThreedVrControllerComponent;
    private updateCounterIndex = 0;

    private highlightedMaterial = new THREE.MeshStandardMaterial({
        color: 0x0000ff,
        opacity: 0.5,
        transparent: true,
        wireframe: true,
    });
    private lastHighlightedObject?: THREE.Object3D;
    private highlightObjects = false;
    private lastUpdateRaycaster = -1;


    constructor(raycastUpdate: 'click' | 'hover' = 'click', resolveRaycastObject: 'single' | 'root' = 'single', raycastOrigin?: THREE.Vector2) {
        super(raycastUpdate, resolveRaycastObject, raycastOrigin);
    }

    public initialize(sceneManager: IThreedSceneManager) {
        super.initialize(sceneManager)

        this.vrController = this.sceneManager.getComponent(ThreedVrControllerComponent);
        this.vrController.setGripText("Toggle Highlight Mode: Grip<br>");

        this.subscriptions.push(this.vrController.onGripPressed.subscribe(_ => this.onGripPressed()));
        this.subscriptions.push(this.vrController.onSelectStartEvent.subscribe(_ => this.onVrSelectPressed()));
        this.subscriptions.push(this.sceneManager.onVRChange.subscribe(_ => this.onVrChanged()));
    }

    private onVrChanged() {
        this.deselectObject();
    }

    private onVrSelectPressed() {
        if (this.raycastUpdate == "click") {
            this.updateRaycaster();
        }

        this.checkClick(this.intersectedObjects?.[0]?.object)
    }

    private onGripPressed() {
        this.highlightObjects = !this.highlightObjects;
        this.sceneManager.cssManager.createOrUpdateVRText(`Highlight Mode ${this.highlightObjects ? 'Enabled' : 'Disabled'}`, new THREE.Vector3(0, .5, -1), false, "#f00", 0.1, "highlight-mode-text-uuid", 3);
        if (!this.highlightObjects) {
            if (this.lastHighlightedObject) this.toggleHightlightGLTF(this.lastHighlightedObject, false);
            this.lastHighlightedObject = undefined;
        }
    }

    public tick() {
        super.tick();

        if (!this.sceneManager.vrActive || this.updateCounterIndex++ % 2 == 0) return;

        if (this.raycastUpdate == 'hover')
            this.updateRaycaster();

        if (this.highlightObjects && this.updateCounterIndex % 4 == 0)
            this.highlightIntersectingObject();
    }


    private highlightIntersectingObject() {

        // UPDATE RAYCASTER
        this.setRaycaster();

        // GET THE FIRST OBJECT AND HIGHTLIGHT
        const objs = this.raycaster.intersectObjects(this.getIntersectionObjects());
        const intersection = this.intersectedObjects = objs.filter(o => this.getIntersectedObjectFilter(o));

        if (intersection.length > 0) {
            const intersectedObject = intersection[0].object;

            if (this.lastHighlightedObject != intersectedObject) {
                if (intersectedObject) this.toggleHightlightGLTF(intersectedObject, true, this.highlightedMaterial);
                if (this.lastHighlightedObject) this.toggleHightlightGLTF(this.lastHighlightedObject, false);
            }
            this.lastHighlightedObject = intersectedObject;
        } else {
            if (this.lastHighlightedObject) this.toggleHightlightGLTF(this.lastHighlightedObject, false);
        }
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

        if (this.lastUpdateRaycaster == this.updateCounterIndex) return;

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

        this.lastUpdateRaycaster = this.updateCounterIndex;
    }

    protected canSelectObject(object: any): boolean {
        if (this.sceneManager.vrActive) {
            const cssObject = super.getTooltip(object);
            let hasVrTooltip = false;
            cssObject?.data.forEach(d => {
                if (d.type == "label" && d.vrMesh) {
                    hasVrTooltip = true;
                    return;
                }
            });
            return hasVrTooltip;
        }
        return super.canSelectObject(object);
    }

    protected onEnableTooltip(object: THREE.Group, cssObject: CssObject): void {
        if (this.sceneManager.vrActive) {
            const vrMeshes = [];
            cssObject.data.forEach(d => {
                if (d.vrMesh) {
                    d.vrMesh.visible = d.type == "label";
                    d.vrMesh.userData[LAST_VISIBILITY] = d.type == "label";
                    vrMeshes.push(d);
                }
            })
            object.userData[VR_MESHES] = vrMeshes;

        } else {
            super.onEnableTooltip(object, cssObject);
        }
    }

    protected onDisableTooltip(object: THREE.Group): void {
        if (this.sceneManager.vrActive) {
            object.userData[VR_MESHES]?.forEach((m: CssData) => {
                m.vrMesh.visible = m.type == "image";
                m.vrMesh.userData[LAST_VISIBILITY] = m.type == "image";
            });
            object.userData[VR_MESHES] = undefined;

        } else {
            super.onDisableTooltip(object);
        }
    }

    protected getIntersectedObjectFilter(o: THREE.Intersection) {
        return super.getIntersectedObjectFilter(o) && o.object.name != "controller" && o.object.userData[VR_IMAGE] != true;
    }
    /*
    protected getCamera(): THREE.Camera {
        if (this.sceneManager.vrActive)
            return this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer().xr.getCamera();
        return super.getCamera();
    }*/
}