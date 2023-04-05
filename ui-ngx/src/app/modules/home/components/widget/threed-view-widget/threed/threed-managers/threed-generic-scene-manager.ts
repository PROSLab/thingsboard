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

import { ElementRef, EventEmitter } from "@angular/core";
import * as THREE from 'three';
import { Camera, Scene } from "three";
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { IThreedComponent } from "../threed-components/ithreed-component";
import { IThreedTester } from "../threed-components/ithreed-tester";
import { ThreedSceneConfig } from "../threed-scenes/threed-scene-builder";
import { IThreedRenderer } from "./ithreed-renderer";
import { IThreedSceneManager } from "./ithreed-scene-manager";
import { ThreedCssManager } from "./threed-css-manager";
import { ThreedCssRenderer } from "./threed-css-renderer";
import { ThreedModelManager } from "./threed-model-manager";
import { ThreedWebRenderer } from "./threed-web-renderer";
import { Subscription } from "rxjs";

export class ThreedGenericSceneManager implements IThreedSceneManager {

    private static activeSceneManagers: Map<number, boolean> = new Map();
    private static lastSceneId = 1;

    private sceneId: number;
    private rendererContainer: ElementRef;
    private threedRenderers: IThreedRenderer[] = [];
    private components: IThreedComponent[] = [];
    private vrActive = false;
    private subscriptions: Subscription[] = [];

    public scene: Scene;
    public camera: Camera;

    public configs: ThreedSceneConfig;
    public modelManager: ThreedModelManager;
    public cssManager: ThreedCssManager;
    public screenWidth = window.innerWidth;
    public screenHeight = window.innerHeight;
    public currentValues: any;
    public mouse = new THREE.Vector2();

    public onRendererContainerChange = new EventEmitter<ElementRef>();

    constructor(configs: ThreedSceneConfig) {
        this.configs = configs;

        this.sceneId = ThreedGenericSceneManager.lastSceneId++;
        ThreedGenericSceneManager.activeSceneManagers.set(this.sceneId, false);
    }

    public initialize() {
        this.threedRenderers.push(new ThreedWebRenderer());
        this.threedRenderers.push(new ThreedCssRenderer());
        this.initializeEventListeners();
        this.initializeVR();
        this.scene = new THREE.Scene();

        this.modelManager = new ThreedModelManager(this);
        const s = this.modelManager.onAfterAddModel.subscribe(_ => this.updateValues());
        this.subscriptions.push(s);

        this.cssManager = new ThreedCssManager(this);

        this.components.forEach(c => c.initialize(this));
    }

    public add(component: IThreedComponent): void {
        this.components.push(component);
    }

    public addSubscription(subscription: Subscription): void {
        this.subscriptions.push(subscription);
    }

    public getTRenderer<T extends IThreedRenderer>(type: new () => T): T | undefined {
        return this.threedRenderers.find(c => c instanceof type) as T | undefined;
    }

    public attachToElement(rendererContainer: ElementRef) {
        if (this.rendererContainer)
            throw new Error("Render container already defined!");

        this.threedRenderers.forEach(r => r.attachToElement(rendererContainer));
        this.rendererContainer = rendererContainer;
        this.onRendererContainerChange.emit(rendererContainer);

        if (this.configs.vr) {
            const vrButton = VRButton.createButton(this.getTRenderer(ThreedWebRenderer).getRenderer());
            vrButton.addEventListener('click', () => this.vrActive = !this.vrActive);
            this.rendererContainer.nativeElement.appendChild(vrButton);
        }

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
        return ThreedGenericSceneManager.activeSceneManagers.get(this.sceneId) == true;
    }

    public getComponent<T extends IThreedComponent>(type: new () => T): T | undefined {
        return this.components.find(c => c instanceof type) as T | undefined;
    }

    public findComponentsByTester<T>(tester: (obj: any) => obj is T): T[] {
        let components: T[] = [];
        for (let index = 0; index < this.components.length; index++) {
            const component = this.components[index];
            if (tester(component))
                components.push(component);
        }
        return components;
    }

    /**========================================================================
     *                           UPDATE VALUES
     *========================================================================**/
    public setValues(values: any) {
        this.currentValues = { ...this.currentValues, ...values };

        console.log(this.currentValues);

        this.updateValues();
    }

    public forceUpdateValues() {
        this.updateValues();
    }

    private updateValues() {
        if (!this.currentValues) return;

        const updatables = this.findComponentsByTester(IThreedTester.isIThreedUpdatable)
        updatables.forEach(c => c.onUpdateValues(this.currentValues));

        this.render();
    }
    /*============================ END OF UPDATE VALUES ============================*/



    /**========================================================================
     *                           UPDATE & RENDERING
     *========================================================================**/
    private startRendering() {
        this.resize();

        if (this.configs.vr) {
            this.getTRenderer(ThreedWebRenderer).getRenderer().setAnimationLoop(() => this.loop());
        } else this.animate();
    }

    private animate() {
        window.requestAnimationFrame(() => this.animate());

        this.loop();
    }

    private loop() {
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
        this.components.forEach(c => c.render());
    }
    /*============================ END OF UNDATE & RENDERING ============================*/


    /**========================================================================
     *                           EVENTS
     *========================================================================**/
    private initializeEventListeners() {
        window.addEventListener('mousemove', (event: MouseEvent) => this.mouseMove(event));
        window.addEventListener('click', (event: MouseEvent) => this.mouseClick(event));
        window.addEventListener('keydown', (event: KeyboardEvent) => this.keyDown(event));
        window.addEventListener('keyup', (event: KeyboardEvent) => this.keyUp(event));
    }

    private mouseMove(event: MouseEvent) {
        this.calculateMousePosition(event);

        if (!this.isActive()) return;

        const listeners = this.findComponentsByTester(IThreedTester.isIThreedListener)
        listeners.forEach(c => c.onMouseMove(event));
    }
    private mouseClick(event: MouseEvent) {
        this.calculateMousePosition(event);

        if (!this.isActive()) return;

        const listeners = this.findComponentsByTester(IThreedTester.isIThreedListener)
        listeners.forEach(c => c.onMouseClick(event));
    }
    private keyDown(event: KeyboardEvent) {
        if (!this.isActive()) return;

        const listeners = this.findComponentsByTester(IThreedTester.isIThreedListener)
        listeners.forEach(c => c.onKeyDown(event));
    }
    private keyUp(event: KeyboardEvent) {
        if (!this.isActive()) return;

        const listeners = this.findComponentsByTester(IThreedTester.isIThreedListener)
        listeners.forEach(c => c.onKeyUp(event));
    }

    private calculateMousePosition(event: MouseEvent) {
        if (!this.rendererContainer) return;

        const rect = this.rendererContainer.nativeElement.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.mouse.x < 1 && this.mouse.x > -1 && this.mouse.y < 1 && this.mouse.y > -1) {
            ThreedGenericSceneManager.activeSceneManagers.set(this.sceneId, true);
            event.preventDefault();
        } else ThreedGenericSceneManager.activeSceneManagers.set(this.sceneId, false);
    }
    /*============================ END OF EVENTS ============================*/


    /**========================================================================
     *                           VR SECTION
     *========================================================================**/

    private initializeVR() {
        if (this.configs.vr) {
            this.getTRenderer(ThreedWebRenderer).getRenderer().xr.enabled = true;
        }
    }
    /*============================ END OF VR ============================*/


    public destory(): void {
        this.components.forEach(c => c.onDestory());   
        this.subscriptions.forEach(s => s.unsubscribe());
        this.cssManager.onDestory();
        this.modelManager.onDestory();
    }
}