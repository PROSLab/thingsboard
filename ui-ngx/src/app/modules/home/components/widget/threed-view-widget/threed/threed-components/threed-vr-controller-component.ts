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
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedWebRenderer } from '../threed-managers/threed-web-renderer';
import { ThreedBaseComponent } from "./threed-base-component";

export class ThreedVrControllerComponent extends ThreedBaseComponent {

    private readonly gravity = 9.8;
    private readonly mass = 30;
    private readonly speed = 200;

    private controller: THREE.XRTargetRaySpace;
    private controllerGrip: THREE.XRGripSpace;

    private velocity = new THREE.Vector3();
    private direction = new THREE.Vector3();
    private raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);
    private tempMatrix = new THREE.Matrix4();

    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private canJump = false;

    private prevTime = performance.now();

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        const renderer = this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer();
        this.controller = renderer.xr.getController(0);
        this.controller.addEventListener('selectstart', event => this.onSelectStart(event));
        this.controller.addEventListener('selectend', event => this.onSelectEnd(event));
        this.controller.addEventListener('connected', event => this.buildController(event));
        this.controller.addEventListener('disconnected', function () { this.remove(this.children[0]); });
        this.sceneManager.scene.add(this.controller);

        const controllerModelFactory = new XRControllerModelFactory();
        this.controllerGrip = renderer.xr.getControllerGrip(0);
        const controllerGripModel = controllerModelFactory.createControllerModel(this.controllerGrip);
        controllerGripModel.scale.multiplyScalar(5);
        this.controllerGrip.add(controllerGripModel);
        this.sceneManager.scene.add(this.controllerGrip);
    }

    private onSelectStart(event: THREE.Event & { type: "selectstart"; } & { target: THREE.XRTargetRaySpace; }) {
        this.controller.userData.isSelecting = true;
        this.moveForward = true;
    }
    private onSelectEnd(event: THREE.Event & { type: "selectend"; } & { target: THREE.XRTargetRaySpace; }) {
        this.controller.userData.isSelecting = false;
        this.moveForward = false;
    }

    private buildController(event: any) {

        let geometry: THREE.BufferGeometry;
        let material: THREE.Material;
        switch (event.data.targetRayMode) {
            case 'tracked-pointer':
                geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 1], 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
                material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });
                this.controller.add(new THREE.Line(geometry, material));
                break;

            case 'gaze':
                geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, - 1);
                material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
                this.controller.add(new THREE.Mesh(geometry, material));
                break;
        }
    }

    tick(): void {
        if (!this.sceneManager.vrActive) {
            return;
        }

        console.log(this.controllerGrip.position)
        const time = performance.now();

        if (this.controller) {

            this.tempMatrix.identity().extractRotation(this.controller.matrixWorld);

            this.raycaster.ray.origin.setFromMatrixPosition(this.controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

            const intersections = this.raycaster.intersectObjects(this.sceneManager.scene.children, false);
            const onObject = intersections.length > 0;
            const delta = (time - this.prevTime) / 1000;

            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;
            this.velocity.y -= this.gravity * this.mass * delta; // 100.0 = mass

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize(); // this ensures consistent movements in all directions

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.speed * delta;

            if (onObject === true) {
                this.velocity.y = Math.max(0, this.velocity.y);
                this.canJump = true;
            }

            const cameraDolly = this.sceneManager.camera.parent;
            const quaternion = cameraDolly.quaternion.clone();
            this.sceneManager.camera.getWorldQuaternion(cameraDolly.quaternion);
            cameraDolly.translateZ(this.velocity.z * delta);
            cameraDolly.quaternion.copy(quaternion);

            cameraDolly.position.y += (this.velocity.y * delta); // new behavior
            if (cameraDolly.position.y < 10) {
                this.velocity.y = 0;
                cameraDolly.position.y = 10;

                this.canJump = true;
            }
        }

        this.prevTime = time;
    }
}