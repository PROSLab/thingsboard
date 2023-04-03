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
import * as THREE from 'three';
import { ThreedHightlightRaycasterComponent } from "./threed-hightlight-raycaster-component";
import { OBJECT_ID_TAG, ROOT_TAG } from "../../threed-constants";
import { id } from "date-fns/locale";

export class ThreedHightlightTooltipRaycasterComponent extends ThreedHightlightRaycasterComponent {

    constructor(raycastUpdate: 'click' | 'hover' = 'click', resolveRaycastObject: 'single' | 'root' = 'single', raycastOrigin?: THREE.Vector2) {
        super(raycastUpdate, resolveRaycastObject, raycastOrigin);
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
        console.log(this.sceneManager.cssManager.cssObjects.values());
        console.log(object);

        const root = ThreedUtils.findParentByChild(object, ROOT_TAG, true);
        const customId = root.userData[OBJECT_ID_TAG];

        if(customId){
            const label = this.sceneManager.cssManager.cssObjects.get(customId);
            if(!label) return;
            this.sceneManager.camera!.layers.enable(label.layer);
            object.userData.layer = label.layer;
        }
    }

    private disableTooltip(object: THREE.Group) {
        if(object){
            const layer = object.userData.layer;
            if (layer >= this.sceneManager.cssManager.initialLabelLayerIndex)
                this.sceneManager.camera!.layers.disable(layer);
        }
    }
}