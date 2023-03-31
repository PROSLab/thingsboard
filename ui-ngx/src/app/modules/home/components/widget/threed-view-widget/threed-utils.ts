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
}