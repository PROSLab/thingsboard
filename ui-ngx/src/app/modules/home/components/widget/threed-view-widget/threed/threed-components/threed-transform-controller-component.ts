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

import { EventEmitter } from '@angular/core';
import { ThreedUtils } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-utils';
import { OBJECT_ID_TAG } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-constants';
import * as THREE from 'three';
import { BoxHelper, Vector3 } from 'three';
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedWebRenderer } from "../threed-managers/threed-web-renderer";
import { IThreedListener } from "./ithreed-listener";
import { IThreedObjectSelector } from "./ithreed-object-selector";
import { IThreedOrbitController } from "./ithreed-orbit-controller";
import { IThreedTester } from "./ithreed-tester";
import { ThreedBaseComponent } from "./threed-base-component";
import { ThreedCssRenderer } from '../threed-managers/threed-css-renderer';

export class ThreedTransformControllerComponent extends ThreedBaseComponent implements IThreedListener, IThreedObjectSelector {

    private transformControl?: TransformControls;
    private orbitController?: IThreedOrbitController;
    private visualizeBoxHelper: boolean;
    private boxHelper?: BoxHelper;

    
    public onChangeAttachTransformController = new EventEmitter<THREE.Object3D | undefined>();
    public onDraggingChanged = new EventEmitter<THREE.Event & { type: "dragging-changed"; } & { target: TransformControls; }>();
    public positionChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public rotationChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public scaleChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public modelSelected = new EventEmitter<string>();
    private lastPosition = new THREE.Vector3();
    private lastRotation = new THREE.Vector3();
    private lastScale = new THREE.Vector3();

    /**
     * @param orbitController The orbit controller component used; when using transform controls, the controller must be disabled. If no controllers are provided, it tries to find the component automatically. 
     */
    constructor(visualizeBoxHelper: boolean = true, orbitController?: IThreedOrbitController) {
        super();
        this.visualizeBoxHelper = visualizeBoxHelper;
        this.orbitController = orbitController;
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        if (!this.orbitController) {
            const orbits = this.sceneManager.findComponentsByTester(IThreedTester.isIThreedOrbitController);
            this.orbitController = orbits ? orbits[0] : undefined;
        }
        this.initializeController();
        this.initializeBoxHelper();
        const s = this.sceneManager.modelManager.onBeforeRemoveModel.subscribe(_ => this.attachTransformController());
        this.subscriptions.push(s);
    }

    tick(): void {
        if (this.visualizeBoxHelper) this.boxHelper?.update();
    }

    onKeyDown(event: KeyboardEvent): void {
        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight": // Shift
                this.transformControl?.setTranslationSnap(5);
                this.transformControl?.setRotationSnap(THREE.MathUtils.degToRad(10));
                this.transformControl?.setScaleSnap(0.2);
                break;

            case "KeyT":
                this.changeTransformControllerMode('translate');
                break;

            case "KeyR":
                this.changeTransformControllerMode('rotate');
                break;

            case "KeyS":
                this.changeTransformControllerMode('scale');
                break;

            case "Backquote":
                this.transformControl?.reset();
                break;
        }
    }
    onKeyUp(event: KeyboardEvent): void {
        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight":
                this.transformControl?.setTranslationSnap(null);
                this.transformControl?.setRotationSnap(null);
                this.transformControl?.setScaleSnap(null);
                break;

        }
    }
    onMouseMove(event: MouseEvent): void { }
    onMouseClick(event: MouseEvent): void { }

    private initializeController() {
        this.transformControl = new TransformControls(this.sceneManager.camera, this.sceneManager.getTRenderer(ThreedCssRenderer).getRenderer().domElement);
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.onDraggingChanged.emit(event);
            const draggingChanged = event.value;

            if (this.orbitController) this.orbitController.getOrbitController().enabled = !draggingChanged;

            if (!draggingChanged) {
                const obj = this.transformControl.object;
                const id = obj.userData[OBJECT_ID_TAG]
                const newPosition = this.transformControl.object?.position;
                const euler = new THREE.Euler().copy(this.transformControl.object?.rotation);
                const newRotation = new THREE.Vector3(
                    THREE.MathUtils.radToDeg(euler.x),
                    THREE.MathUtils.radToDeg(euler.y),
                    THREE.MathUtils.radToDeg(euler.z)
                );
                const newScale = this.transformControl.object?.scale;

                if (!ThreedUtils.compareVector3AndUpdate(newPosition, this.lastPosition))
                    this.positionChanged.emit({ id, vector: newPosition });
                if (!ThreedUtils.compareVector3AndUpdate(newRotation, this.lastRotation))
                    this.rotationChanged.emit({ id, vector: newRotation });
                if (!ThreedUtils.compareVector3AndUpdate(newScale, this.lastScale))
                    this.scaleChanged.emit({ id, vector: newScale });
            }
        });
        this.transformControl.visible = false;
        this.sceneManager.scene.add(this.transformControl);
    }

    private initializeBoxHelper() {
        if (!this.boxHelper && this.visualizeBoxHelper) {
            this.boxHelper = new THREE.BoxHelper(undefined, 0xffff00);
            this.sceneManager.scene.add(this.boxHelper);
            this.boxHelper.visible = false
        }
    }

    public attachTransformController(model?: THREE.Object3D) {
        this.onChangeAttachTransformController.emit(model);

        this.transformControl.detach();
        this.transformControl.visible = model ? true : false;
        if (this.visualizeBoxHelper) this.boxHelper.visible = model ? true : false;

        if (model) {
            this.transformControl.attach(model);
            if (this.visualizeBoxHelper) this.boxHelper.setFromObject(model);

            const id = model.userData[OBJECT_ID_TAG];
            this.modelSelected.emit(id);
            
            this.lastPosition.copy(model.position);
            const euler = new THREE.Euler().copy(this.transformControl.object?.rotation);
            this.lastRotation = new THREE.Vector3(
                THREE.MathUtils.radToDeg(euler.x),
                THREE.MathUtils.radToDeg(euler.y),
                THREE.MathUtils.radToDeg(euler.z)
            );
            this.lastScale.copy(model.scale);
        }
    }

    public changeTransformControllerMode(mode: 'translate' | 'rotate' | 'scale') {
        this.transformControl?.setMode(mode);
    }

    public getSelectedObject(): THREE.Object3D | undefined {
        return this.transformControl?.object;
    }

    public deselectObject(): void {
        this.attachTransformController();
    }
}