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
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import { ThreedFpsScene } from "@home/components/widget/threed-view-widget/threed-fps-scene";
import * as THREE from 'three';
import { ThreedViewWidgetSettings } from "@home/components/widget/threed-view-widget/threed-models";
import { OBJECT_ID_TAG } from "@home/components/widget/threed-view-widget/threed-constants";

interface Label {
    divElement: HTMLDivElement;
    cssObject: CSS2DObject;
    layer: number;
}

export class ThreedNavigateScene extends ThreedFpsScene<ThreedViewWidgetSettings, any> {

    private labelRenderer?: CSS2DRenderer;
    private INTERSECTED?: any;
    private pointerRaycaster = new THREE.Raycaster();

    private labels: Map<string, Label>;
    private hoveringColor = { color: new THREE.Color("00ff00"), alpha: 1 };
    private hoveringMaterial: THREE.MeshStandardMaterial;

    private readonly initialLabelLayerIndex = 5;
    private lastLayerIndex = this.initialLabelLayerIndex;

    protected override initialize(canvas?: ElementRef): void {
        super.initialize(canvas);

        this.initializeLabelRenderer();
        this.initializeLabels();

        this.camera?.layers.enableAll();
    }

    private initializeLabelRenderer() {
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
    }

    private initializeLabels() {
        this.labels = new Map();
    }

    private createLabel(id: string): Label {
        const layer = this.lastLayerIndex++;
        const divElement = document.createElement('div');
        divElement.className = 'label';
        divElement.textContent = 'initial content';
        divElement.style.marginTop = '-1em';
        const cssObject = new CSS2DObject(divElement);
        cssObject.layers.set(layer);
        cssObject.userData[OBJECT_ID_TAG] = id;

        const label = { divElement, cssObject, layer };
        this.labels.set(id, label)
        return label;
    }

    public override attachToElement(rendererContainer: ElementRef<any>): void {
        super.attachToElement(rendererContainer);

        rendererContainer.nativeElement.appendChild(this.labelRenderer.domElement);
        const rect = rendererContainer.nativeElement.getBoundingClientRect();
        this.labelRenderer.setSize(rect.width, rect.height);
    }

    public addModel(model: GLTF, id?: string, tooltip: boolean = false): Label | undefined {
        super.addModel(model, id);

        if (tooltip) {
            const customId = model.scene.userData[OBJECT_ID_TAG];
            const currentModel = this.models.get(customId);
            const label = this.createLabel(customId);
            this.camera!.layers.disable(label.layer);

            /*const box = new THREE.Box3().setFromObject(model.scene);
            const center = box.getCenter(new THREE.Vector3());
            label.position.set(0, center.y, 0);*/

            label.cssObject.position.set(0, 0, 0);
            currentModel.scene.add(label.cssObject);

            return label;
        }
    }

    public override resize(width?: number, height?: number): void {
        super.resize(width, height);

        this.labelRenderer.setSize(width, height);
    }

    public override render(): void {
        super.render();

        this.labelRenderer?.render(this.scene!, this.camera!);
    }

    protected override onSettingValues() {
        this.setEnvironmentValues(this.settingsValue.threedSceneSettings.threedEnvironmentSettings);
        this.setCameraValues(this.settingsValue.threedSceneSettings.threedCameraSettings, this.camera);
        this.setDevicesValues(this.settingsValue.threedSceneSettings.threedDevicesSettings);

        this.hoveringColor = this.getAlphaAndColorFromString(this.settingsValue?.hoverColor || '00ff00');
        this.hoveringMaterial = new THREE.MeshStandardMaterial({
            color: this.hoveringColor.color,
            opacity: this.hoveringColor.alpha,
            transparent: true,
            //wireframe: true,
        });
        console.log(this.hoveringColor);
    }

    /*
    private hasParentWithUUID(uuid: string, object: THREE.Object3D) {
        if (object.uuid == uuid) return true;
        if (object.parent != null) return this.hasParentWithUUID(uuid, object.parent);
        return false;
    }*/

    private getAlphaAndColorFromString(colorString: string): { color: THREE.Color, alpha: number } {
        const matchRGB = colorString.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
        const matchHex = colorString.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
        const matchHSL = colorString.match(/^hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,?\s*([\d.]+)?\)$/);

        if (matchRGB) {
            const alpha = matchRGB[4] ? parseFloat(matchRGB[4]) : 1;
            return { color: new THREE.Color(colorString), alpha };
        } else if (matchHex) {
            const alpha = matchHex[4] ? parseInt(matchHex[4], 16) / 255 : 1;
            return { color: new THREE.Color(colorString), alpha };
        } else if (matchHSL) {
            const alpha = matchHSL[4] ? parseFloat(matchHSL[4]) : 1;
            return { color: new THREE.Color(colorString), alpha };
        } else {
            return { color: new THREE.Color(colorString), alpha: 1 };
        }
    }

    protected override tick() {
        super.tick();

        if (this.controls && this.controls.isLocked === true) {
            this.pointerRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera!);
            const intersects = this.pointerRaycaster.intersectObjects(this.scene!.children, true);

            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                if (this.INTERSECTED != intersectedObject) {
                    this.deselectModel();

                    this.INTERSECTED = intersectedObject;
                    this.INTERSECTED!.userData.currentMaterial = this.INTERSECTED!.material;
                    this.INTERSECTED!.material = this.hoveringMaterial;

                    for (const label of this.labels.values()) {
                        if (this.getParentByChild(this.INTERSECTED, OBJECT_ID_TAG, label.cssObject.parent.userData[OBJECT_ID_TAG])) {
                            this.camera!.layers.enable(label.layer);
                            this.INTERSECTED.userData.layer = label.layer;
                            break;
                        }
                    }
                }
            } else {
                this.deselectModel();
                this.INTERSECTED = null;
            }
        }
    }

    private deselectModel(): void {
        if (this.INTERSECTED) {
            this.INTERSECTED!.material = this.INTERSECTED.userData.currentMaterial;

            const layer = this.INTERSECTED.userData.layer;
            if (layer >= this.initialLabelLayerIndex)
                this.camera!.layers.disable(layer);
        }
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
            if (!this.labels.has(id)) continue;
            else {
                index = i;
                break;
            }
        }

        if (index == -1) return;

        const id = ids[index];
        const divLabel = this.labels.get(id).divElement;
        divLabel.innerHTML = content;
        //divLabel.textContent = content;
    }
}