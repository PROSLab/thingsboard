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
import { EventEmitter } from '@angular/core';
import { VrUi } from '../threed-extensions/vr-ui';
import { IThreedMesh } from './ithreed-mesh';

export class ThreedVrControllerComponent extends ThreedBaseComponent implements IThreedMesh {

    private readonly gravity = 9.8;
    private readonly mass = 80;
    private readonly speed = 40;
    private readonly scaleFactor = 0.1;

    public controller: THREE.XRTargetRaySpace;
    private controllerGrip: THREE.XRGripSpace;
    private xr: THREE.WebXRManager;

    private velocity = new THREE.Vector3();
    private direction = new THREE.Vector3();
    private raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);
    private tempMatrix = new THREE.Matrix4();
    private textHelper: THREE.Group;

    private positionMode: 'standing' | 'crouch' | 'laying' = 'standing';
    private height = 1.7;

    private prevTime = performance.now();
    private lastBPressed = performance.now();
    private lastAPressed = performance.now();

    public line: THREE.Line;
    public canMove = true;
    public onSelectStartEvent = new EventEmitter();
    public onSelectEndEvent = new EventEmitter();

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
        //controllerGripModel.scale.multiplyScalar(5);
        this.controllerGrip.add(controllerGripModel);
        this.sceneManager.scene.add(this.controllerGrip);

        const s = this.sceneManager.onVRChange.subscribe(v => {
            if (v) this.onVRSessionStart();
            else this.onVRSessionEnd();
        });
        this.subscriptions.push(s);

        this.createVRControllerInputTextHelper();
    }

    private onSelectStart(event: THREE.Event & { type: "selectstart"; } & { target: THREE.XRTargetRaySpace; }) {
        this.controller.userData.isSelecting = true;
        // this.moveForward = true;
        this.onSelectStartEvent.emit();
    }
    private onSelectEnd(event: THREE.Event & { type: "selectend"; } & { target: THREE.XRTargetRaySpace; }) {
        this.controller.userData.isSelecting = false;
        // this.moveForward = false;
        this.onSelectEndEvent.emit();
    }

    private buildController(event: any) {

        let geometry: THREE.BufferGeometry;
        let material: THREE.Material;
        switch (event.data.targetRayMode) {
            case 'tracked-pointer':
                geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -10], 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute([1, 0, 0, 0, 0, 0], 3));
                material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });
                this.line = new THREE.Line(geometry, material);
                this.controller.add(this.line);
                break;

            case 'gaze':
                geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
                material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
                this.controller.add(new THREE.Mesh(geometry, material));
                break;
        }
    }

    private onVRSessionStart() {
        this.controller.visible = true;
        this.controllerGrip.visible = true;
        this.controller.parent = this.sceneManager.camera.parent;
        this.controllerGrip.parent = this.sceneManager.camera.parent;
        this.textHelper.parent = this.sceneManager.camera;
        this.displayVRControllerInputTextHelper(true);

        this.xr = this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer().xr;
    }
    private onVRSessionEnd() {
        this.controller.visible = false;
        this.controllerGrip.visible = false;
        this.controller.parent = null;
        this.controllerGrip.parent = null;
        this.textHelper.parent = null;
        this.displayVRControllerInputTextHelper(false);

        this.xr = undefined;
    }

    private createVRControllerInputTextHelper() {
        this.textHelper = VrUi.createPanelFromHtml("RIGHT CONTROLLER<br><br>Move: Joystick<br>Interact: Trigger<br>Crouch/Stand up: A<br><br>Open/Close Commands: B", {textSize:.25, margin:.5});
        this.textHelper.position.set(0, -1, -2);
        this.sceneManager.scene.add(this.textHelper);
        this.displayVRControllerInputTextHelper(false);
    }

    private displayVRControllerInputTextHelper(visible: boolean) {
        this.textHelper.visible = visible;
    }

    tick(): void {
        if (!this.sceneManager.vrActive || !this.xr)
            return

        this.move();

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
            this.velocity.y -= this.gravity * this.mass * delta * this.scaleFactor;

            this.velocity.z -= this.direction.z * this.speed * delta;
            this.velocity.x -= this.direction.x * this.speed * delta;

            if (onObject === true) {
                this.velocity.y = Math.max(0, this.velocity.y);
            }

            if (this.canMove) {
                const cameraDolly = this.sceneManager.camera.parent;
                const quaternion = cameraDolly.quaternion.clone();
                this.sceneManager.camera.getWorldQuaternion(cameraDolly.quaternion);
                let y = cameraDolly.position.y;
                if(y == 0) this.height = this.sceneManager.camera.position.y;

                if (this.positionMode == 'standing') y = 0;
                else if(this.positionMode == 'crouch') y = -this.height/2;
                else if(this.positionMode == 'laying') y = -this.height/4*3;

                cameraDolly.translateZ(-this.velocity.z * delta);
                cameraDolly.translateX(-this.velocity.x * delta);
                cameraDolly.position.setY(y);
                cameraDolly.quaternion.copy(quaternion);
            }
        }


        this.prevTime = time;
    }


    private move() {
        let handedness = "unknown";
        const session = this.xr.getSession();

        if (this.isIterable(session.inputSources)) {
            for (const source of session.inputSources) {
                if (source && source.handedness) {
                    handedness = source.handedness; //left or right controllers
                }
                if (!source.gamepad) continue;
                const data = {
                    handedness: handedness,
                    buttons: source.gamepad.buttons.map((b) => b.value),
                    axes: source.gamepad.axes.slice(0)
                };

                if (data.handedness == "right") {
                    if (data.axes.length >= 4) {
                        data.axes.splice(0, 2);
                        this.direction.x = data.axes[0];
                        this.direction.z = data.axes[1];
                    }
                    if (data.buttons.length >= 6) {
                        // A button pressed
                        const buttonA = data.buttons[4];
                        if (buttonA >= 1 && performance.now() - this.lastAPressed >= 500) {
                            if (this.positionMode == 'standing') {
                                this.positionMode = 'crouch';
                            } else if (this.positionMode == 'crouch') {
                                this.positionMode = 'laying';
                            } else {
                                this.positionMode = 'standing';
                            }
                            this.lastAPressed = performance.now();
                        }

                        // B button pressed
                        const buttonB = data.buttons[5];
                        if (buttonB >= 1 && performance.now() - this.lastBPressed >= 500) {
                            this.displayVRControllerInputTextHelper(!this.textHelper.visible);
                            this.lastBPressed = performance.now();
                        }
                    }

                    break;
                }
            }
        }
    }


    private isIterable(obj: any): boolean {  //function to check if object is iterable
        // checks for null and undefined
        if (obj == null) {
            return false;
        }
        return typeof obj[Symbol.iterator] === "function";
    }

    getMesh(): THREE.Object3D {
        return this.sceneManager.camera.parent;
    }
}