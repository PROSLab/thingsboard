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

import { ElementRef, HostListener } from '@angular/core';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    ThreedCameraSettings,
    ThreedDevicesSettings,
    ThreedEnvironmentSettings,
    ThreedSceneSettings, ThreedVectorSettings, ThreedViewWidgetSettings,
} from '@home/components/widget/threed-view-widget/threed-models';
import { Object3D } from 'three';
import { WidgetContext } from '@home/models/widget-component.models';
import { CAMERA_ID, ENVIRONMENT_ID, OBJECT_ID_TAG, ROOT_TAG } from './threed-constants';

/**
 * @param S refert to the type of Settings
 */
export abstract class ThreedAbstractScene<S, C> {

    private rendererContainer: ElementRef;

    protected renderer?: THREE.WebGLRenderer;
    protected scene?: THREE.Scene;
    protected camera?: THREE.PerspectiveCamera;

    protected models: Map<string, GLTF> = new Map();
    protected objects: Object3D[] = [];
    protected settingsValue?: S;
    protected configs?: C; 

    protected mouse = new THREE.Vector2();
    protected active = true;

    protected screenWidth = window.innerWidth;
    protected screenHeight = window.innerHeight;


    constructor(canvas?: ElementRef, configs?: C) {
        this.rendererContainer = canvas;
        this.configs = configs;
        this.initialize(canvas);
    }

    protected initialize(canvas?: ElementRef) {
        this.renderer = new THREE.WebGLRenderer(canvas ? { canvas: canvas.nativeElement } : undefined);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xcccccc);

        this.camera = new THREE.PerspectiveCamera(60, this.screenWidth / this.screenHeight, 1, 1000);
        this.camera.position.set(0, 5, 0);

        this.scene.add(new THREE.GridHelper(1000, 10, 0x888888, 0x444444));

        const ambientLight = new THREE.AmbientLight(0xFEFEFE, 1);
        ambientLight.position.set(0, 0, 0);
        this.scene.add(ambientLight);

        if (canvas) {
            this.updateRendererSize();
            this.startRendering();
        }
    }

    public attachToElement(rendererContainer: ElementRef) {
        if (this.rendererContainer) throw new Error("Renderer already attached to element!");

        this.rendererContainer = rendererContainer;
        this.updateRendererSize();
        rendererContainer.nativeElement.appendChild(this.renderer.domElement);
        this.startRendering();
    }

    private updateRendererSize() {
        const rect = this.rendererContainer.nativeElement.getBoundingClientRect();
        this.screenWidth = rect.width;
        this.screenHeight = rect.height;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.screenWidth, this.screenHeight);
    }

    private startRendering() {
        this.resize();
        this.animate();
    }

    protected animate() {
        window.requestAnimationFrame(() => this.animate());

        this.tick();

        this.render();
    }

    protected abstract tick(): void;

    public render(): void {
        this.renderer.render(this.scene!, this.camera!);
    }

    public onDataChanged(ctx: WidgetContext): void { }

    public resize(width?: number, height?: number) {
        const rect = this.rendererContainer?.nativeElement.getBoundingClientRect();
        this.screenWidth = width || rect.width;
        this.screenHeight = height || rect.height;

        this.renderer.setSize(this.screenWidth, this.screenHeight);

        this.camera!.aspect = this.screenWidth / this.screenHeight;
        this.camera!.updateProjectionMatrix();

        //this.render();
    }

    public replaceModel(model: GLTF, id?: string): void {
        this.removeModel(id || model.scene.uuid, false);
        this.addModel(model, id);
    }

    protected addModel(model: GLTF, id?: string): void {
        const root = model.scene;
        const customId = id || root.uuid
        model.userData[OBJECT_ID_TAG] = customId;
        model.userData[ROOT_TAG] = true;
        root.userData[OBJECT_ID_TAG] = customId;
        root.userData[ROOT_TAG] = true;
        this.models.set(customId, model);
        console.log("addModel", customId, this.models);
        this.scene!.add(root);
        this.setValues();

        this.recalculateSceneObjects();

        this.render();
    }

    public removeModel(id: string, calculateSceneObjects: boolean = true): void {
        console.log("removeModel", id, this.models, this.models.has(id));
        if (!this.models.has(id)) return;

        const gltf = this.models.get(id);
        this.onRemoveModel(gltf, id);
        const parent = gltf.scene.parent;
        parent.remove(gltf.scene);
        this.models.delete(id);

        if (calculateSceneObjects) {
            this.recalculateSceneObjects();
        }
    }

    protected onRemoveModel(gltf: GLTF, id: string) { }

    private recalculateSceneObjects(): void {
        this.objects = [];
        this.listChildren(this.scene.children);
    }

    private listChildren(children: any) {
        //console.log(children);
        let child;
        for (let i = 0; i < children.length; i++) {
            child = children[i];
            //console.log(child);

            // Calls this function again if the child has children
            if (child.children && child.children.length > 0) {
                this.listChildren(child.children);
            }
            // Logs if this child last in recursion
            else {
                //console.log('Reached bottom with: ', child);
                if (child.type == "Mesh")
                    this.objects.push(child);
            }
        }
    }

    protected getParentByChild(child: THREE.Object3D, tag: string, value: any): THREE.Object3D | undefined {
        if (child.userData[tag] == value) return child;
        else if (child.parent != null) return this.getParentByChild(child.parent, tag, value);
        else return undefined;
    }

    /*
    protected getRootObjectByChild(child: THREE.Object3D): THREE.Object3D | undefined {
        if (child.userData[this.ROOT_TAG]) return child;
        else if (child.parent != null) return this.getRootObjectByChild(child.parent);
        else return undefined;
    }*/

    public updateValue(value: S): void {
        this.settingsValue = value;

        this.setValues();
    }

    private setValues() {
        // TODO: this.models.get(this.settingsValue.models[0].uuid) ...
        // TODO:update only the changed model...
        if (this.models.size == 0 || !this.settingsValue) return;

        this.onSettingValues();

        this.render();
    }

    protected onSettingValues() { }

    protected setEnvironmentValues(threedEnvironmentSettings: ThreedEnvironmentSettings) {
        const environmentSettings = threedEnvironmentSettings?.objectSettings;
        if (!environmentSettings) return;

        this.updateModelTransforms(ENVIRONMENT_ID, environmentSettings);
    }

    protected setCameraValues(threedCameraSettings: ThreedCameraSettings, camera?: THREE.Object3D | THREE.PerspectiveCamera) {
        if (!threedCameraSettings) return;

        this.updateModelTransforms(CAMERA_ID, { threedPositionVectorSettings: threedCameraSettings.initialPosition, threedRotationVectorSettings: threedCameraSettings.initialRotation });

        if (camera) {
            const position = threedCameraSettings.initialPosition;
            const rotation = threedCameraSettings.initialRotation;
            if (position) camera.position.set(position.x, position.y, position.z);
            if (rotation) camera.rotation.set(THREE.MathUtils.degToRad(rotation.x), THREE.MathUtils.degToRad(rotation.y), THREE.MathUtils.degToRad(rotation.z));

            //@ts-ignore
            if (camera.isPerspectiveCamera) {
                const cam = camera as THREE.PerspectiveCamera;
                cam.far = threedCameraSettings.far || cam.far;
                cam.near = threedCameraSettings.near || cam.near;
                cam.fov = threedCameraSettings.fov || cam.fov;
                cam.updateProjectionMatrix();
            }
        }
    }

    protected setDevicesValues(threedDevicesSettings: ThreedDevicesSettings) {
        const devicesSettings = threedDevicesSettings;
        if (!devicesSettings || !devicesSettings.threedDeviceGroupSettings) return;

        devicesSettings.threedDeviceGroupSettings.forEach(deviceGroup => {
            const objectsSettings = deviceGroup.threedObjectSettings;
            if (objectsSettings) {
                objectsSettings.forEach(objectSettings => {
                    this.updateModelTransforms(objectSettings.entity.id, objectSettings);
                });
            }
        });
    }

    protected updateModelTransforms(id: string,
        settings: {
            threedPositionVectorSettings?: ThreedVectorSettings,
            threedRotationVectorSettings?: ThreedVectorSettings,
            threedScaleVectorSettings?: ThreedVectorSettings
        }) {

        const model = this.models.get(id);
        if (!model) return;

        const position = settings.threedPositionVectorSettings;
        const rotation = settings.threedRotationVectorSettings;
        const scale = settings.threedScaleVectorSettings;

        if (position) model.scene.position.set(position.x, position.y, position.z);
        if (rotation) model.scene.rotation.set(THREE.MathUtils.degToRad(rotation.x), THREE.MathUtils.degToRad(rotation.y), THREE.MathUtils.degToRad(rotation.z));
        if (scale) model.scene.scale.set(scale.x, scale.y, scale.z);
    }

    public onMouseMove(event: MouseEvent): void {
        this.calculateMousePosition(event);
    }

    public abstract onKeyDown(event: KeyboardEvent): void;
    public abstract onKeyUp(event: KeyboardEvent): void;
    public onMouseClick(event: MouseEvent): void {
        this.calculateMousePosition(event);
    }

    private calculateMousePosition(event: MouseEvent) {
        if (!this.rendererContainer || !this.active) return;

        const rect = this.rendererContainer.nativeElement.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.mouse.x < 1 && this.mouse.x > -1 && this.mouse.y < 1 && this.mouse.y > -1) {
            event.preventDefault();
        }
    }
}