import { ElementRef } from "@angular/core";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import { ThreedFpsScene } from "./threed-fps-scene";
import * as THREE from 'three';

interface Label {
    divElement: HTMLDivElement;
    cssObject: CSS2DObject;
    layer: number;
}

export class ThreedNavigateScene extends ThreedFpsScene {

    private labelRenderer?: CSS2DRenderer;
    private INTERSECTED?: any;
    private pointerRaycaster = new THREE.Raycaster();

    private labels: Map<string, Label>;

    private readonly initialLabelLayerIndex = 5;
    private lastLayerIndex = this.initialLabelLayerIndex;

    protected override initialize(canvas?: ElementRef<any>): void {
        super.initialize(canvas);

        this.initializeLabelRenderer();
        this.initializeLabels();

        this.camera?.layers.enableAll();
    }

    private initializeLabelRenderer() {
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
    }

    private initializeLabels() {
        this.labels = new Map();
    }

    private createLabel(name: string): Label {
        const layer = this.lastLayerIndex++;
        const divElement = document.createElement('div');
        divElement.className = 'label';
        divElement.textContent = 'initial content';
        divElement.style.marginTop = '-1em';
        const cssObject = new CSS2DObject(divElement);
        cssObject.layers.set(layer);

        const label = { divElement, cssObject, layer };
        this.labels.set(name, label)
        return label;
    }

    public override attachToElement(rendererContainer: ElementRef<any>): void {
        super.attachToElement(rendererContainer);

        rendererContainer.nativeElement.appendChild(this.labelRenderer.domElement);
        const rect = rendererContainer.nativeElement.getBoundingClientRect();
        this.labelRenderer.setSize(rect.width, rect.height);
    }

    public addModel(model: GLTF, id?: string, tooltip: boolean = false): Label | undefined {
        super.addModel(model, id);

        if (tooltip) {
            const currentModel = this.models.get(model.scene.uuid);
            const label = this.createLabel(model.scene.uuid);

            /*const box = new THREE.Box3().setFromObject(model.scene);
            const center = box.getCenter(new THREE.Vector3());
            label.position.set(0, center.y, 0);*/

            label.cssObject.position.set(0, 0, 0);
            currentModel.scene.add(label.cssObject);

            return label;
        }
    }

    public override resize(width?: number, height?: number): void {
        super.resize(width, height);

        this.labelRenderer.setSize(width, height);
    }

    public override render(): void {
        super.render();

        this.labelRenderer?.render(this.scene!, this.camera!);
    }

    private hasParentWithUUID(uuid: string, object: THREE.Object3D) {
        if (object.uuid == uuid) return true;
        if (object.parent != null) return this.hasParentWithUUID(uuid, object.parent);
        return false;
    }

    protected override tick() {
        super.tick();

        if (this.controls && this.controls.isLocked === true) {
            this.pointerRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera!);
            const intersects = this.pointerRaycaster.intersectObjects(this.scene!.children, true);

            if (intersects.length > 0) {
                if (this.INTERSECTED != intersects[0].object) {
                    this.deselectModel();

                    this.INTERSECTED = intersects[0].object;
                    this.INTERSECTED!.userData.currentHex = this.INTERSECTED.material.emissive?.getHex();
                    const hexColor = 0xff0000; //TODO: this.settingsValue?.hexColor || 0xff0000;
                    this.INTERSECTED!.material.emissive?.setHex(hexColor);

                    for (const label of this.labels.values()) {
                        if (this.hasParentWithUUID(label.cssObject.parent.uuid, this.INTERSECTED)) {
                            this.camera!.layers.enable(label.layer);
                            this.INTERSECTED.userData.layer = label.layer;
                            break;
                        }
                    }
                }
            } else {
                this.deselectModel();
                this.INTERSECTED = null;
            }
        }
    }

    private deselectModel(): void {
        if (this.INTERSECTED) {
            this.INTERSECTED.material.emissive?.setHex(this.INTERSECTED.userData.currentHex);
            const layer = this.INTERSECTED.userData.layer;
            if (layer >= this.initialLabelLayerIndex)
                this.camera!.layers.disable(layer);
        }
    }

    public updateLabelContent(uuid: string, content: string) {
        if (!this.labels.has(uuid)) return;

        const divLabel = this.labels.get(uuid).divElement;
        divLabel.innerHTML = content;
        //divLabel.textContent = content;
    }
}