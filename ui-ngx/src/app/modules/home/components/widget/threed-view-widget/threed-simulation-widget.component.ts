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
import { ThreedGenericSceneManager } from './threed/threed-managers/threed-generic-scene-manager';
import * as THREE from 'three';
import { Subscription } from 'rxjs';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { ThreedMoveToPositionComponent } from './threed/threed-components/threed-move-to-position-component';
import * as CANNON from 'cannon-es'
import { ThreedFirstPersonControllerComponent } from './threed/threed-components/threed-first-person-controller-component';
import { ThreedPerspectiveCameraComponent } from './threed/threed-components/threed-perspective-camera-component';
import { AttributeService } from '@core/http/attribute.service';
import { EntityId } from '@shared/models/id/entity-id';
import { LatestTelemetry } from '@shared/models/telemetry/telemetry.models';
import { ThreedDefaultAmbientComponent } from './threed/threed-components/threed-default-ambient-component';
import { ThreedVrControllerComponent } from './threed/threed-components/threed-vr-controller-component';
import { ThreedSceneBuilder } from './threed/threed-scenes/threed-scene-builder';
import { ThreedGameObjectComponent } from './threed/threed-components/threed-gameobject-component';
import { ThreedRigidbodyComponent } from './threed/threed-components/threed-rigidbody-component';
import { ShapeType, } from 'three-to-cannon';
import { IThreedPhysicObject } from './threed/threed-components/ithreed-physic-object';
import { ThreedEarthquakeController } from './threed/threed-managers/threed-earthquake-controller';
import { ThreedAnimatorComponent } from './threed/threed-components/threed-animator-component';
import { ThreedGroupGameObjectComponent } from './threed/threed-components/threed-group-gameobject-component';
import { ThreedPersonComponent } from './threed/threed-components/threed-person-component';
import * as PF from "pathfinding";
import { ThreedNavMeshComponent } from './threed/threed-components/threed-nav-mesh-component';



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
  earthquakeScale: number = 1;
  earthquakeController: ThreedEarthquakeController;

  constructor(
    protected store: Store<AppState>,
    private cd: ChangeDetectorRef,
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

    // SETUP World
    const world = this.simulationScene.physicManager.world;
    // Tweak contact properties.
    // Contact stiffness - use to make softer/harder contacts
    world.defaultContactMaterial.contactEquationStiffness = 1e9
    // Stabilization time in number of timesteps
    world.defaultContactMaterial.contactEquationRelaxation = 4
    const solver = new CANNON.GSSolver()
    solver.iterations = 7
    solver.tolerance = 0.1
    world.solver = new CANNON.SplitSolver(solver)
    world.gravity.set(0, -9.8, 0);


    world.defaultContactMaterial.contactEquationStiffness = 1e6;
    world.defaultContactMaterial.contactEquationRelaxation = 3;
    world.allowSleep = true;
    world.broadphase = new CANNON.SAPBroadphase(world);


    // SETUP EARTHQUAKE CONTROLLER (it will create the static & dynamic ground for simulation)
    this.earthquakeController = new ThreedEarthquakeController(5, this.simulationScene, {
      duration: {
        timeToReachPeak: 3,
        peakTime: 5,
        timeToEnd: 8
      }
    });



    // LOAD MODELS
    const pirSensor: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/PIR Sensor.glb")).scene;
    pirSensor.name = "Pir Sensor";
    pirSensor.position.set(0, 0.643, 0.5);
    pirSensor.rotation.x = -Math.PI;
    const desk: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/Desk.glb")).scene;
    desk.add(pirSensor);
    const gltfHumanoid: GLTF = (await new GLTFLoader().loadAsync("./assets/models/gltf/humanoid.glb"));
    const humanoid = gltfHumanoid.scene;
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0ff0ff });
    const sphereGeometry = new THREE.SphereGeometry(0.1);
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);






    const aula: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/Aula Physics.glb")).scene;
    aula.position.set(0, this.earthquakeController.getFloorHeight(), 0);
    const aulaGroupGO = new ThreedGroupGameObjectComponent(aula);
    this.simulationScene.add(aulaGroupGO, true);


    const navMesh = new ThreedNavMeshComponent(aulaGroupGO);
    this.simulationScene.add(navMesh, true);
    navMesh.visualizeGrid();


    const person = new ThreedPersonComponent(navMesh, gltfHumanoid);
    this.simulationScene.add(person, true);
    //const start = new THREE.Vector3(-3.5, 0, 2.5);
    //const end = new THREE.Vector3(-6, 0, 0);
    //person.findPathToDesk(start, end);
    this.earthquakeController.MagnitudeChanged.subscribe(m => person.earthquakeAlert(m));


    /*
    
        // PEOPLE
        for (let i = 0; i < 10; i++) {
          const humanoidClone = cloneGltf(gltfHumanoid).scene;
          const x = Math.random() * 20 - 10;
          const z = Math.random() * 20 - 10;
          humanoidClone.position.set(x, this.earthquakeController.getFloorHeight(), z);
          const humanoidGameObject = new ThreedGameObjectComponent(humanoidClone);
          const humanoidPhysicBody = new CANNON.Body({ isTrigger: true });
          humanoidPhysicBody.addShape(new CANNON.Box(new CANNON.Vec3(0.15, 0.85, 0.15)), new CANNON.Vec3(0, 0.85, 0));
          const humanoidRigidbody = new ThreedRigidbodyComponent({ mesh: humanoidGameObject, physicBody: humanoidPhysicBody, handleVisuals: false });
          const humanoidAnimator = new ThreedAnimatorComponent(humanoidGameObject, ...gltfHumanoid.animations);
    
          humanoidAnimator.play("Armature|mixamo.com|Layer0");
          this.subscriptions.push(humanoidRigidbody.onBeginCollision.subscribe(o => this.processCollisionEvent(o, 'begin')));
          this.subscriptions.push(humanoidRigidbody.onEndCollision.subscribe(o => this.processCollisionEvent(o, 'end')));
          this.simulationScene.add(humanoidGameObject, true)
          this.simulationScene.add(humanoidRigidbody, true);
          this.simulationScene.add(humanoidAnimator, true);
        }
    
    
    
    
        // DESK & SPHERE & PIR Sensor Range Collider
        for (let index = 0; index < 8; index++) {
          // DESK
          const deskMesh = desk.clone();
          deskMesh.position.set(index * 1.5, this.earthquakeController.getFloorHeight(), 0);
          const deskGameObject = new ThreedGameObjectComponent(deskMesh);
          const deskRigidbody = new ThreedRigidbodyComponent({
            mesh: deskGameObject,
            bodyOptions: { mass: 40, type: CANNON.BODY_TYPES.DYNAMIC, material: new CANNON.Material({ restitution: 0 }), linearDamping: 0.1, angularDamping: 0.1 },
            handleVisuals: true,
            autoDefineBody: { type: ShapeType.BOX }
          });
          this.simulationScene.add(deskGameObject, true);
          this.simulationScene.add(deskRigidbody, true);
    
    
          //SPHERE over the desk
          const sphereMeshClone = sphereMesh.clone();
          sphereMeshClone.position.set(deskMesh.position.x, deskMesh.position.y + 1, deskMesh.position.z);
          const sphereMeshObject = new ThreedGameObjectComponent(sphereMeshClone);
          const sphereMeshbody = new ThreedRigidbodyComponent({ mesh: sphereMeshObject, bodyOptions: { mass: 0.5 }, handleVisuals: true, autoDefineBody: { type: ShapeType.SPHERE } });
          this.simulationScene.add(sphereMeshObject, true);
          this.simulationScene.add(sphereMeshbody, true);
    
    
          // PIR Sensor Range Collider
          const height = 0.65;
          const radius = 0.5;
          const cylinderBody = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Cylinder(0.01, radius, height, 20),
            isTrigger: true
          });
          this.pirRangeId = cylinderBody.id;
          const link = {
            rigidbody: deskRigidbody,
            offset: new CANNON.Vec3(-0.0726, height / 2, 0.458), // y = 0.309
          }
          this.simulationScene.add(new ThreedRigidbodyComponent({ physicBody: cylinderBody, link }), true);
        }
    
    */

    // OTHER CONFIGUATIONS
    this.simulationScene.physicManager.setVisualiseColliders(true);
    //gorundRigidbody.setVisualiseColliders(false);
    console.log(world);


    const moveToPosition = new ThreedMoveToPositionComponent();
    this.simulationScene.add(moveToPosition, true);
    this.subscriptions.push(moveToPosition.onPointSelected.subscribe(p => this.moveToPosition(humanoid, new THREE.Vector3(p.x, humanoid.position.y, p.z)), true));
    //this.moveRandomly(humanoid);


    const clock = new THREE.Clock();
    this.subscriptions.push(this.simulationScene.onTick.subscribe(_ => {
      const delta = clock.getDelta();

      // update animation
      if (this.tween) {
        //mixer.update(delta);
      }

      this.earthquakeController.update(delta);
    }));
  }

  private processCollisionEvent(e: {
    event: CANNON.Constraint;
    object: IThreedPhysicObject;
  }, type: 'begin' | 'end') {
    if (e.object?.physicBody.id == this.pirRangeId) {
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
