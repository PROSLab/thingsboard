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

import { ThreedAbstractScene, ThreedSceneConfig } from "./threed-abstract-scene";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ElementRef } from '@angular/core';

export class ThreedOrbitScene<S, C extends ThreedSceneConfig> extends ThreedAbstractScene<S, C> {

    protected orbit?: OrbitControls;

    constructor(canvas?: ElementRef, configs?: C) {
        super(canvas, configs);
    }

    protected override initialize(canvas?: ElementRef): void {
        super.initialize(canvas);

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.update();
        this.orbit.addEventListener('change', () => this.render());
    }

    protected tick(): void { }
    public onKeyDown(event: KeyboardEvent): void { }
    public onKeyUp(event: KeyboardEvent): void { }
}