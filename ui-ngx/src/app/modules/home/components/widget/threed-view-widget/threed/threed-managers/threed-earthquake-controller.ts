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
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';

export class ThreedEarthquakeController {
    private readonly world: CANNON.World;

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
    private step = 0;
    private elapsedTime: number = 0;
    private currentMagnitude: { value: number } = { value: 0 };

    private started = false;
    private tween?: TWEEN.Tween;

    public get isInfinite(): boolean {
        return this.duration.peakTime <= 0;
    }

    constructor(magnitude: number, world: CANNON.World, options: {
        maxSteps?: number,
        magnitudeCurve?: any,
        duration?: {
            timeToReachPeak: number,
            peakTime: number,
            timeToEnd: number
        }
    } = {}) {
        this.world = world;
        this.magnitude = magnitude;
        this.maxSteps = options.maxSteps ?? this.maxSteps;
        this.magnitudeCurve = options.magnitudeCurve ?? this.magnitudeCurve;
        this.duration = options.duration ?? this.duration;
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
    }

    public update(delta: number) {
        if (this.started) {
            this.elapsedTime += delta;
            this.applyEarthquakeForce();
        }
    }

    private applyEarthquakeForce() {
        if (this.magnitude <= 0) {
            for (const body of this.world.bodies)
                body.velocity.set(0, 0, 0);
        } else {

            // Apply a global force to all objects in the world
            let earthquakeForce: CANNON.Vec3;
            if (this.step < this.maxSteps / 2) {
                earthquakeForce = new CANNON.Vec3(Math.random() - 0.5, 0, Math.random() - 0.5).scale(this.currentMagnitude.value);
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

            for (const body of this.world.bodies) {
                body.velocity.set(earthquakeForce.x, 0, earthquakeForce.z);
            }
        }
    }
}