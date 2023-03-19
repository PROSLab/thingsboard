import { ElementRef, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BoxHelper, Vector3 } from 'three';
import {
    ThreedSceneSettings,
} from '@home/components/widget/threed-view-widget/threed-models';

export class ThreedSceneEditor {

    private renderer?: THREE.WebGLRenderer;
    private scene?: THREE.Scene;
    private camera?: THREE.PerspectiveCamera;
    private orbit?: OrbitControls;
    private transformControl?: TransformControls;
    private boxHelper?: BoxHelper;

    private rendererContainer: ElementRef;
    private models: Map<string, GLTF> = new Map();
    private initialValue?: ThreedSceneSettings;

    public positionChanged = new EventEmitter<Vector3>();
    public rotationChanged = new EventEmitter<Vector3>();
    public scaleChanged = new EventEmitter<Vector3>();

    constructor(canvas?: ElementRef) {
        this.rendererContainer = canvas;
        this.initialize(canvas);
    }

    private initialize(canvas?: ElementRef) {
        this.renderer = new THREE.WebGLRenderer(canvas ? { canvas: canvas.nativeElement } : undefined);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xcccccc);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(0, 5, 0);

        this.scene.add(new THREE.GridHelper(1000, 10, 0x888888, 0x444444));

        const ambientLight = new THREE.AmbientLight(0xFEFEFE, 1);
        ambientLight.position.set(0, 0, 0);
        this.scene.add(ambientLight);

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.update();
        this.orbit.addEventListener('change', () => this.render());

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

                console.log(newPosition, newRotation, newScale);
            }
        });
        this.scene.add(this.transformControl);

        if (canvas) {
            this.updateRendererSize();
            this.startRendering();
        }
    }

    public attachToElement(rendererContainer: ElementRef) {
        if (this.rendererContainer) throw new Error("Renderer already attached to element!");

        this.rendererContainer = rendererContainer;
        this.updateRendererSize();
        rendererContainer.nativeElement.appendChild(this.renderer.domElement);
        this.startRendering();
    }

    private updateRendererSize() {
        const rect = this.rendererContainer.nativeElement.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
    }

    private startRendering() {
        this.resize();
        this.animate();
    }

    private animate() {
        window.requestAnimationFrame(() => this.animate());

        this.tick();

        this.render();
    }

    private tick() {
        this.boxHelper?.update();

    }

    public render(): void {
        this.renderer.render(this.scene!, this.camera!);
    }

    public resize(width?: number, height?: number) {
        const rect = this.rendererContainer?.nativeElement.getBoundingClientRect();
        width = width || rect.width;
        height = height || rect.height;
        this.camera!.aspect = width / height;
        this.camera!.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        this.render();
    }

    public replaceModel(gltf: GLTF): void {
        //console.log("Replace model", gltf);
        this.removeModel(gltf.scene.uuid);
        this.addModel(gltf)
    }

    public addModel(gltf: GLTF): void {
        //console.log("Add model", gltf);

        const root = gltf.scene;
        this.models.set(root.uuid, gltf);
        this.setValues();

        this.scene!.add(root);

        this.transformControl.detach();
        this.transformControl.attach(root);

        this.boxHelper = new THREE.BoxHelper(root, 0xffff00);
        this.scene.add(this.boxHelper);

        //this.listChildren(this.scene!.children);
        this.render();
    }

    public removeModel(uuid: string): void {
        //console.log("Remove model", uuid);
        if (!this.models.has(uuid)) return;

        this.scene!.remove(this.models.get(uuid).scene);
    }

    public updateValue(value: ThreedSceneSettings): void {
        this.initialValue = value;

        this.setValues();
    }

    private setValues() {
        // TODO: this.models.get(value.models[0].uuid)
        if (this.models.size == 0 || !this.initialValue) return;

        const [model] = this.models.values();

        const position = this.initialValue.threedPositionVectorSettings;
        const rotation = this.initialValue.threedRotationVectorSettings;
        const scale = this.initialValue.threedScaleVectorSettings;
        //console.log(position, rotation, scale);

        model.scene.position.set(position.x, position.y, position.z);
        model.scene.rotation.set(THREE.MathUtils.degToRad(rotation.x), THREE.MathUtils.degToRad(rotation.y), THREE.MathUtils.degToRad(rotation.z));
        model.scene.scale.set(scale.x, scale.y, scale.z);
    }
    /*
    private listChildren(children: any) {
      let child;
      for (let i = 0; i < children.length; i++) {
        child = children[i];

        // Calls this function again if the child has children
        if (child.children && child.children.length > 0) {
          this.listChildren(child.children);
        }
        // Logs if this child last in recursion
        else {
          if (child.type == "Mesh")
            this.objects.push(child);
        }
      }
    }*/

    public onKeyDown(event: KeyboardEvent): void {
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
        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight":
                this.transformControl?.setTranslationSnap(null);
                this.transformControl?.setRotationSnap(null);
                this.transformControl?.setScaleSnap(null);
                break;

        }
    }

    public changeTransformControlMode(mode: "translate" | "rotate" | "scale") {
        this.transformControl?.setMode(mode);
    }
}