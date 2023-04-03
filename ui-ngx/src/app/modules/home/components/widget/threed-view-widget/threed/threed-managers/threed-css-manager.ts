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

import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { OBJECT_ID_TAG } from "../../threed-constants";
import { IThreedSceneManager } from "./ithreed-scene-manager";
import * as THREE from 'three';

export interface CssData {
    divElement: HTMLDivElement;
    cssObject: CSS2DObject;
    layer: number;
}

export class ThreedCssManager {

    public cssObjects: Map<string, CssData> = new Map();
    private sceneManager: IThreedSceneManager;

    public readonly initialLabelLayerIndex = 5;
    private lastLayerIndex = this.initialLabelLayerIndex;



    constructor(sceneManager: IThreedSceneManager) {
        this.sceneManager = sceneManager;
    }

    public createLabel(id: string, className?: string): CssData {
        const layer = this.lastLayerIndex++;
        const divElement = document.createElement('div');
        divElement.className = className || 'label';
        divElement.textContent = 'initial content';
        divElement.style.marginTop = '-1em';
        const cssObject = new CSS2DObject(divElement);
        cssObject.layers.set(layer);
        cssObject.userData[OBJECT_ID_TAG] = id;

        const model = this.sceneManager.modelManager.models.get(id);
        if (model) {
            // it places the label to the center of the model if it exists
            new THREE.Box3().setFromObject(model.root).getCenter(cssObject.position);
        }

        const label = { divElement, cssObject, layer };
        this.cssObjects.set(id, label)

        this.sceneManager.scene.add(label.cssObject);
        return label;
    }

    public removeLabel(id: string): void {
        this.cssObjects.delete(id);
    }

    /**
     * It updates the first label finded with the specific id.
     * Example: if we call updateLabelContent(['id1', 'id2'], "some html"), 
     * it will check first for a label with id 'id1' and if it does not exist, 
     * it tries to find a label with id 'id2'. If the label exists, 
     * it will be updated otherwise nothing happens.
     * 
     * @param ids the list of id to search
     * @param content the new content
     * @returns 
     */
    public updateLabelContent(ids: string[], content: string) {
        let index = -1;
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            if (!this.cssObjects.has(id)) continue;
            else {
                index = i;
                break;
            }
        }

        if (index == -1) return;

        const id = ids[index];
        const divLabel = this.cssObjects.get(id)!.divElement;
        divLabel.innerHTML = content;
    }
}