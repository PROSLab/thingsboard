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
import {TWEEN} from 'three/examples/jsm/libs/tween.module.min.js';
import {ThreedBaseComponent} from "./threed-base-component";
import {ThreedNavMeshComponent} from "./threed-nav-mesh-component";
import {IThreedSceneManager} from "../threed-managers/ithreed-scene-manager";
import {GLTF} from "three/examples/jsm/loaders/GLTFLoader";
import {ThreedUtils} from "../threed-utils";
import {ThreedGameObjectComponent} from "./threed-gameobject-component";
import {ThreedRigidbodyComponent} from "./threed-rigidbody-component";
import {ThreedAnimatorComponent} from "./threed-animator-component";
import {IThreedPhysicObject} from "./ithreed-physic-object";
import {IThreedPerson} from "./ithreed-person";
import {IOT_Pir} from "@home/components/widget/lib/settings/threed/threed-scene-settings.component";

const OCCUPIED_BY = "occupiedBy";

export class ThreedPersonComponent extends ThreedGameObjectComponent implements IThreedPerson {

  private readonly navMesh: ThreedNavMeshComponent;
  private readonly finder: PF.AStarFinder = new PF.AStarFinder();
  private static readonly CRAWLING_TWEEN_DURATION = 500;

  private path: number[][];
  private clonedPath: number[][];
  private previousPath?: THREE.Object3D;
  private alerted = false;
  private pirFound = false;
  private iotPir?: IOT_Pir;

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
    this.pirFound = false;
    if (this.iotPir.isOccupied) {
      this.iotPir.isOccupied = false;
    }
    this.iotPir = undefined;

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
    if (!this.clonedPath || !this.iotPir || this.pirFound) {
      return;
    }

    if (this.clonedPath.length === 0 && this.iotPir) {
      this.pirFound = true;
      this.animator.stop();
      this.animator.play("Laying");
      return;
    }

    if (!this.animator.isPlaying("Walking")) {
      this.animator.stop();
      this.animator.play("Walking");
      return;
    }

    if (this.tween) {
      return;
    }

    const nextGridCoords  = this.clonedPath.shift();
    const targetPosition = this.navMesh.getPostionFromGridCoords(nextGridCoords [0], nextGridCoords [1]).multiply(new THREE.Vector3(1, 0, 1));
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
    if (!this.pirFound || this.tween) {
      return;
    }

    const pirPosition = this.iotPir.pirPosition.clone();
    //pirPosition.x += this.iotPir.pirPosition.x;
    pirPosition.y -= this.iotPir.pirPosition.y;

    if (this.mesh.position.distanceTo(pirPosition) <= 0.1) {
      return;
    }

    this.animator.play("Crawling");
    this.tween = new TWEEN.Tween(this.mesh.position)
      .to(pirPosition, ThreedPersonComponent.CRAWLING_TWEEN_DURATION)
      .onComplete(() => {
        this.animator.stop("Crawling");
        this.tween = undefined;
      })
      .start();
  }

  private addModel() {
    const humanoidPhysicBody = new CANNON.Body({isTrigger: true});
    humanoidPhysicBody.addShape(new CANNON.Box(new CANNON.Vec3(0.15, 0.85, 0.15)), new CANNON.Vec3(0, 0.85, 0));
    this.rigidbody = new ThreedRigidbodyComponent({mesh: this, physicBody: humanoidPhysicBody, handleVisuals: false});
    this.animator = new ThreedAnimatorComponent(this, ...this.clonedGLTF.animations);
    this.animator.play("Idle");
  }

  public earthquakeAlert(magnitude: number, pirs: IOT_Pir[]) {
    if (this.alerted || magnitude <= 0.5) {
      return;
    }

    const sortedDeskByDistance = pirs.sort((a, b) => a.pirPosition.distanceTo(this.mesh.position) - b.pirPosition.distanceTo(this.mesh.position));

    for (const desk of sortedDeskByDistance) {
      if (desk.isOccupied) continue;

      const deskCoords = this.navMesh.getGridCoordsFromPosition(desk.pirPosition);
      const {x, y} = this.navMesh.findNearestWalkablePoint(deskCoords.x, deskCoords.y, 10);
      if (this.findPathToDesk(this.mesh.position, {x, y})) {
        this.iotPir = desk;
        desk.isOccupied = true;
        break;
      }
    }

    this.alerted = true;
  }


  public findPathToDesk(startPosition: THREE.Vector3 | { x: number, y: number }, endPosition: THREE.Vector3 | {
    x: number,
    y: number
  }): boolean {

    let startCoords: { x: number, y: number };
    let endCoords: { x: number, y: number };

    if (startPosition instanceof THREE.Vector3) {
      startCoords = this.navMesh.getGridCoordsFromPosition(startPosition);
    } else {
      startCoords = startPosition;
    }

    if (endPosition instanceof THREE.Vector3) {
      endCoords = this.navMesh.getGridCoordsFromPosition(endPosition);
    } else {
      endCoords = endPosition;
    }

    // Check if the starting and ending coordinates are the same
    if (startCoords.x === endCoords.x && startCoords.y === endCoords.y) {
      return false;
    }

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
    const pathMaterial = new THREE.LineBasicMaterial({color: 0xff00ff});
    const pathObject = new THREE.Line(pathGeometry, pathMaterial);
    if (this.previousPath) this.sceneManager.scene.remove(this.previousPath);

    this.previousPath = pathObject;
    this.sceneManager.scene.add(this.previousPath);
  }
}
