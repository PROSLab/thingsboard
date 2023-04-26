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
import { IThreedComponent } from '../threed-components/ithreed-component';
import { ThreedSceneConfig } from '../threed-scenes/threed-scene-builder';
import { IThreedRenderer } from './ithreed-renderer';
import { ThreedCssManager } from './threed-css-manager';
import { ThreedModelManager } from './threed-model-manager';
import { ElementRef, EventEmitter } from '@angular/core';

export interface IThreedSceneManager {
    scene: Scene;
    active: boolean;
    
    get sceneId(): number;
    get camera(): Camera;
    get configs(): ThreedSceneConfig;
    get modelManager(): ThreedModelManager;
    get cssManager(): ThreedCssManager;
    get screenWidth(): number;
    get screenHeight(): number;
    get currentValues(): any;
    get mouse(): THREE.Vector2;
    get center(): THREE.Vector2;
    get vrActive(): boolean;

    onRendererContainerChange: EventEmitter<ElementRef>;
    onMainCameraChange: EventEmitter<Camera>;

    initialize(): void;
    getTRenderer<T extends IThreedRenderer>(type: new () => T): T | undefined;
    isActive(): boolean;
    forceUpdateValues(): void;
    getComponent<T extends IThreedComponent>(type: new () => T): T | undefined;
    findComponentsByTester<T>(tester: (obj: any) => obj is T): T[];
    destroy(): void;
    setCamera(camera: Camera): void;
}