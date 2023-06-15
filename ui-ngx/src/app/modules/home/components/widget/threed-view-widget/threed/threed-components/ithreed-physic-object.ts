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
import { IThreedPhysic } from "./ithreed-physic";
import * as CANNON from 'cannon-es';
import { IThreedMesh } from "./ithreed-mesh";

export interface IThreedPhysicObject extends IThreedPhysic {
    physicBody: CANNON.Body;
    mesh?: IThreedMesh;

    onBeginCollision: EventEmitter<{ event: CANNON.Constraint, object: IThreedPhysicObject }>;
    onEndCollision: EventEmitter<{ event: CANNON.Constraint, object: IThreedPhysicObject }>;
    onCollide: EventEmitter<{ event: CANNON.Constraint }>;
}