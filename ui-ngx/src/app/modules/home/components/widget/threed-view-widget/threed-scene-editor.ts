import { ElementRef, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BoxHelper, Vector3 } from 'three';
import { ThreedOrbitScene } from './threed-orbit-scene';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

export class ThreedSceneEditor extends ThreedOrbitScene {

    private transformControl?: TransformControls;
    private boxHelper?: BoxHelper;

    public positionChanged = new EventEmitter<Vector3>();
    public rotationChanged = new EventEmitter<Vector3>();
    public scaleChanged = new EventEmitter<Vector3>();

    constructor(canvas?: ElementRef) {
        super(canvas);
    }

    protected override initialize(canvas?: ElementRef): void {
        super.initialize(canvas);

        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('change', () => this.render());
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.orbit.enabled = !event.value;
            if (this.orbit.enabled) {
                const newPosition = this.transformControl.object?.position;
                const euler = new THREE.Euler().copy(this.transformControl.object?.rotation);
                const newRotation = new THREE.Vector3(
                    THREE.MathUtils.radToDeg(euler.x),
                    THREE.MathUtils.radToDeg(euler.y),
                    THREE.MathUtils.radToDeg(euler.z)
                );
                const newScale = this.transformControl.object?.scale;

                this.positionChanged.emit(newPosition);
                this.rotationChanged.emit(newRotation);
                this.scaleChanged.emit(newScale);

                //console.log(newPosition, newRotation, newScale);
            }
        });
        this.scene.add(this.transformControl);
    }

    protected override addModel(model: GLTF, id?: string): void {
        super.addModel(model, id);

        const root = this.models.get(id || model.scene.uuid).scene;

        this.transformControl.detach();
        this.transformControl.attach(root);

        if (!this.boxHelper) {
            this.boxHelper = new THREE.BoxHelper(root, 0xffff00);
            this.scene.add(this.boxHelper);
        }

        this.boxHelper.setFromObject(root);
    }

    protected override onRemoveModel(gltf: GLTF, id: string): void {
        super.onRemoveModel(gltf, id);

        this.transformControl.detach();
    }

    protected tick(): void {
        super.tick();

        this.boxHelper?.update();
    }

    public onKeyDown(event: KeyboardEvent): void {
        super.onKeyDown(event);

        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight": // Shift
                this.transformControl?.setTranslationSnap(100);
                this.transformControl?.setRotationSnap(THREE.MathUtils.degToRad(15));
                this.transformControl?.setScaleSnap(0.25);
                break;

            case "KeyT":
                this.changeTransformControlMode('translate');
                break;

            case "KeyR":
                this.changeTransformControlMode('rotate');
                break;

            case "KeyS":
                this.changeTransformControlMode('scale');
                break;

            case "Backquote":
                this.transformControl?.reset();
                break;
        }
    }

    public onKeyUp(event: KeyboardEvent): void {
        super.onKeyUp(event);

        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight":
                this.transformControl?.setTranslationSnap(null);
                this.transformControl?.setRotationSnap(null);
                this.transformControl?.setScaleSnap(null);
                break;

        }
    }

    public changeTransformControlMode(mode: 'translate' | 'rotate' | 'scale') {
        this.transformControl?.setMode(mode);
    }
}