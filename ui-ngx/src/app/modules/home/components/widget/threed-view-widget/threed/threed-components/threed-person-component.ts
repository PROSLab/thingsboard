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
import * as PF from "pathfinding";
import { ThreedBaseComponent } from "./threed-base-component";
import { ThreedNavMeshComponent } from "./threed-nav-mesh-component";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { ThreedUtils } from "../threed-utils";
import { ThreedGameObjectComponent } from "./threed-gameobject-component";
import { ThreedRigidbodyComponent } from "./threed-rigidbody-component";
import { ThreedAnimatorComponent } from "./threed-animator-component";

export class ThreedPersonComponent extends ThreedGameObjectComponent {

    private readonly navMesh: ThreedNavMeshComponent;
    private readonly finder: PF.AStarFinder = new PF.AStarFinder();
    private path: number[][];
    private previousPath?: THREE.Object3D;
    private alerted = false;
    private underDesk = false;
    private deskFound?: THREE.Object3D;

    private rigidbody: ThreedRigidbodyComponent;
    private animator: ThreedAnimatorComponent;

    constructor(navMesh: ThreedNavMeshComponent, gltf: GLTF) {
        super(gltf);

        this.navMesh = navMesh;
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.addModel();
        this.sceneManager.add(this.rigidbody, true);
        this.sceneManager.add(this.animator, true);
    }

    tick(): void {
        super.tick();

        this.updatePosition();
    }

    private updatePosition() {
        if (!this.path || !this.deskFound || this.underDesk) return;

        if (this.path.length == 0 && this.deskFound) {
            this.underDesk = true;
            this.animator.stop("Walking");
            this.animator.play("Laying");
            const deskPosition = this.deskFound.position.clone();
            deskPosition.x += this.deskFound.userData.pirPosition[0];
            deskPosition.z += this.deskFound.userData.pirPosition[2];
            this.mesh.position.copy(deskPosition);
            return;
        }

        if (!this.animator.isPlaying("Walking"))
            this.animator.play("Walking");

        const first = this.path.shift();
        const pos = this.navMesh.getPostionFromGridCoords(first[0], first[1]);
        this.mesh.lookAt(pos);
        this.mesh.position.set(pos.x, 0, pos.z);
    }

    private addModel() {
        const humanoidPhysicBody = new CANNON.Body({ isTrigger: true });
        humanoidPhysicBody.addShape(new CANNON.Box(new CANNON.Vec3(0.15, 0.85, 0.15)), new CANNON.Vec3(0, 0.85, 0));
        this.rigidbody = new ThreedRigidbodyComponent({ mesh: this, physicBody: humanoidPhysicBody, handleVisuals: false });
        this.animator = new ThreedAnimatorComponent(this, ...this.clonedGLTF.animations);

        // TODO
        // this.subscriptions.push(humanoidRigidbody.onBeginCollision.subscribe(o => this.processCollisionEvent(o, 'begin')));
        // this.subscriptions.push(humanoidRigidbody.onEndCollision.subscribe(o => this.processCollisionEvent(o, 'end')));
    }

    public earthquakeAlert(magnitude: number, desks: THREE.Object3D[]) {
        if (this.alerted) return;

        let index = 0;
        let entrance = 0;
        while (index < desks.length && !this.deskFound) {
            const desk = desks[index];
            const deskEntrance = desk.position.clone();
            const sphereMaterial = new THREE.MeshBasicMaterial({ color: index == 0 ? 0xff0000 : 0x00ff00 });

            if (entrance == 0) {
                deskEntrance.x += desk.userData.entrance1[0];
                deskEntrance.y = 0;
                deskEntrance.z += desk.userData.entrance1[2];
                entrance++;
            }
            else {
                deskEntrance.x += desk.userData.entrance2[0];
                deskEntrance.y = 0;
                deskEntrance.z += desk.userData.entrance2[2];
                
                index++;
                entrance = 0;
            }

            // debug positions!
            const sphereGeometry = new THREE.SphereGeometry(0.1);
            const ball = new THREE.Mesh(sphereGeometry, sphereMaterial);
            ball.position.copy(deskEntrance);
            this.sceneManager.scene.add(ball);


            if(this.findPathToDesk(this.mesh.position, deskEntrance))
                this.deskFound = desk;
        }

        this.alerted = true;
    }

    public findPathToDesk(start: THREE.Vector3, end: THREE.Vector3): boolean {
        const startCoords = this.navMesh.getGridCoordsFromPosition(start);
        const endCoords = this.navMesh.getGridCoordsFromPosition(end);

        // Find the path using Pathfinding.js
        this.path = this.finder.findPath(
            startCoords.x, startCoords.y,
            endCoords.x, endCoords.y,
            this.navMesh.getGrid(true).clone()
        );
        console.log(this.path);

        this.visualizePath();

        return this.path?.length > 0;
    }

    private visualizePath() {
        const points = [];
        this.path.forEach((point) => {
            const pos = this.navMesh.getPostionFromGridCoords(point[0], point[1]);
            points.push(new THREE.Vector3(pos.x, 1, pos.z));
        });
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff });
        const pathObject = new THREE.Line(pathGeometry, pathMaterial);
        if (this.previousPath) this.sceneManager.scene.remove(this.previousPath);

        this.previousPath = pathObject;
        this.sceneManager.scene.add(this.previousPath);
    }
}