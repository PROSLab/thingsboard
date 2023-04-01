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

export class ThreedRaycasterComponent extends ThreedBaseComponent implements IThreedListener {

    private highlightObjectType: 'click' | 'hover';
    private raycaster?: THREE.Raycaster;
    private selectedObject: any;
    private hoveringColor: {
        color: THREE.Color;
        alpha: number;
    };
    private hoveringMaterial: THREE.MeshStandardMaterial;

    constructor(highlightObjectType: 'click' | 'hover' = 'click') {
        super();
        this.highlightObjectType = highlightObjectType;
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.setHoveringColor();
        this.raycaster = new THREE.Raycaster();
    }

    onKeyDown(event: KeyboardEvent): void { }
    onKeyUp(event: KeyboardEvent): void { }
    onMouseMove(event: MouseEvent): void {
        if (this.highlightObjectType == 'hover')
            this.updateRaycaster();
    }
    onMouseClick(event: MouseEvent): void {
        if (this.highlightObjectType == 'click')
            this.updateRaycaster();
    }

    public setHoveringColor(hoveringColor: string = "rgba(0,0,255,0.5)") {
        if(!hoveringColor) return;

        console.log(hoveringColor);
        this.hoveringColor = ThreedUtils.getAlphaAndColorFromString(hoveringColor);
        this.hoveringMaterial = new THREE.MeshStandardMaterial({
            color: this.hoveringColor.color,
            opacity: this.hoveringColor.alpha,
            transparent: true,
            //wireframe: true,
        });

        console.log(this.hoveringColor, this.hoveringMaterial);

    }

    private updateRaycaster() {
        if (!this.initialized) return;

        this.raycaster.setFromCamera(this.sceneManager.mouse, this.sceneManager.camera);
        const intersection = this.raycaster.intersectObjects(this.sceneManager.scene.children).filter(o => {
            return o.object.type != "TransformControlsPlane" &&
                o.object.type != "BoxHelper" &&
                o.object.type != "GridHelper" &&
                //@ts-ignore
                o.object.tag != "Helper"
        });

        if (intersection.length > 0) {
            const intersectedObject = intersection[0].object;
            const root = ThreedUtils.findParentByChild(intersectedObject, ROOT_TAG, true);
            if (root) this.selectObject(root);
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

            // hide tooltip
        } else if (this.selectedObject != object) {
            this.deselectObject();
            this.selectedObject = object;
            this.toggleHightlightGLTF(this.selectedObject, true);

            // popup tooltip
        }
    }

    private deselectObject() {
        if (this.selectedObject) {
            this.toggleHightlightGLTF(this.selectedObject, false);
        }
        this.selectedObject = null;
    }

    private toggleHightlightGLTF(root: THREE.Group, enable: boolean) {
        root.traverse(o => {
            if (o instanceof THREE.Mesh) {
                if (enable) {
                    o.userData.currentMaterial = o.material;
                    o.material = this.hoveringMaterial;
                } else {
                    o.material = o.userData.currentMaterial;
                }
            }
        });
    }
}