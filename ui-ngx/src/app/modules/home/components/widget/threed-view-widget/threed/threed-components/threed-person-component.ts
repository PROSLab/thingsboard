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
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { ThreedBaseComponent } from "./threed-base-component";
import { ThreedNavMeshComponent } from "./threed-nav-mesh-component";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { ThreedUtils } from "../threed-utils";
import { ThreedGameObjectComponent } from "./threed-gameobject-component";
import { ThreedRigidbodyComponent } from "./threed-rigidbody-component";
import { ThreedAnimatorComponent } from "./threed-animator-component";
import { IThreedPhysicObject } from "./ithreed-physic-object";
import { IThreedPerson } from "./ithreed-person";

const OCCUPIED_BY = "occupiedBy";

export class ThreedPersonComponent extends ThreedGameObjectComponent implements IThreedPerson {

    private readonly navMesh: ThreedNavMeshComponent;
    private readonly finder: PF.AStarFinder = new PF.AStarFinder();

    private path: number[][];
    private clonedPath: number[][];
    private previousPath?: THREE.Object3D;
    private alerted = false;
    private underDesk = false;
    private deskFound?: THREE.Object3D;

    private tween: TWEEN.Tween;
    // velocity in meters/seconds
    private velocity = 0.5;

    public rigidbody: ThreedRigidbodyComponent;
    public animator: ThreedAnimatorComponent;
    public debugMode: boolean = false;

    constructor(navMesh: ThreedNavMeshComponent, gltf: GLTF) {
        super(gltf);

        this.navMesh = navMesh;
    }

    public reset(position: THREE.Vector3) {
        this.path = undefined;
        this.alerted = false;
        this.underDesk = false;
        if (this.deskFound) {
            this.deskFound.userData[OCCUPIED_BY] = undefined;
        }
        this.deskFound = undefined;

        this.tween?.stop();
        this.tween = undefined;

        this.mesh.position.copy(position);
        this.animator.stop();
        this.animator.play("Idle");
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.addModel();
        this.sceneManager.add(this.rigidbody, true);
        this.sceneManager.add(this.animator, true);
    }

    tick(): void {
        super.tick();

        this.walkToDesk();
        this.updatePositionUnderDesk();
    }

    private walkToDesk() {
        if (!this.clonedPath || !this.deskFound || this.underDesk) return;

        if (this.clonedPath.length == 0 && this.deskFound) {
            this.underDesk = true;
            this.animator.stop();
            this.animator.play("Laying");
            return;
        }

        if (!this.animator.isPlaying("Walking")) {
            this.animator.stop();
            this.animator.play("Walking");
        }
        if (this.tween) return;

        const first = this.clonedPath.shift();
        const targetPosition = this.navMesh.getPostionFromGridCoords(first[0], first[1]).multiply(new THREE.Vector3(1, 0, 1));
        const time = this.velocity / this.navMesh.cellSize;
        this.mesh.lookAt(targetPosition);
        this.tween = new TWEEN.Tween(this.mesh.position)
            .to(targetPosition, time)
            .onComplete(() => {
                this.tween = undefined;
                this.walkToDesk();
            })
            .start();
    }

    private updatePositionUnderDesk() {
        if (!this.underDesk || this.tween) return;

        const deskPosition = this.deskFound.position.clone();
        deskPosition.x += this.deskFound.userData.pirPosition[0];
        deskPosition.z += this.deskFound.userData.pirPosition[2];

        if (this.mesh.position.distanceTo(deskPosition) > 0.1) {
            this.animator.play("Crawling");
            this.tween = new TWEEN.Tween(this.mesh.position)
                .to(deskPosition, 500)
                .onComplete(() => {
                    this.animator.stop("Crawling");
                    this.tween = undefined;
                })
                .start();
        }
    }

    private addModel() {
        const humanoidPhysicBody = new CANNON.Body({ isTrigger: true });
        humanoidPhysicBody.addShape(new CANNON.Box(new CANNON.Vec3(0.15, 0.85, 0.15)), new CANNON.Vec3(0, 0.85, 0));
        this.rigidbody = new ThreedRigidbodyComponent({ mesh: this, physicBody: humanoidPhysicBody, handleVisuals: false });
        this.animator = new ThreedAnimatorComponent(this, ...this.clonedGLTF.animations);
        this.animator.play("Idle");
    }

    public earthquakeAlert(magnitude: number, desks: THREE.Object3D[]) {
        if (this.alerted || magnitude == 0) return;

        const sortedDeskByDistance = desks.sort((a, b) => a.position.distanceTo(this.mesh.position) - b.position.distanceTo(this.mesh.position));
        //console.log(sortedDeskByDistance.map(o => o.name));
        for (const desk of sortedDeskByDistance) {
            if (desk.userData[OCCUPIED_BY] != undefined) continue;
            const deskCoords = this.navMesh.getGridCoordsFromPosition(desk.position);
            const { x, y } = this.navMesh.findNearestWalkablePoint(deskCoords.x, deskCoords.y, 10);
            if (this.findPathToDesk(this.mesh.position, { x, y })) {
                this.deskFound = desk;
                desk.userData.occupiedBy = this;
                break;
            }
        }

        this.alerted = true;
    }

    public findPathToDesk(start: THREE.Vector3 | { x: number, y: number }, end: THREE.Vector3 | { x: number, y: number }): boolean {

        let startCoords: { x: number, y: number };
        let endCoords: { x: number, y: number };
        if (start instanceof THREE.Vector3) startCoords = this.navMesh.getGridCoordsFromPosition(start);
        else startCoords = start;
        if (end instanceof THREE.Vector3) endCoords = this.navMesh.getGridCoordsFromPosition(end);
        else endCoords = end;

        // Find the path using Pathfinding.js
        this.path = this.finder.findPath(
            startCoords.x, startCoords.y,
            endCoords.x, endCoords.y,
            this.navMesh.getGrid(true).clone()
        );
        this.clonedPath = [...this.path];

        this.visualisePath(this.debugMode);

        return this.path?.length > 0;
    }

    public setDebugMode(mode: boolean) {
        this.debugMode = mode;
        this.visualisePath(this.debugMode);
    }

    private visualisePath(visualise: boolean) {
        if (!visualise) {
            if (this.previousPath) this.sceneManager.scene.remove(this.previousPath);
            this.previousPath = undefined;
            return;
        }
        if (!this.path) return;

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