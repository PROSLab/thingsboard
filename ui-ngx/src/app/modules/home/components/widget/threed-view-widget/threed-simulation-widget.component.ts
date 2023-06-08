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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AppState } from '@core/core.state';
import { WidgetContext } from '@home/models/widget-component.models';
import { Store } from '@ngrx/store';
import { PageComponent } from '@shared/components/page.component';
import { ThreedScenes } from './threed/threed-scenes/threed-scenes';
import { ThreedGenericSceneManager } from './threed/threed-managers/threed-generic-scene-manager';
import * as THREE from 'three';
import { Subscription } from 'rxjs';
import { ThreedModelManager } from './threed/threed-managers/threed-model-manager';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { IThreedTester } from './threed/threed-components/ithreed-tester';
import { ThreedOrbitControllerComponent } from './threed/threed-components/threed-orbit-controller-component';
import { DebugablePerspectiveCamera } from './threed/threed-extensions/debugable-perspective-camera';

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

  constructor(
    protected store: Store<AppState>,
  ) {
    super(store);

    this.simulationScene = ThreedScenes.createSimulationScene();
    this.includeFeaturesToSimulationScene();
  }

  private async includeFeaturesToSimulationScene(){
    const scene = this.simulationScene.scene;
    const pirSensor: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/PIR Sensor.glb")).scene;
    pirSensor.name = "Pir Sensor";
    const desk: THREE.Group = (await new GLTFLoader().loadAsync("./assets/models/gltf/Desk.glb")).scene;
    
    const personGeometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const personMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const person = new THREE.Mesh(personGeometry, personMaterial);
    person.position.set(1.5, 0.9, 0)
    person.name = "PersonMesh";
    scene.add(person);

    // Create a cone-shaped mesh to represent the PIR sensor
    const radius = 1;
    const height = 1;
    const coneGeometry = new THREE.ConeGeometry(radius, height, 32);
    const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
    const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
    coneMesh.name = "Cone Mesh Collider";
    coneMesh.position.set(-0.0726, height/2 + 0.037, 0.0419);
    coneMesh.rotation.x = -Math.PI;
    pirSensor.add(coneMesh);
    pirSensor.position.set(0, 0.643, 0.5);
    pirSensor.rotation.x = -Math.PI;
    
    desk.add(pirSensor);
    scene.add(desk);

    const coneDirection = this.drawDirection(coneMesh, 0xff0000);

    this.simulationScene.getComponent(ThreedOrbitControllerComponent).focusOnObject(pirSensor);
    this.simulationScene.getComponent(ThreedOrbitControllerComponent).zoom(1);
    
    this.subscriptions.push(this.simulationScene.onTick.subscribe(_ => {
      
      // Update the position of the person (e.g. move them around the scene)
      // ...
      
      const x = coneMesh.position.x+ height/2;//the tip of the cone
      const dir = coneDirection.normalize();//the normalized axis vector, pointing from the tip to the base
      const h = height;//height
      const r = radius;//base radius

      const p = person.position; //point to test

      const pminusx = p.clone().sub(new THREE.Vector3(x,0,0));
      const cone_dist = pminusx.dot(dir);

      if(0 <= cone_dist && cone_dist <= h){
        console.log("discard point");
        return;
      }
      const cone_radius = (cone_dist / h) * r;
      const orth_distance = pminusx.clone().sub(dir.clone().multiplyScalar(cone_dist)).length();
      const is_point_inside_cone = (orth_distance < cone_radius)

      if(is_point_inside_cone){
        console.log("peson is inside!!!");
      }
    }));
  }

  private drawDirection(mesh: THREE.Object3D, color: number = 0xff0000) : THREE.Vector3 {
    const direction = new THREE.Vector3( 0, 1, 0 ).applyQuaternion( mesh.quaternion );
    const position = new THREE.Vector3();
    mesh.localToWorld(position);

    const arrowHelper = new THREE.ArrowHelper(direction.clone().normalize(), position, 1, color); 
    this.simulationScene.scene.add(arrowHelper);

    return direction;
  }

  /*
  
  // Create a frustum object from the camera's perspective
      const frustum = new THREE.Frustum();
      const cameraViewProjectionMatrix = new THREE.Matrix4();
      cameraViewProjectionMatrix.multiplyMatrices(
        PIRcamera.projectionMatrix,
        PIRcamera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

      // Check if the person object is visible in the camera's view
      const isPersonVisible = frustum.intersectsObject(person);

      if (isPersonVisible) {
        console.log("Person sensed!");
      }

      PIRcamera.preview();
  */

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
    this.simulationScene?.resize(width-2, height-2);
  }
}
