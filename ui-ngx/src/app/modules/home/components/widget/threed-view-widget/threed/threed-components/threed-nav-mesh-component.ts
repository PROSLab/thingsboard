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
    private floorSize: THREE.Vector3;
    private grid: PF.Grid;

    public get sizeX(): number {
        return this.floorSize.x;
    }
    public get sizeZ(): number {
        return this.floorSize.z;
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

        this.floorSize = this.floorBox.getSize(new THREE.Vector3());
        //console.log(this.floorSize);

        // Create the Pathfinding.js grid
        this.grid = new PF.Grid(
            Math.ceil(this.sizeX / this.cellSize),
            Math.ceil(this.sizeZ / this.cellSize)
        );
        //console.log(this.grid);

        this.groupGameobject.rigidbodies.forEach(rb => {
            const object = rb.mesh.getMesh();

            if (object.userData.navMesh == "obstacle") {
                rb.physicBody.updateAABB();

                // Convert AABB to grid coordinates
                const min = this.getGridCoordsFromPosition(ThreedUtils.cannonToThree(rb.physicBody.aabb.lowerBound));
                const max = this.getGridCoordsFromPosition(ThreedUtils.cannonToThree(rb.physicBody.aabb.upperBound));

                // Mark all cells within the AABB as unwalkable
                for (let x = min.x; x <= max.x; x++) {
                    for (let y = min.y; y <= max.y; y++) {
                        this.grid.setWalkableAt(x, y, false);
                    }
                }
            }
        });

        return this.grid;
    }


    private previousGrid = [];
    public visualiseGrid(visualize: boolean = true) {
        if (!visualize) {
            this.previousGrid?.forEach(element => {
                this.sceneManager.scene.remove(element);
            });
            this.previousGrid = [];
            return;
        }

        //console.log("visualizeGrid");
        const geometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
        const materialWalkable = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const materialUnwalkable = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });

        const y = 1;
        this.previousGrid?.forEach(element => {
            this.sceneManager.scene.remove(element);
        });
        this.previousGrid = [];


        this.grid.nodes.forEach((nodes: { x: number, y: number, walkable: boolean }[]) => {
            nodes.forEach((node: { x: number, y: number, walkable: boolean }) => {
                //console.log(node);
                const pos = this.getPostionFromGridCoords(node.x, node.y);
                const cube = new THREE.Mesh(geometry, !node.walkable ? materialUnwalkable : materialWalkable);
                cube.rotation.x = -Math.PI / 2;
                cube.position.set(pos.x, y, pos.z);
                this.sceneManager.scene.add(cube);
                this.previousGrid.push(cube);
            });
        });
    }

    public getGrid(forceUpdate: boolean = false): PF.Grid {
        if (!this.grid) this.createGrid();
        if (forceUpdate) return this.compureGrid();

        return this.grid;
    }

    public getGridCoordsFromPosition(position: THREE.Vector3): { x: number, y: number } {
        if (!this.floorBox) return null;

        // Convert position to local coordinates
        const localPosition = this.floor.localToWorld(position.clone());

        // Convert local position to grid coordinates
        const x = clamp(Math.floor(localPosition.x / this.cellSize + this.sizeX / (2 * this.cellSize)), 0, this.grid.width);
        const y = clamp(Math.floor(localPosition.z / this.cellSize + this.sizeZ / (2 * this.cellSize)), 0, this.grid.height);

        return { x, y };
    }

    public getPostionFromGridCoords(x: number, y: number): THREE.Vector3 {
        const xPos = (x * this.cellSize) - (this.sizeX / 2);
        const zPos = (y * this.cellSize) - (this.sizeZ / 2);

        return new THREE.Vector3(xPos, 0, zPos);
    }

    public findNearestWalkablePoint(x: number, y: number, maxIterations: number = 5): { x: number, y: number } {
        if (this.grid.isWalkableAt(x, y))
            return { x, y }

        for (let i = 1; i <= maxIterations; i++) {
            for (let xSide = -i; xSide <= i; xSide++) {
                for (let ySide = -i; ySide <= i; ySide++) {
                    if (ySide >= -i + 1 && ySide <= i - 1 && xSide >= -i + 1 && xSide <= i - 1) continue;

                    if (this.grid.isWalkableAt(x - xSide, y - ySide)) return { x: x - xSide, y: y - ySide };
                }
            }
        }
    }
}