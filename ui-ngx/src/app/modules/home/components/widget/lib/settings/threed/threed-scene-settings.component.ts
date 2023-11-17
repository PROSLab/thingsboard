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

import {
  AfterContentChecked,
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  Renderer2,
  ViewChild,
  forwardRef, Injector
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';
import {IAliasController} from '@app/core/public-api';
import {
  ENVIRONMENT_ID, GATEWAY,
  IOT_DEVICE,
  PIR_SENSORS,
  ThreedSceneControllerType
} from '@app/modules/home/components/widget/threed-view-widget/threed/threed-constants';
import {
  ThreedDeviceGroupSettings,
  ThreedDevicesSettings,
  ThreedEnvironmentSettings,
  ThreedSceneSettings,
} from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import {AppState} from '@core/core.state';
import {
  EntityAliasAttribute,
  ModelUrl,
  ThreedModelLoaderService,
  ThreedUniversalModelLoaderConfig
} from '@core/services/threed-model-loader.service';
import {Store} from '@ngrx/store';
import {TranslateService} from '@ngx-translate/core';
import {PageComponent} from '@shared/components/page.component';
import {GLTFExporter} from "three/examples/jsm/exporters/GLTFExporter";
import {
  ThreedOrbitControllerComponent
} from '../../../threed-view-widget/threed/threed-components/threed-orbit-controller-component';
import {
  ThreedTransformControllerComponent
} from '../../../threed-view-widget/threed/threed-components/threed-transform-controller-component';
import {
  ThreedGenericSceneManager
} from '../../../threed-view-widget/threed/threed-managers/threed-generic-scene-manager';
import {ThreedScenes} from '../../../threed-view-widget/threed/threed-scenes/threed-scenes';
import {IThreedExpandable} from './ithreed-expandable';
import { ChangeDetectorRef } from '@angular/core';

export interface IOT_Pir extends IOT_Device {
  isOccupied: boolean,
}

export interface IOT_Device {
  name: string,
  type: DeviceTypes,
}

enum DeviceTypes {
  PIR = "Pir",
  GATEWAY = "Gateway",
  UNKNOWN = "Unknown",
}

@Component({
  selector: 'tb-threed-scene-settings',
  templateUrl: './threed-scene-settings.component.html',
  styleUrls: ['./../widget-settings.scss', './threed-scene-settings.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedSceneSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedSceneSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedSceneSettingsComponent extends PageComponent implements OnInit, AfterViewInit, ControlValueAccessor, Validator, AfterContentChecked {

  @Input()
  disabled: boolean;

  @Input()
  aliasController: IAliasController;

  @Input()
  sceneControllerType: ThreedSceneControllerType;

  @ViewChild('rendererContainer') rendererContainer?: ElementRef;

  @ViewChild('threedEnvironmentSettings') threedEnvironmentSettings?: IThreedExpandable;
  @ViewChild('threedCameraSettings') threedCameraSettings?: IThreedExpandable;
  @ViewChild('threedDevicesSettings') threedDevicesSettings?: IThreedExpandable;

  private modelValue: ThreedSceneSettings;

  private propagateChange = null;

  public threedSceneSettingsFormGroup: FormGroup;

  public sceneEditor: ThreedGenericSceneManager;
  private isVisible: boolean = false;
  fullscreen: boolean = false;
  loadingProgress = 100;

  //Variables used for the animations during the export action
  exporting: boolean = false;
  private cdr: ChangeDetectorRef;

  private lastEntityLoaders: Map<string, ModelUrl | EntityAliasAttribute> = new Map();

  constructor(
    protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder,
    private threedModelLoader: ThreedModelLoaderService,
    private renderer2: Renderer2,
    private injector: Injector
  ) {
    super(store);
    // Use Injector to get ChangeDetectorRef
    this.cdr = injector.get(ChangeDetectorRef);
  }


  ngOnInit(): void {
    /*this.threedSceneEditor = new ThreedSceneEditor(undefined, {
      createGrid: true,
      controllerType: this.sceneControllerType
    });*/
    if (this.hasCamera()) {
      this.sceneEditor = ThreedScenes.createEditorSceneWithCameraDebug();
    } else {
      this.sceneEditor = ThreedScenes.createEditorSceneWithoutCameraDebug();
    }

    const controlsConfig = this.hasCamera() ? {
      threedEnvironmentSettings: [null, []],
      threedCameraSettings: [null, []],
      threedDevicesSettings: [null, []],
    } : {
      threedEnvironmentSettings: [null, []],
      threedDevicesSettings: [null, []],
    };
    this.threedSceneSettingsFormGroup = this.fb.group(controlsConfig);

    this.threedSceneSettingsFormGroup.get("threedDevicesSettings").valueChanges.subscribe((newValues: ThreedDevicesSettings) => {
      // TODO: when changing models, this code is not triggered
      console.log("threedDevicesSettings valueChanges", newValues);
      this.updateSceneModels(newValues);
    });

    this.threedSceneSettingsFormGroup.get("threedEnvironmentSettings").valueChanges.subscribe((newValue: ThreedEnvironmentSettings) => {
      this.updateSceneModels(newValue);
    });

    this.threedSceneSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });

    const transformComponent = this.sceneEditor.getComponent(ThreedTransformControllerComponent);
    transformComponent.modelSelected.subscribe(id => this.forceExpand(id));
  }

  public hasCamera(): boolean {
    return this.sceneControllerType != ThreedSceneControllerType.ORBIT_CONTROLLER;
  }

  /**
   * Load a 3D model based on the provided configuration and replace the existing model in the scene.
   * The function is used when the complex orbit widget is being modified.
   * If the entityLoader is a Pir sensor, additional processing is performed to set up IoT device data.
   * @param {ThreedUniversalModelLoaderConfig} config - The configuration object for the 3D model loader, contains the entityLoader.
   * @param {string} [id] - An optional identifier for the loaded model. If not provided, the entity's ID is used.
   * @returns {void}
   */
  private loadModel(config: ThreedUniversalModelLoaderConfig, id?: string) {
    if (!config.entityLoader) return;

    const {entityLoader} = config;
    this.threedModelLoader.loadModelAsGLTF(config, {updateProgress: p => this.loadingProgress = p * 100})
      .subscribe(({model, entityId}) => {
        // Check if the entity is a Pir
        if ("entityAlias" in entityLoader && entityLoader.entity && entityLoader.entity.entityType === "DEVICE") {
          let deviceData;
          switch (entityLoader.entityAlias) {
            case PIR_SENSORS:
              // Set up IoT device data for the type of device
              deviceData = {
                name: entityLoader.entity.name,
                type: DeviceTypes.PIR,
                isOccupied: false,
              } as IOT_Pir;
              break;

            case GATEWAY:
              deviceData = {
                name: entityLoader.entity.name,
                type: DeviceTypes.GATEWAY,
              } as IOT_Device;
              break;

            default:
              deviceData = {
                name: entityLoader.entity.name,
                type: DeviceTypes.UNKNOWN,
              } as IOT_Device;
          }

          // Assign IoT device data to the loaded model's userData
          model.userData[IOT_DEVICE] = deviceData;
        }

        // Replace the existing model in the scene
        this.sceneEditor.modelManager.replaceModel(model, {id: id || entityId});
      });
  }

  ngAfterContentChecked(): void {
    if (this.isVisible == false && this.rendererContainer?.nativeElement.offsetParent != null) {
      console.log('isVisible switched from false to true (now is visible)');
      this.isVisible = true;
      this.detectResize();
    } else if (this.isVisible == true && this.rendererContainer?.nativeElement.offsetParent == null) {
      console.log('isVisible switched from true to false (now is not visible)');
      this.sceneEditor.getComponent(ThreedTransformControllerComponent).deselectObject();
      this.isVisible = false;
    }
  }

  ngAfterViewInit(): void {
    this.sceneEditor.attachToElement(this.rendererContainer);
    //this.threedSceneEditor.attachToElement(this.rendererContainer);
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  validate(control: AbstractControl): ValidationErrors {
    return this.threedSceneSettingsFormGroup.valid ? null : {
      threedSceneSettings: {
        valid: false,
      },
    };
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedSceneSettingsFormGroup.disable({emitEvent: false});
    } else {
      this.threedSceneSettingsFormGroup.enable({emitEvent: false});
    }
  }

  writeValue(value: ThreedSceneSettings): void {
    this.modelValue = value;

    this.sceneEditor.setValues(this.modelValue);
    //this.threedSceneEditor.updateValue(this.modelValue);
    this.threedSceneSettingsFormGroup.patchValue(
      this.modelValue, {emitEvent: false}
    );

    this.updateSceneModels(value.threedEnvironmentSettings);
    this.updateSceneModels(value.threedDevicesSettings);
    //this.updateValidators(false);
  }

  private updateModel() {
    const value = this.threedSceneSettingsFormGroup.value;
    this.modelValue = value;

    this.sceneEditor.setValues(this.modelValue);
    //this.threedSceneEditor.updateValue(this.modelValue);

    this.propagateChange(this.modelValue);
  }

  private updateSceneModels(newSettings: ThreedDevicesSettings | ThreedEnvironmentSettings) {
    if (newSettings == null) return;

    console.log(newSettings);

    // must be called ONLY when the model effectively changed (not when properties like pos, rot, scale, attr...changes)
    if ("threedDeviceGroupSettings" in newSettings) {
      let deletedObjects = Array.from(this.lastEntityLoaders.keys()).filter(id => id != ENVIRONMENT_ID);

      newSettings.threedDeviceGroupSettings.forEach((deviceGroup: ThreedDeviceGroupSettings) => {
        const loaders = this.threedModelLoader.toEntityLoaders(deviceGroup);
        loaders?.forEach(entityLoader => {
          const config: ThreedUniversalModelLoaderConfig = {
            entityLoader,
            aliasController: this.aliasController
          }

          const id = entityLoader.entity.id;
          const lastEntityLoader = this.lastEntityLoaders.get(id);
          if (!this.threedModelLoader.areLoaderEqual(lastEntityLoader, entityLoader)) {
            this.lastEntityLoaders.set(id, entityLoader);
            this.loadModel(config);
          }

          const index = deletedObjects.indexOf(id);
          if (index >= 0) deletedObjects.splice(index, 1);
        })
      });

      deletedObjects.forEach(id => this.sceneEditor.modelManager.removeModel(id));
    } else {
      const entityLoader = this.threedModelLoader.toEntityLoader(newSettings);
      const config: ThreedUniversalModelLoaderConfig = {
        entityLoader,
        aliasController: this.aliasController
      }

      const id = ENVIRONMENT_ID;
      const lastEntityLoader = this.lastEntityLoaders.get(id);
      if (!this.threedModelLoader.areLoaderEqual(lastEntityLoader, entityLoader)) {
        this.lastEntityLoaders.set(id, entityLoader);
        this.loadModel(config, id);
      }
    }
  }

  public enterFullscreen() {
    this.rendererContainer.nativeElement.requestFullscreen();
    this.fullscreen = true;
  }

  public exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      this.onExitFullscreen();
    }
  }

  private onExitFullscreen() {
    this.renderer2.addClass(this.rendererContainer.nativeElement, "zero-size");
    this.sceneEditor?.resize();
    //this.threedSceneEditor?.resize();
    setTimeout(() => {
      this.renderer2.removeClass(this.rendererContainer.nativeElement, "zero-size");
      this.sceneEditor?.resize();
      //this.threedSceneEditor?.resize();
    }, 50);
    this.fullscreen = false;
  }

  public changeControlMode(mode: "translate" | "rotate" | "scale") {
    this.sceneEditor?.getComponent(ThreedTransformControllerComponent).changeTransformControllerMode(mode);
    //this.threedSceneEditor?.changeTransformControlMode(mode);
  }

  public focusOnObject() {
    // TODO: pass the selected object or compute it inside
    this.sceneEditor?.getComponent(ThreedOrbitControllerComponent).focusOnObject();
    //this.threedSceneEditor?.focusOnObject();
  }

  @HostListener('window:resize')
  public detectResize(): void {
    this.sceneEditor?.resize();
    //this.threedSceneEditor?.resize();
    setTimeout(() => {
      this.sceneEditor?.resize();
      //this.threedSceneEditor?.resize();
    }, 1000);
  }

  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  onFullscreenChange(event: any) {
    if (!document.fullscreenElement) {
      // Leaving fullscreen mode
      this.onExitFullscreen();
    }
  }

  private forceExpand(id: string): void {
    this.threedEnvironmentSettings?.forceExpand(id);
    this.threedCameraSettings?.forceExpand(id);
    this.threedDevicesSettings?.forceExpand(id);
  }

  /**
   * Export the current scene to a GLB file using the GLTFExporter.
   * The exported scene includes the room environment and the IOT devices.
   * @remarks Ensure the scene has been set up in the scene editor before calling this function.
   */
  public exportScene(): void {
    //starts the export animation
    this.exporting = true;

    const exportManager = new GLTFExporter();

    // Access the scene from the scene editor
    const scene = this.sceneEditor.scene;

    //Select the scene that represents the room, usually named as Environment
    const roomScene = scene.children.find(child => child.userData.customId === 'Environment');
    if (!roomScene) {
      console.error("Room scene not found")

      //ends the export animation
      this.exporting = false;
      //propagates the changes to the UI, otherwise a click of the user is needed
      this.cdr.detectChanges();
      return;
    }

    // Define export options
    const exportOptions = {
      binary: true, // Export as binary .glb
      animations: [], // An empty array because there are no animations in the 3D model
    };

    // Perform the export with options
    exportManager.parse(
      scene,
      (result: ArrayBuffer) => {
        const blob = new Blob([result], {type: "model/gltf-binary"});
        const url = URL.createObjectURL(blob);

        // Create a link to download the .glb file
        const a = document.createElement("a");
        a.href = url;
        a.download = "exported-scene.glb";
        a.click();

        // Clean up the URL object
        URL.revokeObjectURL(url);

        //ends the export animation
        this.exporting = false;
        //propagates the changes to the UI, otherwise a click of the user is needed
        this.cdr.detectChanges();
      },
      (error: ErrorEvent) => {
        console.error("Export Error:", error);
        //ends the export animation
        this.exporting = false;
        //propagates the changes to the UI, otherwise a click of the user is needed
        this.cdr.detectChanges();
      },
      exportOptions
    );
  }
}
