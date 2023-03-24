import { ElementRef, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BoxHelper, Vector3 } from 'three';
import { ThreedOrbitScene } from './threed-orbit-scene';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

export class ThreedSceneEditor extends ThreedOrbitScene {

    private transformControl?: TransformControls;
    private boxHelper?: BoxHelper;
    private raycaster = new THREE.Raycaster();
    private raycastEnabled = true;
    private raycastEnabledLastFrame = true;

    public positionChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public rotationChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public scaleChanged = new EventEmitter<{ id: string, vector: Vector3 }>();

    constructor(canvas?: ElementRef) {
        super(canvas);
    }

    protected override initialize(canvas?: ElementRef): void {
        super.initialize(canvas);

        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('change', () => this.render());
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.orbit.enabled = !event.value;
            this.raycastEnabled = !event.value;
            if (this.orbit.enabled) {
                const obj = this.transformControl.object;
                const id = obj.userData[this.OBJECT_ID_TAG]
                const newPosition = this.transformControl.object?.position;
                const euler = new THREE.Euler().copy(this.transformControl.object?.rotation);
                const newRotation = new THREE.Vector3(
                    THREE.MathUtils.radToDeg(euler.x),
                    THREE.MathUtils.radToDeg(euler.y),
                    THREE.MathUtils.radToDeg(euler.z)
                );
                const newScale = this.transformControl.object?.scale;

                this.positionChanged.emit({ id, vector: newPosition });
                this.rotationChanged.emit({ id, vector: newRotation });
                this.scaleChanged.emit({ id, vector: newScale });

                //console.log(newPosition, newRotation, newScale);
            } else {
                this.raycastEnabledLastFrame = false;
            }
        });
        this.scene.add(this.transformControl);
    }

    protected override addModel(model: GLTF, id?: string): void {
        super.addModel(model, id);

        const customId = id || model.scene.uuid;
        const root = this.models.get(customId).scene;

        if (!this.boxHelper) {
            this.boxHelper = new THREE.BoxHelper(root, 0xffff00);
            this.scene.add(this.boxHelper);
        }
    }

    protected override onRemoveModel(gltf: GLTF, id: string): void {
        super.onRemoveModel(gltf, id);

        this.transformControl.detach();
    }

    protected tick(): void {
        super.tick();

        this.boxHelper?.update();
    }


    private updateRaycaster() {
        if (!this.raycastEnabled) return;
        if (!this.raycastEnabledLastFrame) {
            this.raycastEnabledLastFrame = true;
            return;
        }

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersection = this.raycaster.intersectObjects(this.scene.children).filter(o => {
            return o.object.type != "TransformControlsPlane"
        });

        console.log(intersection.map(o => { 
            const ud = this.getParentByChild(o.object, this.ROOT_TAG, true)?.userData;
            return { d: o.distance, ud: ud };
        }));

        if (intersection.length > 0) {
            // get the root of the object 'intersection[0].object' (it checks if the ROOT_TAG is true on the parents)
            const root = this.getParentByChild(intersection[0].object, this.ROOT_TAG, true);
            if (root) this.changeTransformControl(root);
        }
    }

    private changeTransformControl(model: THREE.Object3D) {
        this.transformControl.detach();
        this.transformControl.attach(model);
        this.boxHelper.setFromObject(model);
    }

    public override onMouseClick(event: MouseEvent): void {
        super.onMouseClick(event);

        this.updateRaycaster();
    }

    public override onKeyDown(event: KeyboardEvent): void {
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

    public override onKeyUp(event: KeyboardEvent): void {
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