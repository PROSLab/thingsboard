import { ElementRef, HostListener } from '@angular/core';
import * as THREE from 'three';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    ThreedSceneSettings, ThreedViewWidgetSettings,
} from '@home/components/widget/threed-view-widget/threed-models';
import { Object3D } from 'three';
import { WidgetContext } from '@home/models/widget-component.models';

export abstract class ThreedAbstractScene {

    private rendererContainer: ElementRef;

    protected renderer?: THREE.WebGLRenderer;
    protected scene?: THREE.Scene;
    protected camera?: THREE.PerspectiveCamera;

    protected models: Map<string, GLTF> = new Map();
    protected objects: Object3D[] = [];
    protected settingsValue?: ThreedViewWidgetSettings;

    constructor(canvas?: ElementRef) {
        this.rendererContainer = canvas;
        this.initialize(canvas);
    }

    protected initialize(canvas?: ElementRef) {
        this.renderer = new THREE.WebGLRenderer(canvas ? { canvas: canvas.nativeElement } : undefined);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xcccccc);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.set(0, 5, 0);

        this.scene.add(new THREE.GridHelper(1000, 10, 0x888888, 0x444444));

        const ambientLight = new THREE.AmbientLight(0xFEFEFE, 1);
        ambientLight.position.set(0, 0, 0);
        this.scene.add(ambientLight);

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

    protected animate() {
        window.requestAnimationFrame(() => this.animate());

        this.tick();

        this.render();
    }

    protected abstract tick(): void;

    public render(): void {
        this.renderer.render(this.scene!, this.camera!);
    }

    public onDataChanged(ctx: WidgetContext): void{}

    public resize(width?: number, height?: number) {
        const rect = this.rendererContainer?.nativeElement.getBoundingClientRect();
        width = width || rect.width;
        height = height || rect.height;
        this.camera!.aspect = width / height;
        this.camera!.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        //this.render();
    }

    public replaceModel(gltf: GLTF): void {
        this.removeModel(gltf.scene.uuid, false);
        this.addModel(gltf)
    }

    public addModel(gltf: GLTF): void {
        const root = gltf.scene;
        this.models.set(root.uuid, gltf);
        this.setValues();

        this.scene!.add(root);
        this.recalculateSceneObjects();

        this.render();
    }

    public removeModel(uuid: string, calculateSceneObjects: boolean = true): void {
        if (!this.models.has(uuid)) return;

        this.scene!.remove(this.models.get(uuid).scene);

        if (calculateSceneObjects) {
            this.recalculateSceneObjects();
        }
    }

    private recalculateSceneObjects(): void {
        this.objects = [];
        this.listChildren(this.scene.children);
    }

    private listChildren(children: any) {
        //console.log(children);
        let child;
        for (let i = 0; i < children.length; i++) {
            child = children[i];
            //console.log(child);

            // Calls this function again if the child has children
            if (child.children && child.children.length > 0) {
                this.listChildren(child.children);
            }
            // Logs if this child last in recursion
            else {
                //console.log('Reached bottom with: ', child);
                if (child.type == "Mesh")
                    this.objects.push(child);
            }
        }
    }

    public updateValue(value: ThreedViewWidgetSettings): void {
        this.settingsValue = value;

        this.setValues();
    }

    private setValues() {
        // TODO: this.models.get(value.models[0].uuid)
        if (this.models.size == 0 || !this.settingsValue) return;

        const [model] = this.models.values();

        const position = this.settingsValue.threedSceneSettings.threedPositionVectorSettings;
        const rotation = this.settingsValue.threedSceneSettings.threedRotationVectorSettings;
        const scale = this.settingsValue.threedSceneSettings.threedScaleVectorSettings;

        model.scene.position.set(position.x, position.y, position.z);
        model.scene.rotation.set(THREE.MathUtils.degToRad(rotation.x), THREE.MathUtils.degToRad(rotation.y), THREE.MathUtils.degToRad(rotation.z));
        model.scene.scale.set(scale.x, scale.y, scale.z);
    }

    public abstract onKeyDown(event: KeyboardEvent): void;

    public abstract onKeyUp(event: KeyboardEvent): void;
}