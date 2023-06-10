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
  private world: CANNON.World;
  private subscriptions: Subscription[] = [];

  public sensed: boolean = false;

  constructor(
    protected store: Store<AppState>,
    private cd: ChangeDetectorRef
  ) {
    super(store);

    this.simulationScene = ThreedScenes.createSimulationScene();
    this.includeFeaturesToSimulationScene();
  }

  private async includeFeaturesToSimulationScene() {
    this.world = new CANNON.World()
    this.world.gravity.set(0, 0, 0) // no gravity
    // Max solver iterations: Use more for better force propagation, but keep in mind that it's not very computationally cheap!
    //this.world.solver.iterations = 5

    const scene = this.simulationScene.scene;
    const pirSensor: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/PIR Sensor.glb")).scene;
    pirSensor.name = "Pir Sensor";
    const desk: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/Desk.glb")).scene;
    const gltfHumanoid: GLTF = (await new GLTFLoader().loadAsync("./assets/models/gltf/humanoid.glb"));
    const humanoid = gltfHumanoid.scene;
    humanoid.name = "Person Mesh";
    const mixer = new THREE.AnimationMixer(humanoid);
    mixer.clipAction(gltfHumanoid.animations[0]).play();
    humanoid.position.set(1, 0, 1);
    scene.add(humanoid);


    // Cylinder
    const cylinderShape = new CANNON.Cylinder(0.01, 1, .65, 20)
    const cylinderBody = new CANNON.Body({
      mass: 0,
      shape: cylinderShape,
      position: new CANNON.Vec3(-0.0726, 0.309, 0.458),//-0.0726, 0.037, 0.0419
      isTrigger: true
    })
    this.world.addBody(cylinderBody);
    cylinderBody.addEventListener('collide', (event) => {
      console.log("Collision: ", event);
    });
    const cylinderGeometry = new THREE.CylinderGeometry(cylinderShape.radiusTop, cylinderShape.radiusBottom, cylinderShape.height, cylinderShape.numSegments);
    const cylinderMesh = new THREE.Mesh(cylinderGeometry, new THREE.MeshBasicMaterial({color: 0xff00ff, wireframe: true}));
    scene.add(cylinderMesh);


    // Box
    const humanoidBox = new THREE.Box3().setFromObject(humanoid);
    const boxHelper = new THREE.BoxHelper(humanoid, 0x00ff00);
    const size = humanoidBox.max.clone().sub(humanoidBox.min);
    const boxBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(),
      shape: new CANNON.Box(new CANNON.Vec3(size.x, size.y, size.z)),
    })
    this.world.addBody(boxBody);
    scene.add(boxHelper);


    // Collision callbacks
    this.world.addEventListener('beginContact', (event) => {
      if(event.bodyA.id == cylinderBody.id || event.bodyB.id == cylinderBody.id){
        if(event.bodyA.id == boxBody.id || event.bodyB.id == boxBody.id){
          this.sensed = true;
          this.cd.detectChanges();
        }
      }
      console.log("beginContact: ", event, event.bodyA, event.bodyB);
    });
    this.world.addEventListener('endContact', (event) => {
      if(event.bodyA.id == cylinderBody.id || event.bodyB.id == cylinderBody.id){
        if(event.bodyA.id == boxBody.id || event.bodyB.id == boxBody.id){
          this.sensed = false;
          this.cd.detectChanges();
        }
      }
      console.log("endContact: ", event, event.bodyA, event.bodyB);
    });


    pirSensor.position.set(0, 0.643, 0.5);
    pirSensor.rotation.x = -Math.PI;
    desk.add(pirSensor);
    scene.add(desk);




    this.simulationScene.getComponent(ThreedOrbitControllerComponent).focusOnObject(pirSensor);
    this.simulationScene.getComponent(ThreedOrbitControllerComponent).zoom(1);
    const moveToPosition = new ThreedMoveToPositionComponent();
    this.simulationScene.add(moveToPosition, true);
    this.subscriptions.push(moveToPosition.onPointSelected.subscribe(p => this.moveToPosition(humanoid, new THREE.Vector3(p.x, humanoid.position.y, p.z)), true));
    //this.moveRandomly(humanoid);




    const clock = new THREE.Clock();
    this.subscriptions.push(this.simulationScene.onTick.subscribe(_ => {
      const delta = clock.getDelta();
      boxBody.position.set(humanoid.position.x, humanoid.position.y, humanoid.position.z);

      // update physics
      this.world.step(delta);


      // update visuals
      if (this.tween) {
        mixer.update(delta);
      }

      // @ts-ignore
      cylinderMesh.position.copy(cylinderBody.interpolatedPosition);
      boxHelper.update();
    }));
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

  ngOnInit(): void {
    this.ctx.$scope.threedSimulationWidget = this;
  }

  ngAfterViewInit(): void {
    this.simulationScene.attachToElement(this.rendererContainer);
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
