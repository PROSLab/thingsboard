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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { AppState } from '@core/core.state';
import { WidgetContext } from '@home/models/widget-component.models';
import { Store } from '@ngrx/store';
import { PageComponent } from '@shared/components/page.component';
import { ThreedScenes } from './threed/threed-scenes/threed-scenes';
import { ThreedGenericSceneManager } from './threed/threed-managers/threed-generic-scene-manager';
import * as THREE from 'three';
import { Subscription } from 'rxjs';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ThreedOrbitControllerComponent } from './threed/threed-components/threed-orbit-controller-component';
import { DebugablePerspectiveCamera } from './threed/threed-extensions/debugable-perspective-camera';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { ThreedMoveToPositionComponent } from './threed/threed-components/threed-move-to-position-component';
import * as CANNON from 'cannon-es'
import { ThreedFirstPersonControllerComponent } from './threed/threed-components/threed-first-person-controller-component';
import { ThreedPerspectiveCameraComponent } from './threed/threed-components/threed-perspective-camera-component';
import { DeviceService } from '@core/http/device.service';
import { AttributeService } from '@core/http/attribute.service';
import { EntityId } from '@shared/models/id/entity-id';
import { AttributeScope, DataKeyType, LatestTelemetry } from '@shared/models/telemetry/telemetry.models';
import { ThreedDefaultAmbientComponent } from './threed/threed-components/threed-default-ambient-component';
import { ThreedVrControllerComponent } from './threed/threed-components/threed-vr-controller-component';
import { ThreedSceneBuilder } from './threed/threed-scenes/threed-scene-builder';
import { ThreedGameObjectComponent } from './threed/threed-components/threed-gameobject-component';
import { ThreedRigidbodyComponent } from './threed/threed-components/threed-rigidbody-component';
import { ShapeType } from 'three-to-cannon';
import { IThreedPhysicObject } from './threed/threed-components/ithreed-physic-object';

@Component({
  selector: 'tb-threed-simulation-widget',
  templateUrl: './threed-simulation-widget.component.html',
  styleUrls: ['./threed-simulation-widget.component.scss']
})
export class ThreedSimulationWidgetComponent extends PageComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input()
  ctx: WidgetContext;

  @ViewChild('rendererContainer') rendererContainer?: ElementRef;

  private simulationScene: ThreedGenericSceneManager;
  //private world: CANNON.World;
  private subscriptions: Subscription[] = [];

  public sensed: boolean = false;
  pirRangeId: number;

  constructor(
    protected store: Store<AppState>,
    private cd: ChangeDetectorRef,
    private deviceService: DeviceService,
    private attributeService: AttributeService,
  ) {
    super(store);

    const builder = new ThreedSceneBuilder({ vr: true, shadow: true })
      .add(new ThreedPerspectiveCameraComponent(new THREE.Vector3(0, 1.7, 0)))
      .add(new ThreedDefaultAmbientComponent(false))
      .add(new ThreedFirstPersonControllerComponent())
      .add(new ThreedVrControllerComponent());
    this.simulationScene = builder.build();

    this.includeFeaturesToSimulationScene();
  }

  private async includeFeaturesToSimulationScene() {
    // Load the models
    const pirSensor: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/PIR Sensor.glb")).scene;
    pirSensor.name = "Pir Sensor";
    pirSensor.position.set(0, 0.643, 0.5);
    pirSensor.rotation.x = -Math.PI;
    const desk: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/Desk.glb")).scene;
    desk.add(pirSensor);
    const gltfHumanoid: GLTF = (await new GLTFLoader().loadAsync("./assets/models/gltf/humanoid.glb"));
    const humanoid = gltfHumanoid.scene;
    humanoid.name = "Person Mesh";
    const mixer = new THREE.AnimationMixer(humanoid);
    mixer.clipAction(gltfHumanoid.animations[0]).play();
    humanoid.position.set(1, 0, 1);


    // Add the model to the scene and add the physics
    // GROUND
    // Static ground plane
    const groundShape = new CANNON.Plane()
    const groundBody = new CANNON.Body({ mass: 0 })
    groundBody.addShape(groundShape)
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    const material = new THREE.MeshBasicMaterial({ color: 0 });
    const geometry = new THREE.PlaneGeometry(200, 200);
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    const groundGameObject = new ThreedGameObjectComponent(ground);
    this.simulationScene.add(groundGameObject, true);
    this.simulationScene.add(new ThreedRigidbodyComponent({ mesh: groundGameObject, physicBody: groundBody, handleVisuals: true }), true);

    // PERSON
    const humanoidGameObject = new ThreedGameObjectComponent(humanoid);
    const humanoidRigidbody = new ThreedRigidbodyComponent({ mesh: humanoidGameObject, handleVisuals: false, autoDefineBody: { type: ShapeType.BOX } });
    this.subscriptions.push(humanoidRigidbody.onBeginCollision.subscribe(o => this.processCollisionEvent(o, 'begin')));
    this.subscriptions.push(humanoidRigidbody.onEndCollision.subscribe(o => this.processCollisionEvent(o, 'end')));
    this.simulationScene.add(humanoidGameObject, true)
    this.simulationScene.add(humanoidRigidbody, true);

    // DESK
    const deskGameObject = new ThreedGameObjectComponent(desk);
    this.simulationScene.add(deskGameObject, true);
    this.simulationScene.add(new ThreedRigidbodyComponent({ mesh: deskGameObject, handleVisuals: true, autoDefineBody: { type: ShapeType.BOX } }), true);

    // PIR Sensor Range Collider
    const cylinderBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Cylinder(0.01, 1, .65, 20),
      position: new CANNON.Vec3(-0.0726, 0.309, 0.458),//-0.0726, 0.037, 0.0419
      isTrigger: true
    });
    this.pirRangeId = cylinderBody.id;
    this.simulationScene.add(new ThreedRigidbodyComponent({ physicBody: cylinderBody }), true);


    // OTHRE CONFIGUATIONS
    this.simulationScene.physicManager.setVisualiseColliders(true);
    this.simulationScene.physicManager.world.gravity.set(0, -9.8, 0);

    const moveToPosition = new ThreedMoveToPositionComponent();
    this.simulationScene.add(moveToPosition, true);
    this.subscriptions.push(moveToPosition.onPointSelected.subscribe(p => this.moveToPosition(humanoid, new THREE.Vector3(p.x, humanoid.position.y, p.z)), true));
    //this.moveRandomly(humanoid);

    const clock = new THREE.Clock();
    this.subscriptions.push(this.simulationScene.onTick.subscribe(_ => {
      // update animation
      if (this.tween) {
        const delta = clock.getDelta();
        mixer.update(delta);
      }
    }));
  }

  private processCollisionEvent(e: {
    event: CANNON.Constraint;
    object: IThreedPhysicObject;
  }, type: 'begin' | 'end') {
    if (e.object.physicBody.id == this.pirRangeId) {
      this.sensed = type == 'begin';
      this.cd.detectChanges();
      this.savePresence(this.sensed ? 1 : 0);
    }
  }

  // Create a function to animate the cube's movement
  private moveInSquare(person: THREE.Object3D, index: number) {
    const targetPositions = [
      new THREE.Vector3(-1, person.position.y, -1),
      new THREE.Vector3(-1, person.position.y, 1),
      new THREE.Vector3(1, person.position.y, 1),
      new THREE.Vector3(1, person.position.y, -1),
    ];
    const nextPosition = targetPositions[index % targetPositions.length];

    this.moveToPosition(person, nextPosition).onComplete(() => { this.moveInSquare(person, ++index) });
  }

  // Create a function to animate the cube's movement
  private moveRandomly(person: THREE.Object3D) {
    let nextPosition = person.position.clone();
    if (Math.random() > 0.5) nextPosition = new THREE.Vector3(Math.random() * 4, 0, Math.random() * 4);
    else nextPosition = new THREE.Vector3(Math.random() * 4, 0, Math.random() * 4).negate();
    nextPosition.setY(person.position.y);

    this.moveToPosition(person, nextPosition).onComplete(() => { this.moveRandomly(person) });
  }

  private tween?: TWEEN.Tween;
  private moveToPosition(person: THREE.Object3D, targetPosition: THREE.Vector3, forceStop: boolean = true): TWEEN.Tween {
    if (forceStop) {
      this.tween?.stop();
      this.tween = undefined;
    }
    if (this.tween) return;

    person.lookAt(targetPosition);
    // Create a new TWEEN object to animate the cube's position
    this.tween = new TWEEN.Tween(person.position)
      .to(targetPosition, 2000) // animate the cube to the target position over 2 seconds
      .onComplete(() => {
        this.tween = undefined;
      })
      .start();
    return this.tween;
  }

  private drawDirection(mesh: THREE.Object3D, color: number = 0xff0000): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.quaternion);
    const position = new THREE.Vector3();
    mesh.localToWorld(position);

    const arrowHelper = new THREE.ArrowHelper(direction.clone().normalize(), position, 1, color);
    this.simulationScene.scene.add(arrowHelper);

    return direction;
  }

  private entityId: EntityId;

  ngOnInit() {
    this.ctx.$scope.threedSimulationWidget = this;


    this.ctx.datasources.forEach(datasource => {
      this.entityId = {
        entityType: datasource.entityType,
        id: datasource.entityId
      }
    });
    console.log(this.ctx);
  }

  savePresence(presence?: number) {
    const saveData = [{
      key: "presence",//this.datasource.dataKeys[0].name,
      value: presence ?? Math.round((Math.random() * 10))
    }];
    this.attributeService.saveEntityTimeseries(this.entityId, LatestTelemetry.LATEST_TELEMETRY, saveData).subscribe(() => console.log("presence saved"));
  }

  lock($event) {
    $event.stopPropagation();
    this.simulationScene.getComponent(ThreedFirstPersonControllerComponent)?.lockControls();
  }

  ngAfterViewInit(): void {
    this.simulationScene?.attachToElement(this.rendererContainer);
  }

  ngOnDestroy(): void {
    this.simulationScene?.destroy();
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  public onEditModeChanged() {
    this.simulationScene.active = !this.ctx.isEdit;
  }

  public onResize(width: number, height: number): void {
    this.simulationScene?.resize(width - 2, height - 2);
  }
}
