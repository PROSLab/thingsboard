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

import * as THREE from 'three';
import { IThreedSceneManager } from '../threed-managers/ithreed-scene-manager';
import { ThreedVrControllerComponent } from './threed-vr-controller-component';
import { ThreedHightlightTooltipRaycasterComponent } from './threed-hightlight-tooltip-raycaster-component';
import { createText } from 'three/examples/jsm/webxr/Text2D.js';
import { ThreedUtils } from '../threed-utils';
import { ROOT_TAG } from '../threed-constants';
import { opacity } from 'html2canvas/dist/types/css/property-descriptors/opacity';

const createButton = function (message, height, a) {

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let metrics = null;
    const textHeight = 100;
    context.font = 'normal ' + textHeight + 'px Arial';
    metrics = context.measureText(message);
    const textWidth = metrics.width;
    canvas.width = textWidth;
    canvas.height = textHeight;
    context.font = 'normal ' + textHeight + 'px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.fillText(message, textWidth / 2, textHeight / 2);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        map: texture,
        transparent: true,
    });
    const geometry = new THREE.PlaneGeometry(
        (height * textWidth) / textHeight,
        height
    );
    const plane = new THREE.Mesh(geometry, material);
    plane.userData.a = a;
    return plane;
}

const getATag = function (line: string): HTMLAnchorElement | undefined {
    const parser = new DOMParser();
    const doc = parser.parseFromString(line, 'text/html');
    return doc.getElementsByTagName('a')?.[0];
}

export class ThreedVrHightlightTooltipRaycasterComponent extends ThreedHightlightTooltipRaycasterComponent {

    private vrController: ThreedVrControllerComponent;
    private updateCounterIndex = 0;

    constructor(raycastUpdate: 'click' | 'hover' = 'click', resolveRaycastObject: 'single' | 'root' = 'single', raycastOrigin?: THREE.Vector2) {
        super(raycastUpdate, resolveRaycastObject, raycastOrigin);
    }

    public initialize(sceneManager: IThreedSceneManager) {
        super.initialize(sceneManager)

        this.vrController = this.sceneManager.getComponent(ThreedVrControllerComponent);


        const test1 = "Prova con una lista:<br>1- ciao<br>2- ciccio<br><a href='something'>Link here</a>";
        const test2 = '<b>Thermostat T2</b><br><br><b>Temperature:</b> 12.0 °C<br><b>Humidity:</b> 55.00 %<br><small><a href="javascript:void(0)" class="tb-custom-action" data-action-name="navigate_to_details">Link text</a></small>'

        const htmlString = test2;

        const lines = htmlString.split("<br>");
        const height = 3;
        const group = new THREE.Group();
        const regex = /<[^>]*>/g;
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];

            let element: THREE.Mesh;
            const a = getATag(line);
            if (a) {
                const text = a.innerText.replace(regex, '');
                element = createButton(text, height, a)
            }
            else {
                const text = line.replace(regex, '');
                element = createText(text, height);
            }

            element.userData[ROOT_TAG] = true
            element.position.set(0, (lines.length - index) * height, 0);
            element.renderOrder = 1
            group.add(element);
        }

        var bbox = new THREE.Box3().setFromObject(group);
        var cent = bbox.getCenter(new THREE.Vector3());
        var size = bbox.getSize(new THREE.Vector3());
        // Create a background Mesh
        const backgroundGeometry = new THREE.PlaneGeometry(size.x, size.y);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
        });
        const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        backgroundMesh.position.set(cent.x, cent.y, cent.z-0.1)
        group.add(backgroundMesh);

        group.renderOrder = 2;
        backgroundMesh.renderOrder = 0;
        group.position.set(-50, 0, 0);
        this.sceneManager.scene.add(group);

        const box = new THREE.BoxHelper(group, 0xffff00);
        box.renderOrder = 3;
        this.sceneManager.scene.add(box);
    }

    public tick() {
        super.tick();

        if (!this.sceneManager.vrActive || this.updateCounterIndex++ % 2 == 0) return;

        this.updateRaycaster();
    }


    protected onSelectObject(object: any): void {
        super.onSelectObject(object);

        this.checkClick(object);
    }

    private checkClick(object: THREE.Group) {
        console.log("checkClick", object)
        const a = object.userData["a"]
        console.log(a);
        if (a) {
            // Add the element to the DOM first
            document.body.appendChild(a);
            a.dispatchEvent(new PointerEvent('pointerdown'));
            a.click();
            // Remove the element from the DOM after the click event
            a.remove();
        }
    }

    protected setRaycaster() {

        if (!this.sceneManager.vrActive) {
            super.setRaycaster();
            return;
        }
        const line = this.vrController.line;
        if (!line) return;

        // @ts-ignore
        let startPoint = line.geometry.attributes.position.array.slice(0, 3);
        // @ts-ignore
        let endPoint = line.geometry.attributes.position.array.slice(3, 6);
        const direction = new THREE.Vector3().subVectors(
            new THREE.Vector3().fromArray(endPoint),
            new THREE.Vector3().fromArray(startPoint)
        );

        const tempMatrix = new THREE.Matrix4()
        tempMatrix.identity().extractRotation(this.vrController.controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(this.vrController.controller.matrixWorld);
        this.raycaster.ray.direction.set(direction.x, direction.y, direction.z).applyMatrix4(tempMatrix);
    }
}