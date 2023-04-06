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
import { OBJECT_ID_TAG } from "../threed-constants";
import { IThreedSceneManager } from "./ithreed-scene-manager";
import * as THREE from 'three';

export type CssObjectType = 'label' | 'image';

export interface CssData {
    htmlElement: HTMLElement;
    cssObject: CSS2DObject;
    layer: number;
    type: CssObjectType;
    id: number;
}

export class ThreedCssManager {

    private static lastCssObjectId = 1;

    // TODO: change in Map<string, {layer: number, data:CssData}>
    public cssObjects: Map<string, CssData[]> = new Map();
    private sceneManager: IThreedSceneManager;

    public readonly initialLabelLayerIndex = 5;
    private lastLayerIndex = this.initialLabelLayerIndex;


    constructor(sceneManager: IThreedSceneManager) {
        this.sceneManager = sceneManager;
    }

    public createObject(id: string, type: CssObjectType, className?: string): CssData {

        let htmlElement: HTMLElement;
        switch (type) {
            case "label":
                htmlElement = this.createLabel(className);
                break;
            case "image":
                htmlElement = this.createImage(className);
                break;
        }

        let layer: number;
        if (!this.cssObjects.has(id) || this.cssObjects.get(id).length == 0) {
            this.cssObjects.set(id, []);
            layer = this.lastLayerIndex++;
        } else layer = this.cssObjects.get(id)[0].layer;

        const cssObject = new CSS2DObject(htmlElement);
        cssObject.layers.set(layer);
        cssObject.userData[OBJECT_ID_TAG] = id;

        const model = this.sceneManager.modelManager.models.get(id);
        if (model) {
            // it places the label to the center of the model if it exists
            new THREE.Box3().setFromObject(model.root).getCenter(cssObject.position);
        }

        const objectId = ThreedCssManager.lastCssObjectId++;
        const cssData = { htmlElement, cssObject, layer, type, id: objectId };

        this.cssObjects.get(id).push(cssData);

        this.sceneManager.scene.add(cssData.cssObject);
        return cssData;
    }

    private createLabel(className?: string): HTMLDivElement {
        const divElement = document.createElement('div');
        divElement.className = className || 'label';
        divElement.textContent = 'initial content';
        divElement.style.marginTop = '-1em';
        return divElement;
    }

    private createImage(className?: string): HTMLImageElement {
        const imgElement = document.createElement('img');
        imgElement.className = className || '';
        imgElement.style.marginTop = '-1em';
        return imgElement;
    }

    /*
    public removeLabel(id: string): void {
        this.cssObjects.delete(id);
    }*/

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
    public updateLabel(ids: string[], content: string): CssData | undefined {
        const id = this.findFirst(ids, 'label');
        if (!id) return;

        const cssData = this.cssObjects.get(id.mapId)[id.arrayId];
        const divLabel = cssData!.htmlElement;
        divLabel.innerHTML = content;
        return cssData;
    }

    public updateImage(ids: string[], content: { url: string, size: number }): CssData | undefined {
        const id = this.findFirst(ids, 'image');
        if (!id) return;

        const cssData = this.cssObjects.get(id.mapId)[id.arrayId];
        const image = cssData!.htmlElement as HTMLImageElement;
        image.src = content.url;
        image.width = content.size || 34;
        image.height = content.size || 34;
        /*
        image.style.backgroundImage = `url(${content.url})`;
        image.style.width = `width: ${content.size || 34}px;`;
        image.style.height = `height: ${content.size || 34}px;`;
        */
        return cssData;
    }

    private findFirst(ids: string[], type: CssObjectType): { mapId: string, arrayId: number } | undefined {
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const cssDatas = this.cssObjects.get(id);
            if (!cssDatas) continue;
            else {
                for (let j = 0; j < cssDatas.length; j++) {
                    const element = cssDatas[j];
                    if (element.type == type) {
                        return { mapId: ids[i], arrayId: j };
                    }
                }
            }
        }
        return undefined;
    }

    public findFirstElement(ids: string[], type: CssObjectType): CssData | undefined {
        const id = this.findFirst(ids, type);
        if (!id) return;

        return this.cssObjects.get(id.mapId)[id.arrayId];
    }

    public findElements(...ids: string[]): CssData[] {
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const cssDatas = this.cssObjects.get(id);
            if (cssDatas)
                return cssDatas;
        }
        return [];
    }

    public onDestory() { }
}