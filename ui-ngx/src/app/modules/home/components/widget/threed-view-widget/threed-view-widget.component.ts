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

  renderer = new THREE.WebGLRenderer();
  scene = null;
  camera = null;
  mesh = null;

  constructor(protected store: Store<AppState>,
    protected cd: ChangeDetectorRef) {
    super(store);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    this.camera.position.z = 1000;

    const geometry = new THREE.BoxGeometry(200, 200, 200);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    this.mesh = new THREE.Mesh(geometry, material);

    this.scene.add(this.mesh);
  }

  ngOnInit(): void {
    this.ctx.$scope.threedViewWidget = this;
    //this.settings = this.ctx.settings;
    //this.qrCodeTextFunction = this.settings.useQrCodeTextFunction ? parseFunction(this.settings.qrCodeTextFunction, ['data']) : null;
  }

  ngAfterViewInit() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
    this.animate();
  }

  animate() {
    window.requestAnimationFrame(() => this.animate());
    this.mesh.rotation.x += 0.01;
    this.mesh.rotation.y += 0.02;
    this.renderer.render(this.scene, this.camera);
  }

  public onResize() : void {
    console.log("onresize!!");
  }

}