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

import * as THREE from 'three';
import { PerspectiveCamera } from "three";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedWebRenderer } from "../threed-managers/threed-web-renderer";

export class DebugablePerspectiveCamera {

    public camera: PerspectiveCamera;
    private sceneManager: IThreedSceneManager;
    private renderer: THREE.WebGLRenderer;
    private cameraHelper: THREE.CameraHelper;

    private debugCameraScreenWidth: number = 1;
    private debugCameraScreenHeight: number = 1;
    private cameraPreviewScale: number = 4;

    constructor(sceneManager: IThreedSceneManager, cameraPreviewScale = 4, camera?: PerspectiveCamera) {
        this.sceneManager = sceneManager;
        this.cameraPreviewScale = cameraPreviewScale;
        this.renderer = sceneManager.getTRenderer(ThreedWebRenderer).getRenderer();
        this.camera = camera || new THREE.PerspectiveCamera(60, 1, 0.1, 1);
        this.cameraHelper = new THREE.CameraHelper(this.camera);

        this.sceneManager.scene.add(this.cameraHelper);

        this.onResize();
    }

    public onResize(): void {
        this.debugCameraScreenWidth = this.sceneManager.screenWidth / this.cameraPreviewScale;
        this.debugCameraScreenHeight = this.sceneManager.screenHeight / this.cameraPreviewScale;
        this.camera.aspect = 1//this.debugCameraScreenWidth / this.debugCameraScreenHeight;
        this.camera.updateProjectionMatrix();
    }

    public preview() {
        this.onResize();

        const originalViewport = this.renderer.getViewport(new THREE.Vector4());
        this.cameraHelper.visible = false;

        const x = this.sceneManager.screenWidth - this.debugCameraScreenWidth;
        this.renderer.clearDepth();
        this.renderer.setScissorTest(true);
        this.renderer.setScissor(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight)
        this.renderer.setViewport(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight);
        this.renderer.render(this.sceneManager.scene, this.camera);
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(originalViewport);

        this.cameraHelper.visible = true;
        this.cameraHelper.update();
    }
}