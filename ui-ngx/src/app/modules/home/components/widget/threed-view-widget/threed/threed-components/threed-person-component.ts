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

export class ThreedPersonComponent extends ThreedBaseComponent {

    private readonly navMesh: ThreedNavMeshComponent;
    private readonly finder: PF.AStarFinder = new PF.AStarFinder();
    private path: any;

    constructor(navMesh: ThreedNavMeshComponent) {
        super();

        this.navMesh = navMesh;
    }

    findPathToDesk(start: THREE.Vector3, end: THREE.Vector3) {
        const boxSize = this.navMesh.box.getSize(new THREE.Vector3());
        const cellSize = this.navMesh.cellSize

        // Find the path using Pathfinding.js
        this.path = this.finder.findPath(
            Math.floor((start.x + boxSize.x / 2) / cellSize),
            Math.floor((start.z + boxSize.z / 2) / cellSize),
            Math.floor((end.x + boxSize.x / 2) / cellSize),
            Math.floor((end.z + boxSize.z / 2) / cellSize),
            this.navMesh.getGrid().clone()
        );

        this.visualizePath();
        console.log(this.path);
    }

    private visualizePath() {
        const boxSize = this.navMesh.box.getSize(new THREE.Vector3());
        const cellSize = this.navMesh.cellSize

        const points = [];
        this.path.forEach((point) => {
            points.push(new THREE.Vector3(
                (point[0] * cellSize) - (boxSize.x / 2),
                1,
                (point[1] * cellSize) - (boxSize.z / 2)
            ));
        });
        const pathGeometry = new THREE.BufferGeometry().setFromPoints( points );
        const pathMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const pathObject = new THREE.Line(pathGeometry, pathMaterial);
        this.sceneManager.scene.add(pathObject);
    }
}