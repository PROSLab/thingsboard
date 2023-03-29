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
import { ThreedAbstractScene } from './threed-abstract-scene';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class ThreedFpsScene<S, C> extends ThreedAbstractScene<S, C> {

    private readonly gravity = 9.8;
    private readonly mass = 30;
    private readonly speed = 400;

    protected controls?: PointerLockControls;

    private velocity = new THREE.Vector3();
    private direction = new THREE.Vector3();
    private raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);

    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private canJump = false;
    private pointerLocked = false;

    private prevTime = performance.now();

    public onPointerLockedChanged: EventEmitter<boolean> = new EventEmitter();

    constructor(canvas?: ElementRef, configs?: C) {
        super(canvas, configs)
    }

    protected override initialize(canvas?: ElementRef<any>): void {
        super.initialize(canvas);

        this.active = false;
        this.initializeControls();
    }

    private initializeControls() {
        const this_ = this;

        // controls
        this.controls = new PointerLockControls(this.camera, document.body);
        this.controls.addEventListener('lock', function () {
            this_.pointerLocked = true;
            this_.active = true;
            this_.onPointerLockedChanged.emit(this_.pointerLocked);
        });
        this.controls.addEventListener('unlock', function () {
            this_.pointerLocked = false;
            this_.active = false;
            this_.onPointerLockedChanged.emit(this_.pointerLocked);
        });
        this.scene.add(this.controls.getObject());
    }

    protected tick(): void {
        const time = performance.now();

        if (this.controls && this.controls.isLocked === true) {

            this.raycaster.ray.origin.copy(this.controls.getObject().position);
            //this.raycaster.ray.origin.y -= 10;

            const intersections = this.raycaster.intersectObjects(this.objects, false);
            const onObject = intersections.length > 0;
            const delta = (time - this.prevTime) / 1000;

            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.velocity.y -= this.gravity * this.mass * delta; // 100.0 = mass

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize(); // this ensures consistent movements in all directions

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.speed * delta;
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * this.speed * delta;

            if (onObject === true) {

                this.velocity.y = Math.max(0, this.velocity.y);
                this.canJump = true;

            }

            this.controls.moveRight(- this.velocity.x * delta);
            this.controls.moveForward(- this.velocity.z * delta);

            this.controls.getObject().position.y += (this.velocity.y * delta); // new behavior

            if (this.controls.getObject().position.y < 10) {

                this.velocity.y = 0;
                this.controls.getObject().position.y = 10;

                this.canJump = true;

            }
        }

        this.prevTime = time;
    }

    public lockControls(): void {
        this.controls?.lock();
    }

    public override onKeyUp(event: KeyboardEvent): void {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;

            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;

            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    public override onKeyDown(event: KeyboardEvent): void {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;

            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;

            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;

            case 'Space':
                if (this.canJump === true) this.velocity.y += 3 * this.mass;
                this.canJump = false;
                break;
        }
    }
}