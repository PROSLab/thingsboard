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

import { ElementRef } from "@angular/core";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import { OBJECT_ID_TAG } from "../../threed-constants";
import { IThreedSceneManager } from "./ithreed-scene-manager";
import { IThreedRenderer } from "./ithreed-renderer";

export interface CssData {
    divElement: HTMLDivElement;
    cssObject: CSS2DObject;
    layer: number;
}

export class ThreedCssManager implements IThreedRenderer {
    protected cssRenderer?: CSS2DRenderer;
    protected cssObjects: Map<string, CssData> = new Map();

    private readonly initialLabelLayerIndex = 5;
    private lastLayerIndex = this.initialLabelLayerIndex;

    constructor() {
        this.initialize();
    }

    private initialize() {
        this.initializeCssRenderer();
    }

    private initializeCssRenderer() {
        this.cssRenderer = new CSS2DRenderer();
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0px';
        this.cssRenderer.domElement.style.pointerEvents = 'none'
    }

    public attachToElement(rendererContainer: ElementRef) {
        rendererContainer.nativeElement.appendChild(this.cssRenderer.domElement);
        const rect = rendererContainer.nativeElement.getBoundingClientRect();
        this.cssRenderer.setSize(rect.width, rect.height);
    }

    public resize(width?: number, height?: number): void {
        this.cssRenderer?.setSize(width, height);
    }

    public tick(threedScene: IThreedSceneManager): void { 

    }

    public render(threedScene: IThreedSceneManager): void {
        this.cssRenderer.render(threedScene.scene, threedScene.camera);
    }

    public getRenderer() {
        return this.cssRenderer;
    }

    public createLabel(id: string): CssData {
        const layer = this.lastLayerIndex++;
        const divElement = document.createElement('div');
        divElement.className = 'label';
        divElement.textContent = 'initial content';
        divElement.style.marginTop = '-1em';
        const cssObject = new CSS2DObject(divElement);
        cssObject.layers.set(layer);
        cssObject.userData[OBJECT_ID_TAG] = id;

        const label = { divElement, cssObject, layer };
        this.cssObjects.set(id, label)
        return label;
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
        const divLabel = this.cssObjects.get(id).divElement;
        divLabel.innerHTML = content;
    }
}