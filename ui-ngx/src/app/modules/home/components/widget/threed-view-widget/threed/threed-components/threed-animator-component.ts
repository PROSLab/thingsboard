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
import { ThreedBaseComponent } from "./threed-base-component";
import { IThreedMesh } from './ithreed-mesh';

export class ThreedAnimatorComponent extends ThreedBaseComponent {

    private readonly mesh: IThreedMesh;
    private readonly mixer: THREE.AnimationMixer;
    private readonly animations: THREE.AnimationClip[] = [];
    private readonly clock = new THREE.Clock();

    constructor(mesh: IThreedMesh, ...animations: THREE.AnimationClip[]) {
        super();

        this.mesh = mesh;
        this.animations = animations;
        this.mixer = new THREE.AnimationMixer(mesh.getMesh());
    }

    tick(): void {
        super.tick();

        this.mixer.update(this.clock.getDelta());
    }

    public play(animation: THREE.AnimationClip | string): void {
        this.unpause();

        if (animation instanceof THREE.AnimationClip) {
            this.mixer.clipAction(animation).play();
        } else {
            const anim = this.animations.find(a => a.name == animation);
            if (anim) this.mixer.clipAction(anim).play();
        }
    }

    public stop(animation?: THREE.AnimationClip | string): void {
        this.unpause();

        if (animation == undefined) {
            this.mixer.stopAllAction();
        } else if (animation instanceof THREE.AnimationClip) {
            this.mixer.clipAction(animation).stop();
        } else {
            const anim = this.animations.find(a => a.name == animation);
            if (anim) this.mixer.clipAction(anim).stop();
        }
    }

    public pause(){
        this.mixer.timeScale = 0;
    }

    public unpause(){
        this.mixer.timeScale = 1;
    }
}