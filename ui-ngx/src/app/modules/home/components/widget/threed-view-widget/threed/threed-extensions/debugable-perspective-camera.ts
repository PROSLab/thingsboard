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
import { GIZMOS_LAYER } from "../threed-constants";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedWebRenderer } from "../threed-managers/threed-web-renderer";

export class DebugablePerspectiveCamera extends PerspectiveCamera {

    private sceneManager: IThreedSceneManager;
    private renderer: THREE.WebGLRenderer;
    private cameraHelper?: THREE.CameraHelper;

    private debugCameraScreenWidth: number = 1;
    private debugCameraScreenHeight: number = 1;
    private cameraPreviewScale: number = 4;

    constructor(sceneManager: IThreedSceneManager, cameraHelper: boolean = true, cameraPreviewScale = 4, fov?: number, aspect?: number, near?: number, far?: number) {
        super(fov, aspect, near, far);

        this.sceneManager = sceneManager;
        this.cameraPreviewScale = cameraPreviewScale;
        this.renderer = sceneManager.getTRenderer(ThreedWebRenderer).getRenderer();
        if (cameraHelper) {
            this.cameraHelper = new THREE.CameraHelper(this);
            this.cameraHelper.layers.set(GIZMOS_LAYER);
        }
        this.onResize();
    }

    
    public onResize(): void {
        this.debugCameraScreenWidth = this.sceneManager.screenWidth / this.cameraPreviewScale;
        this.debugCameraScreenHeight = this.sceneManager.screenHeight / this.cameraPreviewScale;
        this.aspect = this.debugCameraScreenWidth / this.debugCameraScreenHeight;
        this.updateProjectionMatrix();
    }

    public preview() {
        const originalViewport = this.renderer.getViewport(new THREE.Vector4());
        const perspectiveCameraHelperVisible = this.cameraHelper?.visible || false;

        if (this.cameraHelper) this.cameraHelper.visible = false;

        const x = this.sceneManager.screenWidth - this.debugCameraScreenWidth;
        this.renderer.clearDepth();
        this.renderer.setScissorTest(true);
        this.renderer.setScissor(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight)
        this.renderer.setViewport(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight);
        this.renderer.render(this.sceneManager.scene, this);
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(originalViewport);

        if (this.cameraHelper) this.cameraHelper.visible = perspectiveCameraHelperVisible;
    }
}