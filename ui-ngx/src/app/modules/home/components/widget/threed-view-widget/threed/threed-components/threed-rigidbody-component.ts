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

import { EventEmitter } from "@angular/core";
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { ShapeOptions, threeToCannon } from 'three-to-cannon';
import { bodyToMesh } from '../threed-conversion-utils';
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedUtils } from '../threed-utils';
import { IThreedMesh } from './ithreed-mesh';
import { IThreedPhysicObject } from './ithreed-physic-object';
import { ThreedBaseComponent } from "./threed-base-component";

export class ThreedRigidbodyComponent extends ThreedBaseComponent implements IThreedPhysicObject {

    private physicMaterial?: CANNON.Material;
    private autoDefineBody?: ShapeOptions;
    private handleVisuals: boolean = true;
    private debugColliderMesh?: THREE.Object3D;
    private readonly wireframeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    private visualiseColliders = false;
    private bodyOptions: CANNON.BodyOptions;
    private joints: CANNON.Constraint[];
    private link?: { rigidbody: IThreedPhysicObject, offset: CANNON.Vec3 };

    public physicBody: CANNON.Body;
    public mesh?: IThreedMesh;
    public readonly onBeginCollision = new EventEmitter<{ event: CANNON.Constraint, object: IThreedPhysicObject }>();
    public readonly onEndCollision = new EventEmitter<{ event: CANNON.Constraint, object: IThreedPhysicObject }>();
    public readonly onCollide = new EventEmitter<{ event: CANNON.Constraint }>();

    constructor(options: {
        mesh?: IThreedMesh,
        physicBody?: CANNON.Body,
        physicMaterial?: CANNON.Material,
        bodyOptions?: CANNON.BodyOptions,
        autoDefineBody?: ShapeOptions,
        joints?: CANNON.Constraint[],
        link?: { rigidbody: IThreedPhysicObject, offset: CANNON.Vec3 },
        handleVisuals?: boolean
    } = {}) {
        super();
        this.mesh = options.mesh;
        this.physicBody = options.physicBody;
        this.bodyOptions = options.bodyOptions;
        this.physicMaterial = options.physicMaterial;
        this.autoDefineBody = options.autoDefineBody;
        this.handleVisuals = options.handleVisuals ?? true;
        this.joints = options.joints ?? [];
        this.link = options.link;
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        if (!this.physicBody)
            this.createBody();

        this.physicBody?.addEventListener('collide', event => this.onCollide.emit({ event }));

        this.createCollider();
        this.sceneManager.physicManager.addPhysic(this);
        this.joints.forEach(j => this.sceneManager.physicManager.world.addConstraint(j));
    }

    private createBody() {
        if (!this.mesh) return;

        const object: any = this.mesh.getMesh();
        // https://github.com/donmccurdy/three-to-cannon
        // Automatic (Usually an AABB, except obvious cases like THREE.SphereGeometry).
        const result = threeToCannon(object, this.autoDefineBody);
        const { shape, offset, orientation } = result;

        console.log(object.position);

        this.physicBody = new CANNON.Body({
            material: this.physicMaterial,
            mass: 1
        } && this.bodyOptions);
        this.physicBody.addShape(shape, offset, orientation);
        this.physicBody.position.copy(ThreedUtils.threeToCannon(object.position));

        console.log(this.physicBody);
    }

    private createCollider() {
        if (!this.physicBody) return;

        this.debugColliderMesh = bodyToMesh(this.physicBody, this.wireframeMaterial);
        this.debugColliderMesh.visible = this.visualiseColliders;
        this.debugColliderMesh.name = "Collider_" + this.mesh?.getMesh().name || "generic";
        this.sceneManager.scene.add(this.debugColliderMesh);
    }

    setVisualiseColliders(visualiseColliders: boolean): void {
        this.visualiseColliders = visualiseColliders;
        if (this.debugColliderMesh)
            this.debugColliderMesh.visible = this.visualiseColliders;
    }

    beforeUpdatePhysics(): void {
        if (!this.mesh) return;

        if (!this.handleVisuals) {
            this.physicBody?.position.copy(
                ThreedUtils.threeToCannon(this.mesh.getMesh().position)
            );
            const q = this.mesh.getMesh().quaternion;
            this.physicBody?.quaternion.set(q.x, q.y, q.z, q.w);
        }
    }
    updatePhysics(): void { }
    updateVisuals(): void {
        if(this.link) {
            this.physicBody?.position.copy(this.link.rigidbody.physicBody.position.clone().vadd(this.link.offset));
        }

        const physicPosition = ThreedUtils.cannonToThree(this.physicBody?.position);
        const physicRotation = this.physicBody.quaternion;
        if (this.debugColliderMesh.visible) {
            this.debugColliderMesh.position.copy(physicPosition);
            this.debugColliderMesh.quaternion.set(physicRotation.x, physicRotation.y, physicRotation.z, physicRotation.w);
        }

        if (!this.mesh) return;

        if (this.handleVisuals) {
            this.mesh.getMesh().position.copy(physicPosition);
            this.mesh.getMesh().quaternion.set(physicRotation.x, physicRotation.y, physicRotation.z, physicRotation.w);
        }
    }
}