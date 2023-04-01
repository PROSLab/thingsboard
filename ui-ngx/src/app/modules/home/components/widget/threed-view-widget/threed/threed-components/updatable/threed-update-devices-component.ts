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

import { ThreedBaseComponent } from "../threed-base-component";
import { IThreedUpdatable } from "../ithreed-updatable";
import { ThreedDevicesSettings } from "../../../threed-models";

export class ThreedUpdateDevicesComponent extends ThreedBaseComponent implements IThreedUpdatable {

    onUpdateValues(values: any): void {
        if (!values) return;
        const settings: ThreedDevicesSettings = values;
        if (!settings) return;
        const deviceGroupSettings = settings?.threedDeviceGroupSettings;
        if (!deviceGroupSettings) return;

        deviceGroupSettings.forEach(deviceGroup => {
            const objectsSettings = deviceGroup.threedObjectSettings;
            if (objectsSettings) {
                objectsSettings.forEach(objectSettings => {
                    this.sceneManager.modelManager.updateModelTransforms(objectSettings.entity.id, objectSettings);
                });
            }
        });
    }
}