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

export const isIThreedListener = function (obj: any): obj is IThreedListener {
    return 'onKeyDown' in obj && typeof obj['onKeyDown'] === 'function'
        && 'onKeyUp' in obj && typeof obj['onKeyUp'] === 'function'
        && 'onMouseMove' in obj && typeof obj['onMouseMove'] === 'function'
        && 'onMouseClick' in obj && typeof obj['onMouseClick'] === 'function';
}
export interface IThreedListener {
    onKeyDown(event: KeyboardEvent): void;
    onKeyUp(event: KeyboardEvent): void;
    onMouseMove(event: MouseEvent): void;
    onMouseClick(event: MouseEvent): void;
}