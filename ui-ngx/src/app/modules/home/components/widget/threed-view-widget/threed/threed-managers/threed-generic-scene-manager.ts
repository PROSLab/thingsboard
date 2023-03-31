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

import { ThreedRenderer } from "./threed-renderer";
import { ElementRef } from "@angular/core";
import { ThreedCssManager } from "./threed-css-manager";
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { ThreedSceneManager } from "./threed-scene-manager";
import { ThreedRendererManager } from "./threed-renderer-manager";
import { Scene, Camera, WebGLRenderer } from "three";
import { ThreedComponent } from "../threed-components/threed-component";
import { ThreedModelManager } from "./threed-model-manager";
import { ThreedSceneConfig } from "../threed-scenes/threed-scene-builder";

export class ThreedGenericSceneManager implements ThreedSceneManager {

    private rendererContainer: ElementRef;
    private threedRenderers: ThreedRenderer[] = [];
    private components: ThreedComponent[] = [];
    
    public scene: Scene;
    public camera: Camera;
    
    public configs: ThreedSceneConfig;
    public modelManager: ThreedModelManager;
    public screenWidth = window.innerWidth;
    public screenHeight = window.innerHeight;

    constructor(configs: ThreedSceneConfig) {
        this.configs = configs;
    }

    public initialize() {
        this.threedRenderers.push(new ThreedRendererManager());
        this.threedRenderers.push(new ThreedCssManager());

        this.modelManager = new ThreedModelManager(this);
    }

    public add(component: ThreedComponent) {
        component.initialize(this);
        this.components.push(component);
        return this;
    }

    public getRenderer(): WebGLRenderer {
        return this.threedRenderers[0].getRenderer();
    }

    public attachToElement(rendererContainer: ElementRef) {
        if (this.rendererContainer)
            throw new Error("Render container already defined!");

        this.threedRenderers.forEach(r => r.attachToElement(rendererContainer));
        this.rendererContainer = rendererContainer;
        this.startRendering();
    }

    public resize(width?: number, height?: number): void {
        const rect = this.rendererContainer?.nativeElement.getBoundingClientRect();
        this.screenWidth = width || rect.width;
        this.screenHeight = height || rect.height;

        this.threedRenderers.forEach(r => r.resize(this.screenWidth, this.screenHeight));
        this.components.forEach(c => c.resize());
    }

    private startRendering() {
        this.resize();
        this.animate();
    }

    private animate() {
        window.requestAnimationFrame(() => this.animate());

        this.tick();
        TWEEN.update();
        this.render();
    }

    private tick(): void {
        this.components.forEach(c => c.tick());
        this.threedRenderers.forEach(r => r.tick(this));
    }

    private render(): void {
        this.threedRenderers.forEach(r => r.render(this));
    }
}