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
import * as CANNON from 'cannon-es';
import { IThreedPhysic } from "../threed-components/ithreed-physic";
import { IThreedSceneManager } from './ithreed-scene-manager';
import { IThreedPhysicObject } from '../threed-components/ithreed-physic-object';

export class ThreedPhysicManager implements IThreedPhysic {

    public readonly world: CANNON.World;

    private readonly sceneManager: IThreedSceneManager;
    private readonly clock = new THREE.Clock();
    public components: IThreedPhysicObject[] = [];

    constructor(sceneManager: IThreedSceneManager) {
        this.sceneManager = sceneManager;
        this.world = new CANNON.World();
        this.world.gravity.set(0, 0, 0);

        this.world.addEventListener('beginContact', (event) => this.onBeginContact(event));
        this.world.addEventListener('endContact', (event) => this.onEndContact(event));
    }

    private onBeginContact(event: CANNON.Constraint) {
        if (this.components.length <= 1) return;

        let componentA: IThreedPhysicObject | undefined;
        let componentB: IThreedPhysicObject | undefined;
        for (const component of this.components) {
            if (event.bodyA.id == component.physicBody.id) {
                componentA = component;
            } else if (event.bodyB.id == component.physicBody.id) {
                componentB = component;
            }
            if (componentA && componentB) break;
        }

        componentA?.onBeginCollision.emit({ event, object: componentB });
        componentB?.onBeginCollision.emit({ event, object: componentA });
    }

    private onEndContact(event: CANNON.Constraint) {
        if (this.components.length <= 1) return;

        let componentA: IThreedPhysicObject | undefined;
        let componentB: IThreedPhysicObject | undefined;
        for (const component of this.components) {
            if (event.bodyA.id == component.physicBody.id) {
                componentA = component;
            } else if (event.bodyB.id == component.physicBody.id) {
                componentB = component;
            }

            if (componentA && componentB) break;
        }

        componentA?.onEndCollision.emit({ event, object: componentB });
        componentB?.onEndCollision.emit({ event, object: componentA });
    }

    public addPhysic(component: IThreedPhysicObject): void {
        this.components.push(component);
        this.world.addBody(component.physicBody);
    }

    public removePhysic(component: IThreedPhysicObject): void {
        for (let i = 0; i < this.components.length; i++) {
            const c = this.components[i];
            if (c == component) {
                this.world.removeBody(component.physicBody);
                this.components.splice(i, 1);
                return;
            }
        }
    }

    public setVisualiseColliders(visualiseBodies: boolean): void {
        this.components.forEach(c => c.setVisualiseColliders(visualiseBodies));
    }

    beforeUpdatePhysics(): void {
        this.components.forEach(c => c.beforeUpdatePhysics());
    }

    updatePhysics(): void {
        this.beforeUpdatePhysics();
        //const delta = this.clock.getDelta();
        this.world.fixedStep();
        //this.world.step(delta);
        this.components.forEach(c => c.updatePhysics());
    }

    updateVisuals(): void {
        this.components.forEach(c => c.updateVisuals());
    }


}