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

import { ElementRef } from '@angular/core';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    ThreedCameraSettings,
    ThreedDevicesSettings,
    ThreedEnvironmentSettings,
    ThreedVectorSettings,
} from '@home/components/widget/threed-view-widget/threed-models';
import { Object3D } from 'three';
import { WidgetContext } from '@home/models/widget-component.models';
import { CAMERA_ID, ENVIRONMENT_ID, OBJECT_ID_TAG, ROOT_TAG } from '@home/components/widget/threed-view-widget/threed-constants';
import { ThreedUtils } from './threed-utils';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';


export interface ThreedSceneConfig {
    createGrid: boolean,
    shadow?: boolean
}
export interface ModelConfig {
    id?: string,
    autoResize?: boolean,
}
const defaultModelConfig: ModelConfig = { autoResize: false }


/**
 * @param S refert to the type of Settings
 * @param C refert to the type of Configs
 */
export abstract class ThreedAbstractScene<S, C extends ThreedSceneConfig> {

    private rendererContainer: ElementRef;

    protected renderer?: THREE.WebGLRenderer;
    protected scene?: THREE.Scene;
    protected camera?: THREE.PerspectiveCamera;

    protected models: Map<string, GLTF> = new Map();
    protected explodedModels: Map<string, THREE.Group> = new Map();
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

        this.camera = new THREE.PerspectiveCamera(60, this.screenWidth / this.screenHeight, 0.01, 10000);
        this.camera.position.set(0, 40, -70);

        if (this.configs?.createGrid) this.scene.add(new THREE.GridHelper(1000, 10, 0x888888, 0x444444));
        if (this.configs?.shadow) this.createSimpleShadow();

        const ambientLight = new THREE.AmbientLight(0xFEFEFE, 1);
        ambientLight.position.set(0, 0, 0);
        this.scene.add(ambientLight);

        if (canvas) {
            this.updateRendererSize();
            this.startRendering();
        }
    }

    private createSimpleShadow() {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        //Create a DirectionalLight and turn on shadows for the light
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(20, 250, 10);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        //Set up shadow properties for the light
        const size = 200;
        light.shadow.camera.left = -size;
        light.shadow.camera.right = size;
        light.shadow.camera.top = size;
        light.shadow.camera.bottom = -size;
        light.shadow.mapSize.width = 128;
        light.shadow.mapSize.height = 128;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
        light.shadow.bias = 0.01;
        light.shadow.blurSamples = 10;
        this.scene.add(light);

        //Create a plane that receives shadows (but does not cast them)
        const planeGeometry = new THREE.PlaneGeometry(size, size);
        const planeMaterial = new THREE.ShadowMaterial();
        planeMaterial.opacity = 0.5;
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotateX(-Math.PI / 2);
        plane.position.y = -5;
        plane.castShadow = false;
        plane.receiveShadow = true;
        this.scene.add(plane);
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

        TWEEN.update();
    }

    protected abstract tick(): void;

    public render(): void {
        this.renderer.render(this.scene!, this.camera!);

        //console.log(this.camera.position);
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

    public replaceModel(model: GLTF, configs: ModelConfig = defaultModelConfig): void {
        this.removeModel(configs?.id || model.scene.uuid, false);
        this.addModel(model, configs);
    }

    protected addModel(model: GLTF, configs: ModelConfig = defaultModelConfig): void {
        const root = model.scene;
        const customId = configs.id || root.uuid
        model.userData[OBJECT_ID_TAG] = customId;
        model.userData[ROOT_TAG] = true;
        root.userData[OBJECT_ID_TAG] = customId;
        root.userData[ROOT_TAG] = true;
        this.models.set(customId, model);
        console.log("addModel", customId, this.models);

        if (configs.autoResize) {
            const distance = this.camera.position.distanceTo(new THREE.Vector3());
            ThreedUtils.autoScaleModel(model, Math.floor(distance));
        }

        if (this.configs?.shadow) {
            root.traverse(object => {
                //@ts-ignore
                if (object.isMesh) {
                    object.castShadow = true;
                    object.receiveShadow = true;
                }
            });
        }

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

            if (camera instanceof THREE.PerspectiveCamera) {
                camera.far = threedCameraSettings.far || camera.far;
                camera.near = threedCameraSettings.near || camera.near;
                camera.fov = threedCameraSettings.fov || camera.fov;
                camera.updateProjectionMatrix();
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

    public explodeObjectByDistance(id: string, distance: number) {
        if (!this.models.has(id)) return;

        const gltf = this.models.get(id);
        const object = gltf.scene;
        if (!this.explodedModels.has(id)) {
            const explodedModel = this.splitIntoMeshes(object);
            const box = new THREE.Box3().setFromObject(explodedModel);
            explodedModel.userData.defaultCenterPosition = box.getCenter(new THREE.Vector3());
            this.scene.add(explodedModel);

            this.explodedModels.set(id, explodedModel);
            // const axesHelper = new THREE.AxesHelper(100);
            // axesHelper.position.copy(this.center);
            // this.scene.add(axesHelper);
        }

        const explodedModel = this.explodedModels.get(id);
        if (distance == 0) {
            object.visible = true;
            explodedModel.visible = false;
            return;
        } else {
            object.visible = false;
            explodedModel.visible = true;
        }

        explodedModel.updateMatrixWorld(); // make sure object's world matrix is up to date

        const center = explodedModel.userData.defaultCenterPosition;
        // Move each mesh away from the object's center along a radial direction
        explodedModel.children.forEach((mesh) => {
            const position = mesh.userData.defaultPosition.clone();
            const centerPosition = mesh.userData.defaultCenterPosition.clone();
            const direction = centerPosition.clone().sub(center);
            const offset = direction.multiplyScalar(distance);
            mesh.position.copy(position.add(offset));
        });
    }

    private splitIntoMeshes(object: THREE.Object3D): THREE.Group {
        const parts = new THREE.Group();
        const box = new THREE.Box3();

        // Traverse through the scene to get all the parts
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Get the world position, rotation, and scale of the child mesh
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                child.getWorldPosition(position);
                child.getWorldQuaternion(quaternion);
                child.getWorldScale(scale);

                // Create a new mesh with the same geometry and material
                const mesh = new THREE.Mesh(child.geometry, child.material);

                // Set the position, rotation, and scale of the new mesh
                mesh.position.copy(position);
                mesh.quaternion.copy(quaternion);
                mesh.scale.copy(scale);

                box.setFromObject(mesh);
                mesh.userData.defaultCenterPosition = box.getCenter(new THREE.Vector3());
                mesh.userData.defaultPosition = new THREE.Vector3().copy(mesh.position);

                if (this.configs?.shadow) {
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                }

                // Add the new mesh to the group
                parts.add(mesh);
            }
        });
        return parts;
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