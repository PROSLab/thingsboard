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

import { IThreedRenderer } from "./ithreed-renderer";
import { ElementRef } from "@angular/core";
import { ThreedCssManager } from "./threed-css-manager";
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { IThreedSceneManager } from "./ithreed-scene-manager";
import { ThreedRendererManager } from "./threed-renderer-manager";
import { Scene, Camera, WebGLRenderer } from "three";
import { IThreedComponent } from "../threed-components/ithreed-component";
import { ThreedModelManager } from "./threed-model-manager";
import { ThreedSceneConfig } from "../threed-scenes/threed-scene-builder";
import { isIThreedUpdatable } from "../threed-components/ithreed-updatable";
import { isIThreedListener } from "../threed-components/ithreed-listener";
import * as THREE from 'three';

export class ThreedGenericSceneManager implements IThreedSceneManager {

    private rendererContainer: ElementRef;
    private threedRenderers: IThreedRenderer[] = [];
    private components: IThreedComponent[] = [];

    public scene: Scene;
    public camera: Camera;

    public configs: ThreedSceneConfig;
    public modelManager: ThreedModelManager;
    public screenWidth = window.innerWidth;
    public screenHeight = window.innerHeight;
    public currentValues: any;
    public mouse = new THREE.Vector2();

    constructor(configs: ThreedSceneConfig) {
        this.configs = configs;
    }

    public initialize() {
        this.threedRenderers.push(new ThreedRendererManager());
        this.threedRenderers.push(new ThreedCssManager());
        this.initializeEventListeners();

        this.modelManager = new ThreedModelManager(this);
        this.modelManager.onAfterAddModel.subscribe(_ => this.updateValues());
    }

    public add(component: IThreedComponent) {
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

    public isActive(): boolean {
        return true;
    }

    public getComponent<T extends IThreedComponent>(type: new () => T): T | undefined {
        return this.components.find(c => c instanceof type) as T | undefined;
    }

    /**========================================================================
     *                           UPDATE VALUES
     *========================================================================**/
    public setValues(values: any) {
        this.currentValues = { ...this.currentValues, ...values };

        console.log(this.currentValues);

        this.updateValues();
    }

    private updateValues() {
        if (!this.currentValues) return;

        this.components.forEach(c => {
            if (isIThreedUpdatable(c))
                c.onUpdateValues(this.currentValues);
        });

        this.render();
    }
    /*============================ END OF UPDATE VALUES ============================*/



    /**========================================================================
     *                           UPDATE & RENDERING
     *========================================================================**/
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
    /*============================ END OF UNDATE & RENDERING ============================*/


    /**========================================================================
     *                           EVENTS
     *========================================================================**/
    private initializeEventListeners() {
        const rendererElement = this.getRenderer().domElement;
        rendererElement.addEventListener('mousemove', (event: MouseEvent) => this.mouseMove(event));
        rendererElement.addEventListener('click', (event: MouseEvent) => this.mouseClick(event));
        window.addEventListener('keydown', (event: KeyboardEvent) => this.keyDown(event));
        window.addEventListener('keyup', (event: KeyboardEvent) => this.keyUp(event));
    }

    private mouseMove(event: MouseEvent) {
        this.calculateMousePosition(event);

        this.components.forEach(c => {
            if (isIThreedListener(c))
                c.onMouseMove(event);
        });
    }
    private mouseClick(event: MouseEvent) {
        this.calculateMousePosition(event);

        this.components.forEach(c => {
            if (isIThreedListener(c))
                c.onMouseClick(event);
        });
    }
    private keyDown(event: KeyboardEvent) {
        this.components.forEach(c => {
            if (isIThreedListener(c))
                c.onKeyDown(event);
        });
    }
    private keyUp(event: KeyboardEvent) {
        this.components.forEach(c => {
            if (isIThreedListener(c))
                c.onKeyUp(event);
        });
    }

    private calculateMousePosition(event: MouseEvent) {
        if (!this.rendererContainer || !this.isActive()) return;

        const rect = this.rendererContainer.nativeElement.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.mouse.x < 1 && this.mouse.x > -1 && this.mouse.y < 1 && this.mouse.y > -1) {
            event.preventDefault();
        }
    }
    /*============================ END OF EVENTS ============================*/


}