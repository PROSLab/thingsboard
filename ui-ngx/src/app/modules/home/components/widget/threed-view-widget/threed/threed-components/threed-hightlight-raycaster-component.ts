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

import { ThreedUtils } from "../../threed-utils";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedAbstractRaycasterComponent } from "./threed-abstract-raycaster-component";
import * as THREE from 'three';

export class ThreedHightlightRaycasterComponent extends ThreedAbstractRaycasterComponent {

    private hoveringColor: {
        color: THREE.Color;
        alpha: number;
    };
    private hoveringMaterial: THREE.MeshStandardMaterial;
    private raycastOrigin?: THREE.Vector2;

    constructor(raycastUpdate: 'click' | 'hover' = 'click', resolveRaycastObject: 'single' | 'root' = 'single', raycastOrigin?: THREE.Vector2) {
        super(raycastUpdate, resolveRaycastObject);

        this.raycastOrigin = raycastOrigin;
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.setHoveringColor();
    }

    public setHoveringColor(hoveringColor: string = "rgba(0,0,255,0.5)") {
        if(!hoveringColor) return;

        this.hoveringColor = ThreedUtils.getAlphaAndColorFromString(hoveringColor);
        this.hoveringMaterial = new THREE.MeshStandardMaterial({
            color: this.hoveringColor.color,
            opacity: this.hoveringColor.alpha,
            transparent: true,
            //wireframe: true,
        });
    }

    protected getRaycasterOriginCoords(): { x: number; y: number; } {
        return this.raycastOrigin || super.getRaycasterOriginCoords();
    }

    protected onSelectObject(object: any): void {
        this.toggleHightlightGLTF(object, true);
    }

    protected onDeselectObject(object: any): void {
        this.toggleHightlightGLTF(object, false);
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