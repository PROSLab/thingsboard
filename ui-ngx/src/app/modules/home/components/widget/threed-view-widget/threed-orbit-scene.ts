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

import { ThreedSceneConfig } from "./threed-abstract-scene";
import { isThreedComplexOrbitWidgetSettings, ThreedComplexOrbitWidgetSettings, ThreedSimpleOrbitWidgetSettings } from "./threed-models";
import { ThreedGenericOrbitScene } from "./threed-generic-orbit-scene";
import * as THREE from 'three';
import { ROOT_TAG } from "./threed-constants";
import { ThreedUtils } from "./threed-utils";

export class ThreedOrbitScene extends ThreedGenericOrbitScene<ThreedSimpleOrbitWidgetSettings | ThreedComplexOrbitWidgetSettings, ThreedSceneConfig> {

    private raycaster = new THREE.Raycaster();
    private hoveringColor = { color: new THREE.Color("00ff00"), alpha: 1 };
    private hoveringMaterial: THREE.MeshStandardMaterial;

    private selectedObject: any;

    protected override onSettingValues(): void {
        super.onSettingValues();

        if (isThreedComplexOrbitWidgetSettings(this.settingsValue)) {
            this.setEnvironmentValues(this.settingsValue.threedSceneSettings.threedEnvironmentSettings);
            this.setDevicesValues(this.settingsValue.threedSceneSettings.threedDevicesSettings);

            this.hoveringColor = ThreedUtils.getAlphaAndColorFromString(this.settingsValue?.hoverColor || '00ff00');
            this.hoveringMaterial = new THREE.MeshStandardMaterial({
                color: this.hoveringColor.color,
                opacity: this.hoveringColor.alpha,
                transparent: true,
                //wireframe: true,
            });
        }
    }

    public override onMouseClick(event: MouseEvent): void {
        super.onMouseClick(event);

        this.updateRaycaster();
    }

    private updateRaycaster() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersection = this.raycaster.intersectObjects(this.scene.children).filter(o => {
            return o.object.type != "TransformControlsPlane" &&
                o.object.type != "BoxHelper" &&
                o.object.type != "GridHelper" &&
                //@ts-ignore
                o.object.tag != "Helper"
        });

        if (intersection.length > 0) {
            const intersectedObject = intersection[0].object;
            const root = this.getParentByChild(intersectedObject, ROOT_TAG, true);
            if (root) this.selectObject(root);
            else console.log(root);
        } else {
            // if hover tooltip => nothing
            // else deselectObject
            this.selectObject(undefined);
        }
    }

    private selectObject(object?: THREE.Object3D) {
        if (this.selectedObject != object) {
            this.deselectObject();
            this.selectedObject = object;
            this.toggleHightlightGLTF(this.selectedObject, true);
            //this.selectedObject!.userData.currentMaterial = this.selectedObject!.material;
            //this.selectedObject!.material = this.hoveringMaterial;

            // popup tooltip
        }
        else if (!object) {
            this.deselectObject();
            // hide tooltip
        }
    }

    private deselectObject() {
        if (this.selectedObject) {
            this.toggleHightlightGLTF(this.selectedObject, false);
            //this.selectedObject!.material = this.selectedObject.userData.currentMaterial;
        }
        this.selectedObject = null;
    }

    private toggleHightlightGLTF(root: THREE.Group, enable: boolean) {
        root.traverse(o => {
            if (o instanceof THREE.Mesh) {
                if (enable) {
                    o.userData.currentMaterial = o.material;
                    o.material = this.hoveringMaterial;
                } else {
                    o.material = o.userData.currentMaterial;
                }
            }
        });
    }
}