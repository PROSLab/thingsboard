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

import * as CANNON from "cannon-es";
import * as THREE from "three";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedGameObjectComponent } from "./threed-gameobject-component";
import { ThreedRigidbodyComponent } from "./threed-rigidbody-component";
import { threeToCannon } from "three-to-cannon";

export class ThreedGroupGameObjectComponent extends ThreedGameObjectComponent {

    private gameobjects: ThreedGameObjectComponent[] = [];
    private rigidbodies: ThreedRigidbodyComponent[] = [];

    constructor(mesh: THREE.Object3D) {
        super(mesh);
    }

    public initialize(sceneManager: IThreedSceneManager) {
        super.initialize(sceneManager);

        let previousContraints = new Map<string, CANNON.Body[]>();
        let previous;
        this.mesh.traverse(o => {
            if (o.userData.physicShape) {
                // create rigidbody for o

                const t = new THREE.Vector3();
                o.getWorldPosition(t);

                const gameobject = new ThreedGameObjectComponent(o, false);

                const result = threeToCannon(o as any, o.userData.physicShape);
                const { shape, offset, orientation } = result;
                const mass = o.userData.mass ?? 10;
                const pb = new CANNON.Body({ mass, material: new CANNON.Material({ restitution: 0, friction: 1 }), type: CANNON.BODY_TYPES.DYNAMIC, linearDamping: 0.1, angularDamping: 0.1 });               
                pb.addShape(shape, offset, orientation);
                pb.position.set(t.x, t.y, t.z);
                pb.allowSleep = true;


                const joints: CANNON.Constraint[] = [];
                if (o.userData.constraintLockTag != undefined) {
                    //pb.mass = 0;
                    const lockContraintName = o.userData.constraintLockTag;
                    let prevs = [];
                    if (previousContraints.has(lockContraintName)) {
                        prevs = previousContraints.get(lockContraintName);
                        prevs.forEach(p => {
                            joints.push(new CANNON.LockConstraint(pb, p));
                        })
                    }
                    prevs.push(pb);
                    previousContraints.set(lockContraintName, prevs);
                }

                /*
                if (o.name.includes("Muro")) {
                    if (previous) 
                        joints.push(new CANNON.LockConstraint(pb, previous));
                    previous = pb;
                }*/


                const rigidbody = new ThreedRigidbodyComponent({ mesh: gameobject, physicBody: pb, joints: joints });

                console.log(o.userData.physicShape, o.name, o.position, pb);


                this.gameobjects.push(gameobject);
                this.rigidbodies.push(rigidbody);

                this.sceneManager.add(gameobject, true);
                this.sceneManager.add(rigidbody, true);
            }
        });
    }
}