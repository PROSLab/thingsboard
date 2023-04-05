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

export class ThreedEventManager {

    private static _instance: ThreedEventManager;
    public static get instance(): ThreedEventManager {
        if (!this._instance) this._instance = new ThreedEventManager();
        return this._instance;
    }

    public onMouseMove: EventEmitter<MouseEvent> = new EventEmitter();
    public onMouseClick: EventEmitter<MouseEvent> = new EventEmitter();
    public onKeyDown: EventEmitter<KeyboardEvent> = new EventEmitter();
    public onKeyUp: EventEmitter<KeyboardEvent> = new EventEmitter();

    private constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        window.addEventListener('mousemove', (event: MouseEvent) => this.onMouseMove.emit(event));
        window.addEventListener('click', (event: MouseEvent) => this.onMouseClick.emit(event));
        window.addEventListener('keydown', (event: KeyboardEvent) => this.onKeyDown.emit(event));
        window.addEventListener('keyup', (event: KeyboardEvent) => this.onKeyUp.emit(event));
    }
}