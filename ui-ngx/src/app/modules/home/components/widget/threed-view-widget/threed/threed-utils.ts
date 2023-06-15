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

import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

export class ThreedUtils {
    public static compareVector3(v1?: THREE.Vector3, v2?: THREE.Vector3): boolean {
        if (v1 == undefined || v2 == undefined) return false;
        return v1.x == v2.x && v1.y == v2.y && v1.z == v2.z;
    }

    /**
     * Compare if the 2 vectors are equals and if not, the v2 will be set to v1.
     * @param v1 vector 1
     * @param v2 vector to update with the info of v1
     */
    public static compareVector3AndUpdate(v1: THREE.Vector3, v2: THREE.Vector3) {
        if (ThreedUtils.compareVector3(v1, v2)) {
            return true;
        }

        v2.copy(v1);
        return false;
    }

    public static threeToCannon(vector3: THREE.Vector3): CANNON.Vec3 {
        return new CANNON.Vec3(vector3.x, vector3.y, vector3.z);
    }

    public static cannonToThree(vector3: CANNON.Vec3): THREE.Vector3 {
        return new THREE.Vector3(vector3.x, vector3.y, vector3.z);
    }

    /**
     * This method takes a node and finds its size and centerpoint, 
     * then rescales it so the max extent is 1 and its centered at 0,0,0, 
     * and above the ground on the y axis.
     * 
     * @link https://stackoverflow.com/questions/52271397/centering-and-resizing-gltf-models-automatically-in-three-js
     * 
     * @param gltf the gltf to scale
     * @param scaleUnit the scale multiplier
     */
    public static autoScaleModel(gltf: GLTF, scaleUnit = 1.0) {
        var mroot = gltf.scene;
        var bbox = new THREE.Box3().setFromObject(mroot);
        var cent = bbox.getCenter(new THREE.Vector3());
        var size = bbox.getSize(new THREE.Vector3());

        //Rescale the object to normalized space
        var maxAxis = Math.max(size.x, size.y, size.z);
        mroot.scale.multiplyScalar(scaleUnit / maxAxis);
        bbox.setFromObject(mroot);
        bbox.getCenter(cent);
        bbox.getSize(size);
        //Reposition to 0,halfY,0
        mroot.position.copy(cent).multiplyScalar(-1);
        mroot.position.y += (size.y * 0.5);
    }

    public static getAlphaAndColorFromString(colorString: string): { color: THREE.Color, alpha: number } {
        const matchRGB = colorString.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
        const matchHex = colorString.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
        const matchHSL = colorString.match(/^hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,?\s*([\d.]+)?\)$/);

        if (matchRGB) {
            const alpha = matchRGB[4] ? parseFloat(matchRGB[4]) : 1;
            return { color: new THREE.Color(colorString), alpha };
        } else if (matchHex) {
            const alpha = matchHex[4] ? parseInt(matchHex[4], 16) / 255 : 1;
            return { color: new THREE.Color(colorString), alpha };
        } else if (matchHSL) {
            const alpha = matchHSL[4] ? parseFloat(matchHSL[4]) : 1;
            return { color: new THREE.Color(colorString), alpha };
        } else {
            return { color: new THREE.Color(colorString), alpha: 1 };
        }
    }

    public static splitIntoMeshes(object: THREE.Object3D, shadow: boolean = false): THREE.Group {
        const parts = new THREE.Group();
        const box = new THREE.Box3();

        // Traverse through the scene to get all the parts
        object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Get the world position, rotation, and scale of the child mesh
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                child.getWorldPosition(position);
                child.getWorldQuaternion(quaternion);
                child.getWorldScale(scale);

                // Create a new mesh with the same geometry and material
                const mesh = new THREE.Mesh(child.geometry, child.material);

                // Set the position, rotation, and scale of the new mesh
                mesh.position.copy(position);
                mesh.quaternion.copy(quaternion);
                mesh.scale.copy(scale);

                box.setFromObject(mesh);
                mesh.userData.defaultCenterPosition = box.getCenter(new THREE.Vector3());
                mesh.userData.defaultPosition = new THREE.Vector3().copy(mesh.position);

                if (shadow) {
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                }

                // Add the new mesh to the group
                parts.add(mesh);
            }
        });
        return parts;
    }

    public static findParentByChild(child: THREE.Object3D, tag: string, value: any): THREE.Object3D | undefined {
        if (child.userData[tag] == value) return child;
        else if (child.parent != null) return ThreedUtils.findParentByChild(child.parent, tag, value);
        else return undefined;
    }

    public static isVisible(child: THREE.Object3D): boolean {
        if (child.visible == false) return false;
        else if (child.parent != null) return ThreedUtils.isVisible(child.parent);
        else return true;
    }
}