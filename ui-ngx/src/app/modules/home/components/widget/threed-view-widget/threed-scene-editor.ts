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

import { ElementRef, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BoxHelper, Vector3 } from 'three';
import { ThreedOrbitScene } from '@home/components/widget/threed-view-widget/threed-orbit-scene';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ThreedCameraSettings, ThreedSceneSettings } from '@home/components/widget/threed-view-widget/threed-models';
import { CAMERA_ID, OBJECT_ID_TAG, ROOT_TAG, ThreedSceneControllerType } from '@home/components/widget/threed-view-widget/threed-constants';
import { ThreedUtils } from '@home/components/widget/threed-view-widget/threed-utils';

export interface ThreedSceneEditorConfig {
    controllerType: ThreedSceneControllerType;
}
export const defaultThreedSceneEditorConfig: ThreedSceneEditorConfig = {
    controllerType: ThreedSceneControllerType.FIRST_PERSON_CONTROLLER
}

export class ThreedSceneEditor extends ThreedOrbitScene<ThreedSceneSettings, ThreedSceneEditorConfig> {

    private readonly SCREEN_WIDTH_ASPECT_RATIO = 4;
    private readonly SCREEN_HEIGHT_ASPECT_RATIO = 4;

    private perspectiveCamera: THREE.PerspectiveCamera;
    private perspectiveCameraHelper: THREE.CameraHelper;
    private cameraMesh: THREE.Mesh | THREE.Group;
    private debugCameraScreenWidth = this.screenWidth / this.SCREEN_WIDTH_ASPECT_RATIO;
    private debugCameraScreenHeight = this.screenHeight / this.SCREEN_HEIGHT_ASPECT_RATIO;
    private showDebugCameraPreview = false;
    private focusOnCameraDone = false;

    private transformControl?: TransformControls;
    private boxHelper?: BoxHelper;
    private raycaster = new THREE.Raycaster();
    private raycastEnabled = true;
    private raycastEnabledLastFrame = true;

    public positionChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public rotationChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public scaleChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    private lastPosition = new THREE.Vector3();
    private lastRotation = new THREE.Vector3();
    private lastScale = new THREE.Vector3();

    constructor(canvas?: ElementRef, configs: ThreedSceneEditorConfig = defaultThreedSceneEditorConfig) {
        super(canvas, configs);
    }

    protected isController(controllerType: ThreedSceneControllerType): boolean {
        return this.configs?.controllerType == controllerType;
    }

    protected override initialize(canvas?: ElementRef): void {
        super.initialize(canvas);

        this.renderer.autoClear = false;

        if (this.isController(ThreedSceneControllerType.FIRST_PERSON_CONTROLLER))
            this.initializeCameraHelper();
        this.initializeTransformControl();
        this.initializeBoxHelper();
    }

    private initializeCameraHelper() {
        console.log("initializeCameraHelper");
        this.perspectiveCamera = new THREE.PerspectiveCamera(60, this.camera.aspect, 1, 150);
        this.perspectiveCameraHelper = new THREE.CameraHelper(this.perspectiveCamera);
        this.scene.add(this.perspectiveCameraHelper)

        new GLTFLoader().load("./assets/models/gltf/camera.glb", (gltf: GLTF) => {
            this.cameraMesh = gltf.scene;
            this.cameraMesh.traverse((o: any) => {
                if (o.isMesh) {
                    o.material?.emissive?.setHex(0xffffff);
                }
            })
            this.cameraMesh.userData[ROOT_TAG] = true;
            this.cameraMesh.userData[OBJECT_ID_TAG] = CAMERA_ID;
            this.cameraMesh.add(this.perspectiveCamera);
            this.scene.add(this.cameraMesh);

            this.setCameraValues(this.settingsValue.threedCameraSettings, this.cameraMesh);
        });
    }

    private initializeTransformControl() {
        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('change', () => this.render());
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.orbit.enabled = !event.value;
            this.raycastEnabled = !event.value;
            if (this.orbit.enabled) {
                const obj = this.transformControl.object;
                const id = obj.userData[OBJECT_ID_TAG]
                const newPosition = this.transformControl.object?.position;
                const euler = new THREE.Euler().copy(this.transformControl.object?.rotation);
                const newRotation = new THREE.Vector3(
                    THREE.MathUtils.radToDeg(euler.x),
                    THREE.MathUtils.radToDeg(euler.y),
                    THREE.MathUtils.radToDeg(euler.z)
                );
                const newScale = this.transformControl.object?.scale;

                if (!ThreedUtils.compareVector3AndUpdate(newPosition, this.lastPosition))
                    this.positionChanged.emit({ id, vector: newPosition });
                if (!ThreedUtils.compareVector3AndUpdate(newRotation, this.lastRotation))
                    this.rotationChanged.emit({ id, vector: newRotation });
                if (!ThreedUtils.compareVector3AndUpdate(newScale, this.lastScale))
                    this.scaleChanged.emit({ id, vector: newScale });

                //console.log(newPosition, newRotation, newScale);
            } else {
                this.raycastEnabledLastFrame = false;
            }
        });
        this.transformControl.visible = false;
        this.scene.add(this.transformControl);
    }

    private initializeBoxHelper() {
        if (!this.boxHelper) {
            this.boxHelper = new THREE.BoxHelper(undefined, 0xffff00);
            this.scene.add(this.boxHelper);
            this.boxHelper.visible = false
        }
    }

    protected override onRemoveModel(gltf: GLTF, id: string): void {
        super.onRemoveModel(gltf, id);

        this.transformControl.detach();
    }

    protected tick(): void {
        super.tick();

        if (this.boxHelper?.visible) this.boxHelper?.update();
        if (this.perspectiveCameraHelper?.visible) this.perspectiveCameraHelper?.update();
    }

    public override render(): void {
        this.renderer.clear();

        this.renderer.setViewport(0, 0, this.screenWidth, this.screenHeight);
        super.render();

        if (this.showDebugCameraPreview) {
            const boxHelperVisible = this.boxHelper?.visible || false;
            const transformControlVisible = this.transformControl?.visible || false;
            const perspectiveCameraHelperVisible = this.perspectiveCameraHelper?.visible || false;

            if (this.boxHelper) this.boxHelper.visible = false;
            if (this.transformControl) this.transformControl.visible = false;
            if (this.perspectiveCameraHelper) this.perspectiveCameraHelper.visible = false;

            const x = this.screenWidth - this.debugCameraScreenWidth;
            this.renderer.clearDepth();
            this.renderer.setScissorTest(true);
            this.renderer.setScissor(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight)
            this.renderer.setViewport(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight);
            this.renderer.render(this.scene, this.perspectiveCamera);
            this.renderer.setScissorTest(false);

            if (this.boxHelper) this.boxHelper.visible = boxHelperVisible;
            if (this.transformControl) this.transformControl.visible = transformControlVisible;
            if (this.perspectiveCameraHelper) this.perspectiveCameraHelper.visible = perspectiveCameraHelperVisible;
        }
    }

    public override resize(width?: number, height?: number): void {
        super.resize(width, height);

        if (this.isController(ThreedSceneControllerType.FIRST_PERSON_CONTROLLER)) {
            this.debugCameraScreenWidth = this.screenWidth / this.SCREEN_WIDTH_ASPECT_RATIO;
            this.debugCameraScreenHeight = this.screenHeight / this.SCREEN_HEIGHT_ASPECT_RATIO;
            this.perspectiveCamera.aspect = this.debugCameraScreenWidth / this.debugCameraScreenHeight;
            this.perspectiveCamera.updateProjectionMatrix();
        }
    }

    private updateRaycaster() {
        if (!this.raycastEnabled) return;
        if (!this.raycastEnabledLastFrame) {
            this.raycastEnabledLastFrame = true;
            return;
        }

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersection = this.raycaster.intersectObjects(this.scene.children).filter(o => {
            return o.object.type != "TransformControlsPlane" &&
                o.object.type != "BoxHelper" &&
                o.object.type != "GridHelper" && 
                //@ts-ignore
                o.object.tag != "Helper"
        });

        /*
        console.log(intersection);

        console.log(intersection.map(o => {
            const ud = this.getParentByChild(o.object, ROOT_TAG, true)?.userData;
            return { d: o.distance, ud: ud };
        }));*/

        if (intersection.length > 0) {
            const intersectedObject = intersection[0].object;
            const root = this.getParentByChild(intersectedObject, ROOT_TAG, true);
            if (root) this.changeTransformControl(root);
            else console.log(intersectedObject);
        } else {
            this.changeTransformControl(undefined);
        }
    }

    private changeTransformControl(model?: THREE.Object3D) {
        this.transformControl.detach();
        this.transformControl.visible = model ? true : false;
        this.boxHelper.visible = model ? true : false;

        if (model) {
            this.transformControl.attach(model);
            this.boxHelper.setFromObject(model);

            this.showDebugCameraPreview = model.userData[OBJECT_ID_TAG] == CAMERA_ID;

            this.lastPosition.copy(model.position);
            const euler = new THREE.Euler().copy(this.transformControl.object?.rotation);
            this.lastRotation = new THREE.Vector3(
                THREE.MathUtils.radToDeg(euler.x),
                THREE.MathUtils.radToDeg(euler.y),
                THREE.MathUtils.radToDeg(euler.z)
            );
            this.lastScale.copy(model.scale);
        }
    }

    protected override onSettingValues() {
        this.setEnvironmentValues(this.settingsValue.threedEnvironmentSettings);
        this.setCameraValues(this.settingsValue.threedCameraSettings, this.cameraMesh);
        this.setDevicesValues(this.settingsValue.threedDevicesSettings);
    }

    protected override setCameraValues(threedCameraSettings: ThreedCameraSettings, camera?: THREE.PerspectiveCamera | THREE.Object3D<THREE.Event>): void {
        super.setCameraValues(threedCameraSettings, camera);

        if (threedCameraSettings && this.perspectiveCamera) {
            this.perspectiveCamera.far = threedCameraSettings.far || this.perspectiveCamera.far;
            this.perspectiveCamera.near = threedCameraSettings.near || this.perspectiveCamera.near;
            this.perspectiveCamera.fov = threedCameraSettings.fov || this.perspectiveCamera.fov;
            this.perspectiveCamera.updateProjectionMatrix();

            if(!this.focusOnCameraDone) {
                this.focusOnObject(this.cameraMesh);
                this.focusOnCameraDone = true;
            }
        }
    }

    public override onMouseClick(event: MouseEvent): void {
        super.onMouseClick(event);

        this.updateRaycaster();
    }

    public override onKeyDown(event: KeyboardEvent): void {
        super.onKeyDown(event);

        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight": // Shift
                this.transformControl?.setTranslationSnap(100);
                this.transformControl?.setRotationSnap(THREE.MathUtils.degToRad(15));
                this.transformControl?.setScaleSnap(0.25);
                break;

            case "KeyT":
                this.changeTransformControlMode('translate');
                break;

            case "KeyR":
                this.changeTransformControlMode('rotate');
                break;

            case "KeyS":
                this.changeTransformControlMode('scale');
                break;

            case "Backquote":
                this.transformControl?.reset();
                break;
        }
    }

    public override onKeyUp(event: KeyboardEvent): void {
        super.onKeyUp(event);

        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight":
                this.transformControl?.setTranslationSnap(null);
                this.transformControl?.setRotationSnap(null);
                this.transformControl?.setScaleSnap(null);
                break;

        }
    }

    public changeTransformControlMode(mode: 'translate' | 'rotate' | 'scale') {
        this.transformControl?.setMode(mode);
    }

    public focusOnObject(object?: THREE.Object3D) {
        this.raycastEnabledLastFrame = false;

        object = object || this.transformControl?.object;
        const position = object?.position || new THREE.Vector3(0, 0, 0);
        this.orbit.target.copy(position);
        this.orbit.update();
    }
}