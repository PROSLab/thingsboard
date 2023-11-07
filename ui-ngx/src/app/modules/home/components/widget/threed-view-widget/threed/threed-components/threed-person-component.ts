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
import {Pir} from "@home/components/widget/lib/settings/threed/threed-scene-settings.component";

const OCCUPIED_BY = "occupiedBy";

export class ThreedPersonComponent extends ThreedGameObjectComponent implements IThreedPerson {

    private readonly navMesh: ThreedNavMeshComponent;
    private readonly finder: PF.AStarFinder = new PF.AStarFinder();

    private path: number[][];
    private clonedPath: number[][];
    private previousPath?: THREE.Object3D;
    private alerted = false;
    private pirUnderDesk = false;
    private deskPirFound?: Pir;

    private tween: TWEEN.Tween;
    // velocity in meters/seconds
    private velocity = THREE.MathUtils.randFloat(2, 4);

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
        this.pirUnderDesk = false;
        if (this.deskPirFound.isOccupied) {
            this.deskPirFound.isOccupied = false;
        }
        this.deskPirFound = undefined;

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
        if (!this.clonedPath || !this.deskPirFound || this.pirUnderDesk) return;

        if (this.clonedPath.length == 0 && this.deskPirFound) {
            this.pirUnderDesk = true;
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
        const time = this.navMesh.cellSize / this.velocity;
        this.mesh.lookAt(targetPosition);
        this.tween = new TWEEN.Tween(this.mesh.position)
            .to(targetPosition, time * 1000)
            .onComplete(() => {
                this.tween = undefined;
                this.walkToDesk();
            })
            .start();
    }

    private updatePositionUnderDesk() {
        if (!this.pirUnderDesk || this.tween) return;

        const deskPosition = this.deskPirFound.pirPosition.clone();
        //deskPosition.x += this.deskPirFound.pirPosition.x;
        deskPosition.y -= this.deskPirFound.pirPosition.y;

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

    public earthquakeAlert(magnitude: number, deskPirs: Pir[]) {
    if (this.alerted || magnitude <= 0.5) return;

    const sortedDeskByDistance = deskPirs.sort((a, b) => a.pirPosition.distanceTo(this.mesh.position) - b.pirPosition.distanceTo(this.mesh.position));
    
    for (const desk of sortedDeskByDistance) {
        if (desk.isOccupied == true) continue;
        const deskCoords = this.navMesh.getGridCoordsFromPosition(desk.pirPosition);
        const { x, y } = this.navMesh.findNearestWalkablePoint(deskCoords.x, deskCoords.y, 10);
        if (this.findPathToDesk(this.mesh.position, { x, y })) {
            this.deskPirFound = desk;
            desk.isOccupied = true;
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
