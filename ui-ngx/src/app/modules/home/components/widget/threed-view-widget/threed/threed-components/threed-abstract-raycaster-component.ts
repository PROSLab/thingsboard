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

import { ROOT_TAG } from "../../threed-constants";
import { ThreedUtils } from "../../threed-utils";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { IThreedListener } from "./ithreed-listener";
import { ThreedBaseComponent } from "./threed-base-component";
import * as THREE from 'three';

export abstract class ThreedAbstractRaycasterComponent extends ThreedBaseComponent implements IThreedListener {

    private raycastUpdate: 'click' | 'hover';
    private resolveRaycastObject: 'single' | 'root';
    private raycaster?: THREE.Raycaster;
    protected selectedObject: any;

    constructor(raycastUpdate: 'click' | 'hover' = 'click', resolveRaycastObject: 'single' | 'root' = 'root') {
        super();

        this.raycastUpdate = raycastUpdate;
        this.resolveRaycastObject = resolveRaycastObject;
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.raycaster = new THREE.Raycaster();
    }

    onKeyDown(event: KeyboardEvent): void { }
    onKeyUp(event: KeyboardEvent): void { }
    onMouseMove(event: MouseEvent): void {
        if (this.raycastUpdate == 'hover')
            this.updateRaycaster();
    }
    onMouseClick(event: MouseEvent): void {
        if (this.raycastUpdate == 'click')
            this.updateRaycaster();
    }

    private updateRaycaster() {
        if (!this.initialized || !this.canUpdateRaycaster()) return;

        this.raycaster.setFromCamera(this.getRaycasterOriginCoords(), this.sceneManager.camera);
        const intersection = this.raycaster.intersectObjects(this.getIntersectionObjects()).filter(o => this.getIntersectedObjectFilter(o));

        if (intersection.length > 0) {
            const intersectedObject = intersection[0].object;
            const obj = this.resolveRaycastObject == 'root' ? ThreedUtils.findParentByChild(intersectedObject, ROOT_TAG, true) : intersectedObject;
            if (obj) this.selectObject(obj);
            else this.selectObject(undefined);
        } else {
            // if hover tooltip => nothing
            // else deselectObject
            this.selectObject(undefined);
        }
    }

    private selectObject(object?: THREE.Object3D) {
        if (!object) {
            this.deselectObject();

        } else if (this.selectedObject != object) {
            this.deselectObject();
            this.selectedObject = object;
            this.onSelectObject(this.selectedObject);
        }
    }

    private deselectObject() {
        if (this.selectedObject) {
            this.onDeselectObject(this.selectedObject);
        }
        this.selectedObject = null;
    }

    
    protected canUpdateRaycaster(): boolean {
        return true;
    }

    protected getRaycasterOriginCoords(): {x:number, y: number} {
        return this.sceneManager.mouse;
    }

    protected getIntersectionObjects(): THREE.Object3D[] {
        return this.sceneManager.scene.children;
    }
    
    protected getIntersectedObjectFilter(o: THREE.Intersection) {
        return o.object.type != "TransformControlsPlane" &&
            o.object.type != "BoxHelper" &&
            o.object.type != "GridHelper" &&
            //@ts-ignore
            o.object.tag != "Helper"
    }

    protected abstract onSelectObject(object: any): void;
    protected abstract onDeselectObject(object: any): void;

}