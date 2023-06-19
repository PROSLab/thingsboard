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

import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { IThreedSceneManager } from './ithreed-scene-manager';
import { ThreedGenericSceneManager } from './threed-generic-scene-manager';
import { ThreedRigidbodyComponent } from '../threed-components/threed-rigidbody-component';
import { ThreedGameObjectComponent } from '../threed-components/threed-gameobject-component';

export class ThreedEarthquakeController {
    private readonly scene: ThreedGenericSceneManager;

    private readonly maxSteps: number = 10;
    private readonly magnitudeCurve: any = TWEEN.Easing.Quadratic.In;
    private magnitude: number = 1;
    private readonly duration: {
        timeToReachPeak: number,
        peakTime: number,
        timeToEnd: number
    } = {
            timeToReachPeak: 0.2,
            peakTime: 2,
            timeToEnd: 1,
        };

    private forces: CANNON.Vec3[] = [];
    private history: CANNON.Vec3[] = [];
    private step = 0;
    private elapsedTime: number = 0;
    private currentMagnitude: { value: number } = { value: 0 };

    private earthquakePlaneBody: CANNON.Body;

    private started = false;
    private tween?: TWEEN.Tween;


    public get world(): CANNON.World {
        return this.scene.physicManager.world;
    }

    public get isInfinite(): boolean {
        return this.duration.peakTime <= 0;
    }

    constructor(magnitude: number, scene: ThreedGenericSceneManager, options: {
        maxSteps?: number,
        magnitudeCurve?: any,
        duration?: {
            timeToReachPeak: number,
            peakTime: number,
            timeToEnd: number
        },
        dynamicGroundBody?: CANNON.Body
    } = {}) {
        this.scene = scene;
        this.magnitude = magnitude;
        this.maxSteps = options.maxSteps ?? this.maxSteps;
        this.magnitudeCurve = options.magnitudeCurve ?? this.magnitudeCurve;
        this.duration = options.duration ?? this.duration;
        this.earthquakePlaneBody = options.dynamicGroundBody;

        if (!this.earthquakePlaneBody)
            this.generatePlane();
    }

    public start() {
        if (this.started) return;

        console.log(this.duration);
        this.started = true;
        this.tween = new TWEEN.Tween(this.currentMagnitude)
            .to({ value: this.magnitude }, this.duration.timeToReachPeak * 1000)
            .easing(this.magnitudeCurve)
            .onUpdate(v => console.log("timeToReachPeak"))
            .onComplete(() => {
                if (this.isInfinite) {
                    this.tween = undefined;
                    return;
                }

                this.tween = new TWEEN.Tween(this.currentMagnitude)
                    .to({ value: this.magnitude }, this.duration.peakTime * 1000)
                    .easing(this.magnitudeCurve)
                    .onUpdate(v => console.log("peakTime"))
                    .onComplete(() => {
                        this.tween = new TWEEN.Tween(this.currentMagnitude)
                            .to({ value: 0 }, this.duration.timeToEnd * 1000)
                            .easing(this.magnitudeCurve)
                            .onUpdate(v => console.log("timeToEnd"))
                            .onComplete(() => {
                                this.tween = undefined;
                                this.reset();
                            })
                            .start()
                    })
                    .start();
            })
            .start();
    }

    public restart() {
        this.reset();
        this.start();
    }

    private reset(): void {
        this.elapsedTime = 0;
        this.step = 0;
        this.currentMagnitude = { value: 0 };
        this.forces = [];
        this.started = false;
        if (this.tween) this.tween.stop();

        for (const body of this.world.bodies)
            body.velocity.set(0, 0, 0);

        console.log([...this.history]);
        this.history = [];
    }

    public update(delta: number) {
        if (this.started) {
            this.elapsedTime += delta;
            this.applyEarthquakeForce();
        }
    }

    private randomRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }

    private applyEarthquakeForce() {
        if (this.magnitude <= 0) {
            this.earthquakePlaneBody.velocity.set(0, 0, 0);
        } else {

            // Apply a global force to all objects in the world
            let earthquakeForce: CANNON.Vec3;
            if (this.step < this.maxSteps / 2) {
                const x = Math.random() - 0.5;
                const z = Math.random() - 0.5;
                //const x = this.randomRange(0.1, 0.5) * (Math.random() < 0.5 ? 1 : -1);
                //const z = this.randomRange(0.1, 0.5) * (Math.random() < 0.5 ? 1 : -1);
                earthquakeForce = new CANNON.Vec3(x, 0, z).scale(this.currentMagnitude.value);
                this.forces.push(earthquakeForce.clone().negate());
            }
            else if (this.step < this.maxSteps) {
                earthquakeForce = this.forces.pop();
            }
            this.step++;
            if (this.step == this.maxSteps) {
                this.forces = [];
                this.step = 0;
            }

            /*
            const finalForce = earthquakeForce.scale(300000);
            this.history.push(finalForce);
            this.earthquakePlaneBody.applyLocalImpulse(earthquakeForce);
            this.earthquakePlaneBody.applyLocalForce(finalForce);
            */

            const finalForce = earthquakeForce.scale(30000);
            this.history.push(finalForce);
            this.earthquakePlaneBody.applyLocalImpulse(finalForce);

        }
    }

    private generatePlane() {
        this.generateGroundIfNotExists();

        const earthGroundShape = new CANNON.Box(new CANNON.Vec3(50, .01, 50));
        const earthGroundMaterial = new CANNON.Material('earthquake_plane');
        earthGroundMaterial.friction = 1;
        const earthGroundBody = new CANNON.Body({ mass: 1000, material: earthGroundMaterial, })
        earthGroundBody.addShape(earthGroundShape)
        earthGroundBody.position.set(0, .1, 0);
        //earthGroundBody.allowSleep = true;
        //earthGroundBody.sleepSpeedLimit = 1.0;
        //earthGroundBody.sleepTimeLimit = 1.0;
        this.earthquakePlaneBody = earthGroundBody;

        this.scene.add(new ThreedRigidbodyComponent({ physicBody: earthGroundBody, handleVisuals: true, debugColor: 0xffffff }), true);
    }

    private generateGroundIfNotExists() {

        const planeGound = this.world.bodies.find(b => b.mass == 0 && (b.shapes.find(s => s.type == CANNON.SHAPE_TYPES.PLANE) != undefined && b.material?.name == "ground"))
        if (planeGound) return;

        const groundShape = new CANNON.Plane();
        const groundMaterial = new CANNON.Material('ground');
        groundMaterial.friction = 0.5;
        const groundBody = new CANNON.Body({ type: CANNON.BODY_TYPES.STATIC, material: groundMaterial })
       // groundBody.allowSleep = true;
       // groundBody.sleepSpeedLimit = 1.0;
       // groundBody.sleepTimeLimit = 1.0;
        groundBody.addShape(groundShape)
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
        const material = new THREE.MeshBasicMaterial({ color: 0 });
        const geometry = new THREE.PlaneGeometry(200, 200);
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        const groundGameObject = new ThreedGameObjectComponent(ground);
        const gorundRigidbody = new ThreedRigidbodyComponent({ mesh: groundGameObject, physicBody: groundBody, handleVisuals: true });
        this.scene.add(groundGameObject, true);
        this.scene.add(gorundRigidbody, true);
    }

    public getFloorHeight(): number {
        return this.earthquakePlaneBody.position.y;
    }
}