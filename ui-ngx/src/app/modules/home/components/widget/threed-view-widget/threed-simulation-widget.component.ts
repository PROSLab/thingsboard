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

    const pirCamera = new DebugablePerspectiveCamera(this.simulationScene, 4);
    pirCamera.camera.position.set(-0.0726, 0.037, 0.0419);
    pirCamera.camera.rotation.x = Math.PI/2;
    pirSensor.add(pirCamera.camera);

    pirSensor.position.set(0, 0.643, 0.5);
    pirSensor.rotation.x = -Math.PI;
        
    desk.add(pirSensor);
    scene.add(desk);

    //const pirCameraDebug = new THREE.CameraHelper(pirCamera);
    //scene.add(pirCameraDebug);

    this.simulationScene.getComponent(ThreedOrbitControllerComponent).focusOnObject(pirSensor);
    this.simulationScene.getComponent(ThreedOrbitControllerComponent).zoom(1);
    
    this.subscriptions.push(this.simulationScene.onTick.subscribe(_ => {
      
      // Create a frustum object from the camera's perspective
      pirCamera.camera.updateMatrix();
      pirCamera.camera.updateMatrixWorld();
      const frustum = new THREE.Frustum();
      const cameraViewProjectionMatrix = new THREE.Matrix4();
      cameraViewProjectionMatrix.multiplyMatrices(
        pirCamera.camera.projectionMatrix,
        pirCamera.camera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
      
      // Check if the person object is visible in the camera's view
      const isPersonVisible = frustum.intersectsObject(person);

      if (isPersonVisible) {
        console.log("Person sensed!");
      }

      //pirCameraDebug.update();
      
    }));
    this.subscriptions.push(this.simulationScene.onRender.subscribe(_ => {
      pirCamera.preview();      
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
