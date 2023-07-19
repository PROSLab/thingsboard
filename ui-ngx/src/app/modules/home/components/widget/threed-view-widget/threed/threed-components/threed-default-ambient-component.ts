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
import { IThreedSceneManager } from "../threed-managers/ithreed-scene-manager";
import { ThreedWebRenderer } from "../threed-managers/threed-web-renderer";
import { ThreedBaseComponent } from "./threed-base-component";
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { IThreedMesh } from './ithreed-mesh';

export class ThreedDefaultAmbientComponent extends ThreedBaseComponent {

    private createGridHelper: boolean;
    private createDefaultCube: boolean;
    private pmremGenerator: THREE.PMREMGenerator;
    private neutralEnvironment: THREE.Texture;
    private plane: THREE.Object3D;

    constructor(createGridHelper: boolean, createDefaultCube: boolean = false) {
        super();
        this.createGridHelper = createGridHelper;
        this.createDefaultCube = createDefaultCube;
    }

    initialize(sceneManager: IThreedSceneManager): void {
        super.initialize(sceneManager);

        this.initializeScene();

        this.initializeEnvironment();

        if (this.createGridHelper)
            this.initializeGrid();

        this.initializeLights();

        if (this.sceneManager.configs.shadow)
            this.initializeShadow();

        if(this.createDefaultCube)
            this.addCube();
    }

    private initializeScene() {
        this.sceneManager.scene.background = new THREE.Color(0xcccccc);
    }

    private initializeEnvironment() {
        const renderer = this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer();

        this.pmremGenerator = new THREE.PMREMGenerator(renderer);
        this.pmremGenerator.compileEquirectangularShader();

        this.neutralEnvironment = this.pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.sceneManager.scene.environment = this.neutralEnvironment;

        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = Math.pow(2, -0.5);
    }

    private initializeGrid() {
        const size = 100;
        const rectSize = 1;
        this.sceneManager.scene.add(new THREE.GridHelper(size, size / rectSize, 0x888888, 0x444444));
    }

    private initializeLights() {
        const ambientLight = new THREE.AmbientLight(0xFEFEFE, 0.3);
        ambientLight.position.set(0, 0, 0);
        this.sceneManager.scene.add(ambientLight);
    }

    private initializeShadow() {
        this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer().shadowMap.enabled = true;
        this.sceneManager.getTRenderer(ThreedWebRenderer).getRenderer().shadowMap.type = THREE.PCFSoftShadowMap;

        //Create a DirectionalLight and turn on shadows for the light
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(20, 250, 10);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        //Set up shadow properties for the light
        const size = 200;
        light.shadow.camera.left = -size;
        light.shadow.camera.right = size;
        light.shadow.camera.top = size;
        light.shadow.camera.bottom = -size;
        light.shadow.mapSize.width = 128;
        light.shadow.mapSize.height = 128;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
        light.shadow.bias = 0.01;
        light.shadow.blurSamples = 10;
        this.sceneManager.scene.add(light);

        //Create a plane that receives shadows (but does not cast them)
        const planeGeometry = new THREE.PlaneGeometry(size, size);
        const planeMaterial = new THREE.ShadowMaterial();
        planeMaterial.opacity = 0.5;
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotateX(-Math.PI / 2);
        plane.position.y = -5;
        plane.castShadow = false;
        plane.receiveShadow = true;
        this.sceneManager.scene.add(plane);
    }

    private addCube() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0,0.5,0);
        this.sceneManager.scene.add(cube);
    }
}