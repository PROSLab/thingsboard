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
        if (!this.path || this.underDesk) return;

        if(this.path.length == 0) {
            this.underDesk = true;
            this.animator.stop("Armature|mixamo.com|Layer0");
            return;
        }

        if(!this.animator.isPlaying("Armature|mixamo.com|Layer0"))
            this.animator.play("Armature|mixamo.com|Layer0");

        const first = this.path.shift();
        const pos = this.navMesh.getPostionFromGridCoords(first[0], first[1]);
        this.mesh.lookAt(pos);
        this.mesh.position.set(pos.x, 0, pos.z);
    }

    private addModel() {
        const x = 2;
        const z = -3;
        this.mesh.position.set(x, 0, z);
        const humanoidPhysicBody = new CANNON.Body({ isTrigger: true });
        humanoidPhysicBody.addShape(new CANNON.Box(new CANNON.Vec3(0.15, 0.85, 0.15)), new CANNON.Vec3(0, 0.85, 0));
        this.rigidbody = new ThreedRigidbodyComponent({ mesh: this, physicBody: humanoidPhysicBody, handleVisuals: false });
        this.animator = new ThreedAnimatorComponent(this, ...this.clonedGLTF.animations);

        // TODO
        // this.subscriptions.push(humanoidRigidbody.onBeginCollision.subscribe(o => this.processCollisionEvent(o, 'begin')));
        // this.subscriptions.push(humanoidRigidbody.onEndCollision.subscribe(o => this.processCollisionEvent(o, 'end')));
    }

    public earthquakeAlert(magnitude: number) {
        if (this.alerted) return;

        if (magnitude > 1) {
            this.findPathToDesk(this.mesh.position, new THREE.Vector3(-6, 0, 0));
            this.alerted = true;
        }
    }

    public findPathToDesk(start: THREE.Vector3, end: THREE.Vector3) {
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
    }

    private visualizePath() {
        //const boxSize = this.navMesh.box.getSize(new THREE.Vector3());
        const cellSize = this.navMesh.cellSize
        const sizeX = this.navMesh.sizeX
        const sizeZ = this.navMesh.sizeZ

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