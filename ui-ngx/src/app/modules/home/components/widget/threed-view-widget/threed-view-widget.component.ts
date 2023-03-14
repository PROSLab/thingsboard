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

import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AppState } from '@app/core/core.state';
import { WidgetContext } from '@app/modules/home/models/widget-component.models';
import { PageComponent } from '@app/shared/public-api';
import { Store } from '@ngrx/store';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'tb-threed-view-widget',
  templateUrl: './threed-view-widget.component.html',
  styleUrls: ['./threed-view-widget.component.scss']
})
export class ThreedViewWidgetComponent extends PageComponent implements OnInit, AfterViewInit {

  //settings: MarkdownWidgetSettings;

  @Input()
  ctx: WidgetContext;

  @ViewChild('rendererContainer') rendererContainer: ElementRef;

  private renderer = new THREE.WebGLRenderer();
  private scene?: THREE.Scene;
  private controls?: OrbitControls;
  private camera?: THREE.PerspectiveCamera;
  private initialized = false;

  constructor(protected store: Store<AppState>,
    protected cd: ChangeDetectorRef) {
    super(store);

    this.createScene();
  }

  ngOnInit(): void {
    this.ctx.$scope.threedViewWidget = this;
    //this.settings = this.ctx.settings;
    //this.qrCodeTextFunction = this.settings.useQrCodeTextFunction ? parseFunction(this.settings.qrCodeTextFunction, ['data']) : null;
  }

  ngAfterViewInit() {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
    this.animate();
  }

  private createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcccccc);
    //this.scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    this.camera.position.set(400, 200, 0);

    // controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.listenToKeyEvents(window); // optional
    this.controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 2;

    // model
    const _this = this;
    const loader = new GLTFLoader().setPath( 'assets/models/gltf/' );
    loader.load( 'classroom.glb', function ( gltf ) {
      _this.scene.add( gltf.scene );
      _this.render();
    } );

    // lights
    
    const dirLight1 = new THREE.DirectionalLight(0xffffff);
    dirLight1.position.set(1, 1, 1);
    this.scene.add(dirLight1);
    const ambientLight = new THREE.AmbientLight(0x222222);
    this.scene.add(ambientLight);
    

    this.initialized = true;
  }

  private animate() {
    window.requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.render();
  }

  public onResize(width: number, height: number): void {
    if (!this.initialized) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    this.render();
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

}