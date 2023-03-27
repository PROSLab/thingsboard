import { ElementRef, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BoxHelper, Vector3 } from 'three';
import { ThreedOrbitScene } from './threed-orbit-scene';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ThreedCameraSettings, ThreedDevicesSettings, ThreedEnvironmentSettings, ThreedSceneSettings } from './threed-models';
import { CAMERA_ID, OBJECT_ID_TAG, ROOT_TAG } from './threed-constants';
import { ThreedUtils } from './threed-utils';

export class ThreedSceneEditor extends ThreedOrbitScene<ThreedSceneSettings> {

    private readonly SCREEN_WIDTH_ASPECT_RATIO = 4;
    private readonly SCREEN_HEIGHT_ASPECT_RATIO = 4;

    private perspectiveCamera: THREE.PerspectiveCamera;
    private perspectiveCameraHelper: THREE.CameraHelper;
    private cameraMesh: THREE.Mesh | THREE.Group;
    private debugCameraScreenWidth = this.screenWidth / this.SCREEN_WIDTH_ASPECT_RATIO;
    private debugCameraScreenHeight = this.screenHeight / this.SCREEN_HEIGHT_ASPECT_RATIO;
    private showDebugCameraPreview = false;

    private transformControl?: TransformControls;
    private boxHelper?: BoxHelper;
    private raycaster = new THREE.Raycaster();
    private raycastEnabled = true;
    private raycastEnabledLastFrame = true;

    public positionChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public rotationChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    public scaleChanged = new EventEmitter<{ id: string, vector: Vector3 }>();
    private lastPosition = new THREE.Vector3();
    private lastRotation = new THREE.Vector3();
    private lastScale = new THREE.Vector3();

    constructor(canvas?: ElementRef) {
        super(canvas);
    }

    protected override initialize(canvas?: ElementRef): void {
        super.initialize(canvas);

        this.renderer.autoClear = false;

        this.initializeCameraHelper();
        this.initializeTransformControl();
    }

    private initializeCameraHelper() {
        this.perspectiveCamera = new THREE.PerspectiveCamera(60, this.camera.aspect, 1, 150);
        this.perspectiveCameraHelper = new THREE.CameraHelper(this.perspectiveCamera);
        this.scene.add(this.perspectiveCameraHelper)

        new GLTFLoader().load("./assets/models/gltf/camera.glb", (gltf: GLTF) => {
            this.cameraMesh = gltf.scene;
            this.cameraMesh.traverse((o: any) => {
                if (o.isMesh) {
                    o.material?.emissive?.setHex(0xffffff);
                }
            })
            this.cameraMesh.userData[ROOT_TAG] = true;
            this.cameraMesh.userData[OBJECT_ID_TAG] = CAMERA_ID;
            this.cameraMesh.add(this.perspectiveCamera);
            this.scene.add(this.cameraMesh);

            this.setCameraValues(this.settingsValue.threedCameraSettings, this.cameraMesh);
        });
    }

    private initializeTransformControl() {
        this.transformControl = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControl.addEventListener('change', () => this.render());
        this.transformControl.addEventListener('dragging-changed', (event) => {
            this.orbit.enabled = !event.value;
            this.raycastEnabled = !event.value;
            if (this.orbit.enabled) {
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
        this.perspectiveCameraHelper?.update();
    }

    public override render(): void {
        this.renderer.clear();

        if (this.boxHelper) this.boxHelper.visible = true;
        if (this.transformControl) this.transformControl.visible = true;
        if (this.perspectiveCameraHelper) this.perspectiveCameraHelper.visible = true;
        this.renderer.setViewport(0, 0, this.screenWidth, this.screenHeight);
        super.render();

        if (this.showDebugCameraPreview) {
            if (this.boxHelper) this.boxHelper.visible = false;
            if (this.transformControl) this.transformControl.visible = false;
            if (this.perspectiveCameraHelper) this.perspectiveCameraHelper.visible = false;
            const x = this.screenWidth - this.debugCameraScreenWidth;
            this.renderer.clearDepth();
            this.renderer.setScissorTest(true);
            this.renderer.setScissor(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight)
            this.renderer.setViewport(x, 0, this.debugCameraScreenWidth, this.debugCameraScreenHeight);
            this.renderer.render(this.scene, this.perspectiveCamera);
            this.renderer.setScissorTest(false);
        }
    }

    public override resize(width?: number, height?: number): void {
        super.resize(width, height);

        this.debugCameraScreenWidth = this.screenWidth / this.SCREEN_WIDTH_ASPECT_RATIO;
        this.debugCameraScreenHeight = this.screenHeight / this.SCREEN_HEIGHT_ASPECT_RATIO;
        this.perspectiveCamera.aspect = this.debugCameraScreenWidth / this.debugCameraScreenHeight;
        this.perspectiveCamera.updateProjectionMatrix();
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

        console.log(intersection);

        console.log(intersection.map(o => {
            const ud = this.getParentByChild(o.object, ROOT_TAG, true)?.userData;
            return { d: o.distance, ud: ud };
        }));

        if (intersection.length > 0) {
            const intersectedObject = intersection[0].object;
            const root = this.getParentByChild(intersectedObject, ROOT_TAG, true);
            if (root) this.changeTransformControl(root);
            else console.log(intersectedObject);
        }
    }

    private changeTransformControl(model: THREE.Object3D) {
        this.transformControl.detach();
        this.transformControl.attach(model);
        this.boxHelper.setFromObject(model);

        this.showDebugCameraPreview = model.userData[OBJECT_ID_TAG] == CAMERA_ID;

        this.lastPosition.copy(model.position);
        const euler = new THREE.Euler().copy(this.transformControl.object?.rotation);
        this.lastRotation = new THREE.Vector3(
            THREE.MathUtils.radToDeg(euler.x),
            THREE.MathUtils.radToDeg(euler.y),
            THREE.MathUtils.radToDeg(euler.z)
        );
        this.lastScale.copy(model.scale);
    }

    protected override onSettingValues() {
        this.setEnvironmentValues(this.settingsValue.threedEnvironmentSettings);
        this.setCameraValues(this.settingsValue.threedCameraSettings, this.cameraMesh);
        this.setDevicesValues(this.settingsValue.threedDevicesSettings);
    }

    protected override setCameraValues(threedCameraSettings: ThreedCameraSettings, camera?: THREE.PerspectiveCamera | THREE.Object3D<THREE.Event>): void {
        super.setCameraValues(threedCameraSettings, camera);

        if (threedCameraSettings && this.perspectiveCamera) {
            this.perspectiveCamera.far = threedCameraSettings.far || this.perspectiveCamera.far;
            this.perspectiveCamera.near = threedCameraSettings.near || this.perspectiveCamera.near;
            this.perspectiveCamera.fov = threedCameraSettings.fov || this.perspectiveCamera.fov;
            this.perspectiveCamera.updateProjectionMatrix();
        }
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