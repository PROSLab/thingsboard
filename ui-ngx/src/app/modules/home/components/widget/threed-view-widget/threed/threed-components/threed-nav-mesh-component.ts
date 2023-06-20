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
import { ThreedGroupGameObjectComponent } from "./threed-group-gameobject-component";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedUtils } from "../threed-utils";
import { clamp } from "three/src/math/MathUtils";

export class ThreedNavMeshComponent extends ThreedBaseComponent {

    public readonly groupGameobject: ThreedGroupGameObjectComponent;
    // cellSize in meters!
    public readonly cellSize: number;
    private floor: THREE.Object3D;
    private floorBox: THREE.Box3;
    private grid: PF.Grid;

    public get box(): THREE.Box3 {
        return this.floorBox;
    }


    constructor(groupGameobject: ThreedGroupGameObjectComponent, cellSize: number = 0.1) {
        super();

        this.groupGameobject = groupGameobject;
        this.cellSize = cellSize;
    }

    initialize(sceneManager: IThreedSceneManager) {
        super.initialize(sceneManager);

        this.createGrid();
    }

    private createGrid() {
        this.groupGameobject.getMesh().traverse(o => {
            if (o.userData.navMesh == "floor")
                this.floor = o;
        });
        this.floorBox = new THREE.Box3().setFromObject(this.floor);

        this.compureGrid();
    }

    public compureGrid(): PF.Grid {
        if (!this.floorBox) return;

        const size = this.floorBox.getSize(new THREE.Vector3());
        console.log(size);

        // Create the Pathfinding.js grid
        this.grid = new PF.Grid(
            Math.ceil(size.x / this.cellSize),
            Math.ceil(size.z / this.cellSize)
        );
        console.log(this.grid);

        console.log(this.getGridCoords(new THREE.Vector3()));
        console.log(this.getGridCoords(new THREE.Vector3(1, 0, 2)));

        this.groupGameobject.rigidbodies.forEach(rb => {
            const object = rb.mesh.getMesh();

            if (object.userData.navMesh == "obstacle") {
                rb.physicBody.updateAABB();

                // Convert AABB to grid coordinates
                const min = this.getGridCoords(ThreedUtils.cannonToThree(rb.physicBody.aabb.lowerBound));
                const max = this.getGridCoords(ThreedUtils.cannonToThree(rb.physicBody.aabb.upperBound));

                // Mark all cells within the AABB as unwalkable
                for (let x = min.x; x <= max.x; x++) {
                    for (let y = min.y; y <= max.y; y++) {
                        console.log(x, y);
                        this.grid.setWalkableAt(x, y, false);
                    }
                }
            }
        });

        return this.grid;
    }

    public visualizeGrid() {
        console.log("visualizeGrid");
        const geometry = new THREE.BoxGeometry(this.cellSize, this.cellSize, this.cellSize);
        const materialWalkable = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const materialUnwalkable = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
        const size = this.floorBox.getSize(new THREE.Vector3());

        this.grid.nodes.forEach((nodes: { x: number, y: number, walkable: boolean }[]) => {
            nodes.forEach((node: { x: number, y: number, walkable: boolean }) => {
                //console.log(node);
                const x = (node.x * this.cellSize) - (size.x / 2);
                const y = 1;
                const z = (node.y * this.cellSize) - (size.z / 2);

                if (node.x == 0 && node.y == 0) {
                    console.log(x, z);
                }

                const cube = new THREE.Mesh(geometry, !node.walkable || (node.x == 0 && node.y == 0) ? materialUnwalkable : materialWalkable);

                cube.position.set(x, y, z);
                this.sceneManager.scene.add(cube);
            });
        });
    }

    public getGrid(forceUpdate: boolean = false): PF.Grid {
        if (!this.grid) this.createGrid();
        if (forceUpdate) return this.compureGrid();

        return this.grid;
    }

    public getGridCoords(position: THREE.Vector3): { x: number, y: number } {
        if (!this.floorBox) return null;

        // Convert position to local coordinates
        const localPosition = this.floor.localToWorld(position.clone());
        const size = this.floorBox.getSize(new THREE.Vector3());

        // Convert local position to grid coordinates
        const x = clamp(Math.floor(localPosition.x / this.cellSize + size.x / (2 * this.cellSize)), 0, this.grid.width);
        const y = clamp(Math.floor(localPosition.z / this.cellSize + size.z / (2 * this.cellSize)), 0, this.grid.height);

        return { x, y };
    }
}