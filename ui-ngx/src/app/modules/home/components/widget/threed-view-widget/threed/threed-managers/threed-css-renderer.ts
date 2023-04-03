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
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import { IThreedSceneManager } from "./ithreed-scene-manager";
import { IThreedRenderer } from "./ithreed-renderer";

export class ThreedCssRenderer implements IThreedRenderer {
    protected cssRenderer?: CSS2DRenderer;

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
        //this.cssRenderer.domElement.style.pointerEvents = 'none'
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
}