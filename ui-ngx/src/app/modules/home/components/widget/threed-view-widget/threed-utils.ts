import * as THREE from 'three';

export class ThreedUtils {

    public static compareVector3(v1?: THREE.Vector3, v2?: THREE.Vector3): boolean {
        if(v1 == undefined || v2 == undefined) return false;
        return v1.x == v2.x && v1.y == v2.y && v1.z == v2.z;
    }

    /**
     * Compare if the 2 vectors are equals and if not, the v2 will be set to v1.
     * @param v1 vector 1
     * @param v2 vector to update with the info of v1
     */
    public static compareVector3AndUpdate(v1: THREE.Vector3, v2: THREE.Vector3) {
        if(ThreedUtils.compareVector3(v1, v2)){
            return true;
        }

        v2.copy(v1);
        return false;
    }
}