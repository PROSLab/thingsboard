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

import { Subscription } from "rxjs";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { IThreedComponent } from "./ithreed-component";

export abstract class ThreedBaseComponent implements IThreedComponent {

    protected sceneManager: IThreedSceneManager;
    protected initialized: boolean = false;
    protected subscriptions: Subscription[] = [];

    initialize(sceneManager: IThreedSceneManager): void {
        if(this.initialized) return;
        
        this.sceneManager = sceneManager;
        this.initialized = true;
    }

    tick(): void { }
    render(): void { }
    resize(): void { }
    onDestroy(): void { 
        this.subscriptions.forEach(s => s.unsubscribe());
    }
}