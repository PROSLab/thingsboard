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

import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import * as THREE from 'three';
import { ThreedBaseComponent } from "./threed-base-component";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { CAMERA_ID, OBJECT_ID_TAG, ROOT_TAG } from "../../threed-constants";
import { IThreedPerspectiveCamera } from "./ithreed-perspective-camera";
import { ThreedWebRenderer } from "../threed-managers/threed-web-renderer";


export class ThreedCameraPreviewComponent extends ThreedBaseComponent implements IThreedPerspectiveCamera {

    private readonly SCREEN_WIDTH_ASPECT_RATIO = 4;
    private readonly SCREEN_HEIGHT_ASPECT_RATIO = 4;

    private perspectiveCamera: THREE.PerspectiveCamera;
    private perspectiveCameraHelper: THREE.CameraHelper;
    private cameraMesh: THREE.Mesh | THREE.Group;
    private debugCameraScreenWidth = 1;
    private debugCameraScreenHeight = 1;
    
    public enabled = false;

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.debugCameraScreenWidth = this.sceneManager.screenWidth / this.SCREEN_WIDTH_ASPECT_RATIO;
        this.debugCameraScreenHeight = this.sceneManager.screenHeight / this.SCREEN_HEIGHT_ASPECT_RATIO;
        this.initializeCameraHelper();
    }

    tick(): void {
        if (this.perspectiveCameraHelper?.visible) this.perspectiveCameraHelper?.update();
    }

    render(): void {
        if (!this.enabled) return;

        const renderer = this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer();
        const originalViewport = renderer.getViewport(new THREE.Vector4());

        //const boxHelperVisible = this.boxHelper?.visible || false;
        //const transformControlVisible = this.transformControl?.visible || false;
        const perspectiveCameraHelperVisible = this.perspectiveCameraHelper?.visible || false;

        //if (this.boxHelper) this.boxHelper.visible = false;
        //if (this.transformControl) this.transformControl.visible = false;
        if (this.perspectiveCameraHelper) this.perspectiveCameraHelper.visible = false;

        const x = this.sceneManager.screenWidth - this.debugCameraScreenWidth;
        renderer.clearDepth();
        renderer.setScissorTest(true);
        renderer.setScissor(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight)
        renderer.setViewport(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight);
        renderer.render(this.sceneManager.scene, this.perspectiveCamera);
        renderer.setScissorTest(false);
        renderer.setViewport(originalViewport);

        //if (this.boxHelper) this.boxHelper.visible = boxHelperVisible;
        //if (this.transformControl) this.transformControl.visible = transformControlVisible;
        if (this.perspectiveCameraHelper) this.perspectiveCameraHelper.visible = perspectiveCameraHelperVisible;

    }

    resize(): void {
        this.debugCameraScreenWidth = this.sceneManager.screenWidth / this.SCREEN_WIDTH_ASPECT_RATIO;
        this.debugCameraScreenHeight = this.sceneManager.screenHeight / this.SCREEN_HEIGHT_ASPECT_RATIO;
        this.perspectiveCamera.aspect = this.debugCameraScreenWidth / this.debugCameraScreenHeight;
        this.perspectiveCamera.updateProjectionMatrix();
    }

    private initializeCameraHelper() {
        console.log("initializeCameraHelper");
        this.perspectiveCamera = new THREE.PerspectiveCamera(60, this.debugCameraScreenWidth / this.debugCameraScreenHeight, 1, 150);
        this.perspectiveCameraHelper = new THREE.CameraHelper(this.perspectiveCamera);
        this.sceneManager.scene.add(this.perspectiveCameraHelper)

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
            this.sceneManager.scene.add(this.cameraMesh);

            this.sceneManager.forceUpdateValues();
            //this.setCameraValues(this.settingsValue.threedCameraSettings, this.cameraMesh);
        });
    }

    getPerspectiveCamera(): THREE.PerspectiveCamera {
        return this.perspectiveCamera;
    }
}