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
import { Observable, Subscription, timer } from 'rxjs';
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
import { AbstractControl } from '@angular/forms';
import { IThreedTester } from './threed/threed-components/ithreed-tester';



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
  private subscriptions: Subscription[] = [];

  openOptionsMenu = false;
  debugMode = false;
  magnitude: number = 5;
  timeToReachPeak: number = 3;
  peakTime: number = 5;
  timeToEnd: number = 8;

  earthquakeController: ThreedEarthquakeController;
  time: number = 0;
  timeHandler: NodeJS.Timeout;
  running = false;

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
    this.earthquakeController = new ThreedEarthquakeController(this.magnitude, this.simulationScene, {
      duration: {
        timeToReachPeak: this.timeToReachPeak,
        peakTime: this.peakTime,
        timeToEnd: this.timeToEnd
      }
    });



    // LOAD MODELS
    const pirSensor: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/PIR Sensor.glb")).scene;
    pirSensor.name = "Pir Sensor";
    pirSensor.position.set(0, 0.643, 0.5);
    pirSensor.rotation.x = -Math.PI;
    // Character animations
    // https://www.donmccurdy.com/2017/11/06/creating-animated-gltf-characters-with-mixamo-and-blender/
    const gltfHumanoid: GLTF = (await new GLTFLoader().loadAsync("./assets/models/gltf/Character.glb"));


    const room: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/Aula Physics.glb")).scene;
    room.position.set(0, this.earthquakeController.getFloorHeight(), 0);
    const roomGroupGO = new ThreedGroupGameObjectComponent(room);
    this.simulationScene.add(roomGroupGO, true);


    const navMesh = new ThreedNavMeshComponent(roomGroupGO);
    this.simulationScene.add(navMesh, true);
    //navMesh.visualizeGrid();


    let desks: THREE.Object3D[] = [];
    // ADDING PIR SENSORS
    roomGroupGO.rigidbodies.forEach(rb => {
      const object = rb.mesh.getMesh();
      if (object.userData.pirPosition) {
        // PIR Sensor Range Collider
        desks.push(object);

        const position = object.userData.pirPosition;
        const height = 0.5;
        const radius = 0.5;
        const cylinderBody = new CANNON.Body({
          type: CANNON.BODY_TYPES.DYNAMIC,
          shape: new CANNON.Cylinder(0.01, radius, height, 20),
          isTrigger: true,
          allowSleep: true
        });
        const link = {
          rigidbody: rb,
          offset: new CANNON.Vec3(position[0], height / 2 + 0.1, position[2]),
        }
        this.simulationScene.add(new ThreedRigidbodyComponent({ physicBody: cylinderBody, link, tag: "PIR Sensor" }), true);
      }
    });


    // ADDING PEOPLE
    for (let k = 0; k < 7; k++) {
      const person = new ThreedPersonComponent(navMesh, gltfHumanoid);
      this.simulationScene.add(person, true);
      person.getMesh().position.copy(this.getRandomPosition())
      person.getMesh().lookAt(new THREE.Vector3());
      this.earthquakeController.MagnitudeChanged.subscribe(m => {
        person.earthquakeAlert(m, desks);
      });

      this.subscriptions.push(person.rigidbody.onBeginCollision.subscribe(o => this.processCollisionEvent(person, o, 'begin')));
      this.subscriptions.push(person.rigidbody.onEndCollision.subscribe(o => this.processCollisionEvent(person, o, 'end')));
    }


    // OTHER CONFIGUATIONS
    this.simulationScene.physicManager.setVisualiseColliders(true);

    const clock = new THREE.Clock();
    this.subscriptions.push(this.simulationScene.onTick.subscribe(_ => {
      const delta = clock.getDelta();
      this.earthquakeController.update(delta);
    }));
  }

  private processCollisionEvent(person: ThreedPersonComponent, e: {
    event: CANNON.Constraint;
    object: IThreedPhysicObject;
  }, type: 'begin' | 'end') {
    if (e.object?.tag == "PIR Sensor") {

      let result = [];
      const world = this.simulationScene.physicManager.world;
      world.narrowphase.getContacts([e.object.physicBody], [person.rigidbody.physicBody], world, result, [], [], []);
      let overlaps = result.length > 0;

      console.log(overlaps ? "presence" : "no presence")
      /*
      this.sensed = type == 'begin';
      this.cd.detectChanges();
      this.savePresence(this.sensed ? 1 : 0);
      */
    }
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

  public toggleDebugMode() {
    this.debugMode = !this.debugMode;
    const navMesh = this.simulationScene.getComponent(ThreedNavMeshComponent);
    navMesh.visualiseGrid(this.debugMode);
    this.simulationScene.physicManager.setVisualiseColliders(this.debugMode);

    const people = this.simulationScene.findComponentsByTester(IThreedTester.isIThreedPerson);
    people.forEach(p => p.setDebugMode(this.debugMode));
  }

  public startSimulation() {
    this.running = true;

    const navMesh = this.simulationScene.getComponent(ThreedNavMeshComponent);
    navMesh.compureGrid();
    this.earthquakeController.start({
      magnitude: this.magnitude,
      duration: {
        timeToReachPeak: this.timeToReachPeak,
        peakTime: this.peakTime,
        timeToEnd: this.timeToEnd
      },
      onComplete: () => { this.endSimulation(); }
    });

    const millis = 200;
    this.time = 0;
    this.timeHandler = setInterval(() => {
      this.time += millis / 1000;
      this.time = Number(this.time.toFixed(2));
      this.cd.detectChanges();
    }, millis);
  }

  private endSimulation() {
    clearInterval(this.timeHandler);
    this.running = false;
  }

  public resetSimulation(): void {
    this.endSimulation();
    this.time = 0;
    this.earthquakeController.stop();
    const people = this.simulationScene.findComponentsByTester(IThreedTester.isIThreedPerson);
    people.forEach(p => p.reset(this.getRandomPosition()));
  }

  private getRandomPosition(): THREE.Vector3 {
    const side = THREE.MathUtils.randInt(0, 3);
    let x = 0;
    let z = 0;
    if (side == 0) {
      x = THREE.MathUtils.randFloat(-5, 5);
      z = -3;
    } else if (side == 1) {
      x = 5.2;
      z = THREE.MathUtils.randFloat(-3, 3);
    } else if (side == 2) {
      x = THREE.MathUtils.randFloat(-5, 5);
      z = 3;
    } else {
      x = -4.5;
      z = THREE.MathUtils.randFloat(-3, 3);
    }
    return new THREE.Vector3(x, this.earthquakeController.getFloorHeight(), z);
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
