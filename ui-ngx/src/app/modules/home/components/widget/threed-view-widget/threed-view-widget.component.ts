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

import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { PageComponent } from '@shared/components/page.component';
import { WidgetContext } from '@home/models/widget-component.models';
import { DataSet, DatasourceType, widgetType } from '@shared/models/widget.models';
import { DataKeyType } from '@shared/models/telemetry/telemetry.models';
import { WidgetSubscriptionOptions } from '@core/api/widget-api.models';
import { isNotEmptyStr } from '@core/utils';
import { EntityDataPageLink } from '@shared/models/query/query.models';
import { Observable, ReplaySubject } from 'rxjs';

import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { ThreedViewWidgetSettings } from './threed-models';

/*
Widget Type: Ultimi Valori
Widget settings: 
  1) tb-simple-card-widget-settings (from Simple Card)
  2) tb-map-widget-settings (from Image Map)

Per navigare tra le dashboard (ex click su un sensore) mettere a disposizione un Azione click (vedi Image Map -> Azioni) 
Per modificare la posizione , scala... vedi Markers Placement - Image Map (anche se forse è meglio aggiungere qualcosa sui settings anzichè utilizzare un altro widget)
*/
@Component({
  selector: 'tb-threed-view-widget',
  templateUrl: './threed-view-widget.component.html',
  styleUrls: ['./threed-view-widget.component.scss']
})
export class ThreedViewWidgetComponent extends PageComponent implements OnInit, AfterViewInit {

  settings: ThreedViewWidgetSettings;

  @Input()
  ctx: WidgetContext;

  @ViewChild('rendererContainer') rendererContainer?: ElementRef;

  public pointerLocked: boolean = false;

  private renderer = new THREE.WebGLRenderer();
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private objects: any[] = [];
  private controls?: PointerLockControls;
  private initialized = false;

  private raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);
  private pointerRaycaster = new THREE.Raycaster();
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private canJump = false;
  private prevTime = performance.now();
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private INTERSECTED: any;

  private readonly gravity = 9.8;
  private readonly mass = 30;
  private readonly speed = 400;

  constructor(
    protected store: Store<AppState>,
    protected cd: ChangeDetectorRef
  ) {
    super(store);

    this.createScene();
  }

  ngOnInit(): void {
    this.ctx.$scope.threedViewWidget = this;
    this.settings = this.ctx.settings;

    this.loadModel();
  }

  private loadModel() {
    console.log(this.settings);
    
    const modelUrl = this.settings.threedModelSettings.modelUrl;
    const modelEntityAlias = this.settings.threedModelSettings.modelEntityAlias;
    const modelUrlAttribute = this.settings.threedModelSettings.modelUrlAttribute;
    if (!modelEntityAlias || !modelUrlAttribute) {
      return this.loadModelFromBase64(modelUrl);
    }
    const entityAliasId = this.ctx.aliasController.getEntityAliasId(modelEntityAlias);
    if (!entityAliasId) {
      return this.loadModelFromBase64(modelUrl);
    }

    // Retrive the modelUrl from the entity Alias & Attribute
    const datasources = [
      {
        type: DatasourceType.entity,
        name: modelEntityAlias,
        aliasName: modelEntityAlias,
        entityAliasId,
        dataKeys: [
          {
            type: DataKeyType.attribute,
            name: modelUrlAttribute,
            label: modelUrlAttribute,
            settings: {},
            _hash: Math.random()
          }
        ]
      }
    ];
    const result = new ReplaySubject<[DataSet, boolean]>();
    let isUpdate = false;
    const imageUrlSubscriptionOptions: WidgetSubscriptionOptions = {
      datasources,
      hasDataPageLink: true,
      singleEntity: true,
      useDashboardTimewindow: false,
      type: widgetType.latest,
      callbacks: {
        onDataUpdated: (subscription) => {
          if (isNotEmptyStr(subscription.data[0]?.data[0]?.[1])) {
            result.next([subscription.data[0].data, isUpdate]);
          } else {
            result.next([[[0, modelUrl]], isUpdate]);
          }
          isUpdate = true;
        }
      }
    };
    this.ctx.subscriptionApi.createSubscription(imageUrlSubscriptionOptions, true).subscribe((subscription) => {
      const pageLink: EntityDataPageLink = {
        page: 0,
        pageSize: 1,
        textSearch: null,
        dynamic: true
      };
      subscription.subscribeAllForPaginatedData(pageLink, null);
    });
    this.loadModelFromAlias(result);
  }

  private loadModelFromBase64(modelBase64: string) {
    console.log("Loading model from base64...");
    const this_ = this;
    fetch(modelBase64)
      .then(res => res.arrayBuffer())
      .then(buffer => {
        try {
          new GLTFLoader().parse(buffer, "/", gltf => this_.onLoadModel(gltf));
        } catch (error) {
          // TODO: change with defaultThreedModelSettings.modelUrl
          this_.loadModelFromUrl('assets/models/gltf/classroom.glb');
        }
      })
      .catch(e => {
        // TODO: change with defaultThreedModelSettings.modelUrl
        this_.loadModelFromUrl('assets/models/gltf/classroom.glb');
      });
  }

  private loadModelFromUrl(modelUrl: string) {
    console.log("Loading model from url " + modelUrl + "...");
    const this_ = this;
    try {
      new GLTFLoader()
        .load(modelUrl, gltf => this_.onLoadModel(gltf));
    } catch (error) {
      // TODO: change with defaultThreedModelSettings.modelUrl
      this_.loadModelFromUrl('assets/models/gltf/classroom.glb');
    }
  }

  private loadModelFromAlias(alias: Observable<[DataSet, boolean]>) {
    const this_ = this;
    alias.subscribe(res => {
      const modelUrl = res[0][0][1];
      this_.loadModelFromUrl(modelUrl);
    });
  }

  private onLoadModel(gltf: GLTF) {
    //gltf.scene.scale.set(0.1, 0.1, 0.1);

    const root = gltf.scene;
    this.scene!.add(root);

    const box = new THREE.BoxHelper(root, 0xffff00);
    this.scene.add(box);

    this.listChildren(this.scene!.children);
    this.render();
  }

  ngAfterViewInit() {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
    this.animate();
  }

  lockCursor() {
    this.controls?.lock();
  }

  public onDataUpdated() {
    console.log(this.ctx.datasources);
    if (this.ctx.datasources.length > 0) {
      var tbDatasource = this.ctx.datasources[0];
      // TODO...
    }
  }

  private createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xcccccc);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    this.camera.position.set(0, 20, 0);

    const this_ = this;

    // controls
    this.controls = new PointerLockControls(this.camera, document.body);
    this.controls.addEventListener('lock', function () {
      this_.pointerLocked = true;
      this_.cd.detectChanges();
    });
    this.controls.addEventListener('unlock', function () {
      this_.pointerLocked = false;
      this_.cd.detectChanges();
    });
    this.scene.add(this.controls.getObject());

    // lights
    const ambientLight = new THREE.AmbientLight(0xFEFEFE, 1);
    ambientLight.position.set(0, 0, 0);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xFEFEFE, 1);
    directionalLight.position.set(70, 30, 0);
    this.scene.add(directionalLight);

    this.initialized = true;
  }

  listChildren(children: any) {
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


  private animate() {
    window.requestAnimationFrame(() => this.animate());

    this.tick();

    this.render();
  }

  private tick() {
    const time = performance.now();

    if (this.controls && this.controls.isLocked === true) {

      this.raycaster.ray.origin.copy(this.controls.getObject().position);
      //this.raycaster.ray.origin.y -= 10;

      const intersections = this.raycaster.intersectObjects(this.objects, false);
      const onObject = intersections.length > 0;

      this.pointerRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera!);
      const intersects = this.pointerRaycaster.intersectObjects(this.scene!.children, true);
      if (intersects.length > 0) {
        if (this.INTERSECTED != intersects[0].object) {
          if (this.INTERSECTED) this.INTERSECTED.material.emissive?.setHex(this.INTERSECTED.currentHex);

          this.INTERSECTED = intersects[0].object;
          this.INTERSECTED.currentHex = this.INTERSECTED.material.emissive?.getHex();
          const hexColor = this.ctx.settings.hexColor || 0xff0000;
          this.INTERSECTED.material.emissive?.setHex(hexColor);
        }
      } else {
        if (this.INTERSECTED) this.INTERSECTED.material.emissive?.setHex(this.INTERSECTED.currentHex);

        this.INTERSECTED = null;
      }

      const delta = (time - this.prevTime) / 1000;

      this.velocity.x -= this.velocity.x * 10.0 * delta;
      this.velocity.z -= this.velocity.z * 10.0 * delta;

      this.velocity.y -= this.gravity * this.mass * delta; // 100.0 = mass

      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize(); // this ensures consistent movements in all directions

      if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.speed * delta;
      if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * this.speed * delta;

      if (onObject === true) {

        this.velocity.y = Math.max(0, this.velocity.y);
        this.canJump = true;

      }

      this.controls.moveRight(- this.velocity.x * delta);
      this.controls.moveForward(- this.velocity.z * delta);

      this.controls.getObject().position.y += (this.velocity.y * delta); // new behavior

      if (this.controls.getObject().position.y < 10) {

        this.velocity.y = 0;
        this.controls.getObject().position.y = 10;

        this.canJump = true;

      }
    }

    this.prevTime = time;
  }

  public onResize(width: number, height: number): void {
    if (!this.initialized) return;

    this.camera!.aspect = width / height;
    this.camera!.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    this.render();
  }

  public render(): void {
    this.renderer.render(this.scene!, this.camera!);
  }


  @HostListener('window:keyup', ['$event'])
  keyUpEvent(event: KeyboardEvent) {
    switch (event.code) {

      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = false;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = false;
        break;

      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = false;
        break;

      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = false;
        break;

    }
  }

  @HostListener('window:keydown', ['$event'])
  keyDownEvent(event: KeyboardEvent) {

    switch (event.code) {

      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = true;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = true;
        break;

      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = true;
        break;

      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = true;
        break;

      case 'Space':
        if (this.canJump === true) this.velocity.y += 3 * this.mass;
        this.canJump = false;
        break;

    }
  }
}