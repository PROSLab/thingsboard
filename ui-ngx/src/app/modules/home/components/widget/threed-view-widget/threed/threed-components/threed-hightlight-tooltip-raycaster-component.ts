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
import { OBJECT_ID_TAG, ROOT_TAG } from "../threed-constants";
import { ThreedUtils } from "../threed-utils";
import { ThreedHightlightRaycasterComponent } from "./threed-hightlight-raycaster-component";
import { CSS2DRaycaster } from '../threed-extensions/css2d-raycaster';
import { IThreedSceneManager } from '../threed-managers/ithreed-scene-manager';

export class ThreedHightlightTooltipRaycasterComponent extends ThreedHightlightRaycasterComponent {

    private cssRaycaster: CSS2DRaycaster;

    constructor(raycastUpdate: 'click' | 'hover' = 'click', resolveRaycastObject: 'single' | 'root' = 'single', raycastOrigin?: THREE.Vector2) {
        super(raycastUpdate, resolveRaycastObject, raycastOrigin);
    }

    public initialize(sceneManager: IThreedSceneManager) {
        super.initialize(sceneManager)

        this.cssRaycaster = new CSS2DRaycaster(this.sceneManager);
    }

    protected updateRaycaster(): boolean {
        if (!super.updateRaycaster()) return false;

        const intersects = this.cssRaycaster.intersectObjects(this.sceneManager.scene.children, "a");
        // Trigger click event on <a> element
        if (intersects.length > 0) {
            intersects[0].dispatchEvent(new PointerEvent('pointerdown'));
        }
        return true;
    }

    protected onSelectObject(object: any): void {
        super.onSelectObject(object);

        this.enableTooltip(object);
    }

    protected onDeselectObject(object: any): void {
        super.onDeselectObject(object);

        this.disableTooltip(object);
    }

    private enableTooltip(object: THREE.Group) {
        const root = ThreedUtils.findParentByChild(object, ROOT_TAG, true);
        const customId = root.userData[OBJECT_ID_TAG];

        if (customId) {
            const cssObject = this.sceneManager.cssManager.findCssObject(customId);
            if (!cssObject) return;
            const layer = cssObject.layer;
            this.sceneManager.camera!.layers.enable(layer);
            this.sceneManager.cssManager.toggleMarkersLayer(false);
            object.userData.layer = layer;
        }
    }

    private disableTooltip(object: THREE.Group) {
        if (object) {
            const layer = object.userData.layer;
            this.sceneManager.cssManager.toggleMarkersLayer(true);

            if (layer >= this.sceneManager.cssManager.initialLabelLayerIndex)
                this.sceneManager.camera!.layers.disable(layer);
        }
    }
}