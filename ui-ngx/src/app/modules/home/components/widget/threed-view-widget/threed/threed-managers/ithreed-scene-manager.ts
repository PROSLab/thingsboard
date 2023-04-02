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

import { Camera, Scene } from 'three';
import { ThreedSceneConfig } from '../threed-scenes/threed-scene-builder';
import { ThreedModelManager } from './threed-model-manager';
import { IThreedComponent } from '../threed-components/ithreed-component';

export interface IThreedSceneManager {
    scene: Scene;
    camera: Camera;

    get configs(): ThreedSceneConfig;
    get modelManager(): ThreedModelManager;
    get screenWidth(): number;
    get screenHeight(): number;
    get currentValues(): any;
    get mouse(): THREE.Vector2;

    initialize(): void;
    getRenderer(): THREE.WebGLRenderer;
    isActive(): boolean;
    forceUpdateValues(): void;
    getComponent<T extends IThreedComponent>(type: new () => T): T | undefined;
    findComponentsByTester<T>(tester: (obj: any) => obj is T): T[]
}