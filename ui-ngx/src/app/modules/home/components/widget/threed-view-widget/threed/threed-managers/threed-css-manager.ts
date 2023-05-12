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
import { LAST_VISIBILITY, OBJECT_ID_TAG } from "../threed-constants";
import { IThreedSceneManager } from "./ithreed-scene-manager";
import * as THREE from 'three';
import { Subscription } from "rxjs";
import { VrUi } from "../threed-extensions/vr-ui";
import { ThreedWebRenderer } from "./threed-web-renderer";

export type CssObjectType = 'label' | 'image';

export interface CssData {
    id: number,
    htmlElement: HTMLElement,
    cssObject: CSS2DObject,
    type: CssObjectType,
    offsetY: number, //ranges between 0...1;

    vrMesh?: THREE.Group,
}

export interface CssObject {
    layer: number;
    data: CssData[];
}

export interface CssObjectProperties {
    type: CssObjectType,
    className?: string,
    offsetY: number, //ranges between 0...1;
    alwaysVisible?: boolean,
}

export class ThreedCssManager {

    private static lastCssObjectId = 1;

    public cssObjects: Map<string, CssObject> = new Map();
    private sceneManager: IThreedSceneManager;

    public readonly markersLayerIndex = 4;
    public readonly initialLabelLayerIndex = 5;
    private lastLayerIndex = this.initialLabelLayerIndex;
    private subscriptions: Subscription[] = [];

    private markersLayerEnabled = true;

    constructor(sceneManager: IThreedSceneManager) {
        this.sceneManager = sceneManager;

        const s = this.sceneManager.onMainCameraChange.subscribe(c => this.updateMarkersLayer());
        const s2 = this.sceneManager.onVRChange.subscribe(v => {
            this.updateObjectVisibility();
        });
        this.subscriptions.push(s);
        this.subscriptions.push(s2);
    }

    public toggleMarkersLayer(enabled?: boolean): void {
        this.markersLayerEnabled = enabled || !this.markersLayerEnabled;
        this.updateMarkersLayer();
    }

    private updateMarkersLayer(): void {
        if (!this.sceneManager.camera) return;

        if (this.markersLayerEnabled) this.sceneManager.camera.layers.enable(this.markersLayerIndex);
        else this.sceneManager.camera.layers.disable(this.markersLayerIndex);
    }

    public createObject(id: string, properties: CssObjectProperties): CssData {
        let htmlElement: HTMLElement;
        switch (properties.type) {
            case "label":
                htmlElement = this.createLabel(properties.className);
                break;
            case "image":
                htmlElement = this.createImage(properties.className);
                break;
        }

        if (!this.cssObjects.has(id))
            this.cssObjects.set(id, { layer: this.lastLayerIndex++, data: [] });

        const cssObject = this.cssObjects.get(id);

        const css2dObject = new CSS2DObject(htmlElement);
        css2dObject.layers.set(properties.alwaysVisible ? this.markersLayerIndex : cssObject.layer);
        css2dObject.userData[OBJECT_ID_TAG] = id;

        const offsetY = THREE.MathUtils.clamp(properties.offsetY, 0, 1);
        const model = this.sceneManager.modelManager.models.get(id);
        if (model) {
            // it places the label to the center of the model if it exists
            const position = new THREE.Vector3();
            const box = new THREE.Box3().setFromObject(model.root);
            box.getCenter(position);
            const size = new THREE.Vector3();
            box.getSize(size);

            position.y += (offsetY - 0.5) * size.y;

            css2dObject.position.copy(position);
        }

        const objectId = ThreedCssManager.lastCssObjectId++;
        const cssData: CssData = { htmlElement, cssObject: css2dObject, type: properties.type, id: objectId, offsetY };

        cssObject.data.push(cssData);

        this.sceneManager.scene.add(cssData.cssObject);

        return cssData;
    }

    onUpdateValues() {
        // recalculate the position of the css object according to the positions of the models!
        this.cssObjects.forEach((v, k) => {
            const model = this.sceneManager.modelManager.models.get(k);
            if (model) {
                // it places the label to the center of the model if it exists
                const position = new THREE.Vector3();
                const box = new THREE.Box3().setFromObject(model.root);
                box.getCenter(position);
                const size = new THREE.Vector3();
                box.getSize(size);

                const distance = Math.max(size.x, size.z) / 2 + 1;
                v.data.forEach(d => {
                    const p = new THREE.Vector3().copy(position);
                    p.y += (d.offsetY - 0.5) * size.y;
                    d.cssObject.position.copy(p);

                    if (d.vrMesh) {
                        d.vrMesh.children[0].position.set(0, 0, distance);
                    }
                });
            }
        });
    }

    public tick() {
        if (this.sceneManager.vrActive) {
            const xr = this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer().xr;
            const cameraPosition = xr.getCamera().position;

            this.cssObjects.forEach((v, k) => {
                v.data.forEach(e => {
                    if (e.vrMesh) {
                        e.vrMesh.lookAt(cameraPosition);
                    }
                })
            });
        }
    }

    private createLabel(className?: string): HTMLDivElement {
        const divElement = document.createElement('div');
        divElement.className = className || 'label';
        divElement.textContent = 'initial content';
        divElement.style.marginTop = '-1em';
        return divElement;
    }

    private createVRLabel(cssDataAndLayer: {
        data: CssData;
        layer: number;
        id: string;
    }, content: string) {
        const cssData = cssDataAndLayer.data;

        cssData.vrMesh?.remove();
        const panel = VrUi.createPanelFromHtml(content);
        panel.position.copy(cssData.cssObject.position);
        panel.layers.set(cssDataAndLayer.layer);
        panel.renderOrder = 10;
        const model = this.sceneManager.modelManager.models.get(cssDataAndLayer.id);
        if (model) {
            const box = new THREE.Box3().setFromObject(model.root);
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            box.getCenter(center);
            box.getSize(size);

            const distance = Math.max(size.x, size.z) / 2 + 1;
            panel.position.set(0, 0, distance);
        }
        const pivot = new THREE.Group();
        pivot.add(panel);
        pivot.position.copy(cssData.cssObject.position);
        pivot.visible = false;
        cssData.vrMesh = pivot
        this.sceneManager.scene.add(pivot);
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
        const cssDataAndLayer = this.findFirstElement(ids, 'label');
        const cssData = cssDataAndLayer?.data;
        if (!cssData) return;

        this.createVRLabel(cssDataAndLayer, content);

        const divLabel = cssData!.htmlElement;
        divLabel.innerHTML = content;
        return cssData;
    }

    public updateImage(ids: string[], content: { url: string, size: number }): CssData | undefined {
        const cssData = this.findFirstElement(ids, 'image')?.data
        if (!cssData) return;

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

    private updateObjectVisibility() {
        this.cssObjects.forEach((v: CssObject, k: string) => {
            v.data.forEach(e => {
                if (e.vrMesh) {
                    e.vrMesh.visible = this.sceneManager.vrActive ? e.vrMesh.userData[LAST_VISIBILITY] || false : false;
                }
                e.cssObject.visible = !this.sceneManager.vrActive;
            })
        })
    }

    private findFirst(ids: string[], type: CssObjectType): { mapId: string, arrayId: number, layer: number, id: string } | undefined {
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const cssObject = this.cssObjects.get(id);
            if (!cssObject) continue;
            else {
                for (let j = 0; j < cssObject.data.length; j++) {
                    const element = cssObject.data[j];
                    if (element.type == type) {
                        return { mapId: ids[i], arrayId: j, layer: cssObject.layer, id: id };
                    }
                }
            }
        }
        return undefined;
    }

    public findFirstElement(ids: string[], type: CssObjectType): { data: CssData, layer: number, id: string } | undefined {
        const id = this.findFirst(ids, type);
        if (!id) return;

        return { data: this.cssObjects.get(id.mapId).data[id.arrayId], layer: id.layer, id: id.id };
    }

    public findCssObject(...ids: string[]): CssObject | undefined {
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const cssObject = this.cssObjects.get(id);
            if (cssObject)
                return cssObject;
        }
        return undefined;
    }

    public onDestory() {
        this.subscriptions.forEach(s => s.unsubscribe());
    }
}