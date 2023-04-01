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
import * as THREE from 'three';

export interface CssData {
    divElement: HTMLDivElement;
    cssObject: CSS2DObject;
    layer: number;
}

export class ThreedRendererManager implements IThreedRenderer {
    protected renderer?: THREE.WebGLRenderer;

    constructor() {
        this.initialize();
    }

    private initialize() {
        this.initializeRenderer();
    }

    private initializeRenderer() {
        this.renderer = new THREE.WebGLRenderer();
    }

    public attachToElement(rendererContainer: ElementRef) {
        rendererContainer.nativeElement.appendChild(this.renderer.domElement);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    public resize(width?: number, height?: number): void {
        this.renderer?.setSize(width, height);
    }

    public tick(threedSceneManager: IThreedSceneManager): void { 
        
    }

    public render(threedSceneManager: IThreedSceneManager): void {
        this.renderer.render(threedSceneManager.scene, threedSceneManager.camera);
    }

    public getRenderer() {
        return this.renderer;
    }
}