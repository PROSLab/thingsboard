import { ThreedAbstractScene } from "./threed-abstract-scene";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ElementRef } from '@angular/core';

export class ThreedOrbitScene extends ThreedAbstractScene {
    
    protected orbit?: OrbitControls;

    constructor(canvas?: ElementRef) {
        super(canvas);
    }

    protected override initialize(canvas?: ElementRef): void {
        super.initialize(canvas);

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.update();
        this.orbit.addEventListener('change', () => this.render());
    }

    protected tick(): void { }
    public onKeyDown(event: KeyboardEvent): void { }
    public onKeyUp(event: KeyboardEvent): void { }
}