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

import { ElementRef } from "@angular/core";
import { IThreedSceneManager } from "./ithreed-scene-manager";

export interface IThreedRenderer {
    attachToElement(rendererContainer: ElementRef): void;
    detach(): void;
    resize(width?: number, height?: number): void;
    render(threedSceneManager: IThreedSceneManager): void;
    tick(threedSceneManager: IThreedSceneManager): void;

    getRenderer(): any;
}