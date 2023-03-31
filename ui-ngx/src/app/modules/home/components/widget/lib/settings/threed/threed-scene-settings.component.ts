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

import { Component, forwardRef, Input, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener, OnChanges, SimpleChanges, AfterContentChecked, Renderer2 } from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import {
  ThreedDeviceGroupSettings,
  ThreedDevicesSettings,
  ThreedEnvironmentSettings,
  ThreedSceneSettings,
} from '@home/components/widget/threed-view-widget/threed-models';
import { IAliasController } from '@app/core/public-api';
import { EntityAliasAttribute, ModelUrl, ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@core/services/threed-model-loader.service';
import { ThreedSceneEditor } from '@home/components/widget/threed-view-widget/threed-scene-editor';
import { ENVIRONMENT_ID, ThreedSceneControllerType } from '@home/components/widget/threed-view-widget/threed-constants';

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

  private modelValue: ThreedSceneSettings;

  private propagateChange = null;

  public threedSceneSettingsFormGroup: FormGroup;

  public threedSceneEditor: ThreedSceneEditor;
  private isVisible: boolean = false;
  fullscreen: boolean = false;

  private lastEntityLoaders: Map<string, ModelUrl | EntityAliasAttribute> = new Map();

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder,
    private threedModelLoader: ThreedModelLoaderService,
    private renderer2: Renderer2) {
    super(store);

  }

  ngOnInit(): void {
    this.threedSceneEditor = new ThreedSceneEditor(undefined, {
      createGrid: true,
      controllerType: this.sceneControllerType
    });

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
  }

  public hasCamera(): boolean {
    return this.sceneControllerType != ThreedSceneControllerType.ORBIT_CONTROLLER;
  }

  private loadModel(config: ThreedUniversalModelLoaderConfig, id?: string) {
    if (!config.entityLoader) return;

    this.threedModelLoader.loadModelAsGLTF(config).subscribe(res => {
      this.threedSceneEditor.replaceModel(res.model, { id: id ? id : res.entityId });
    });
  }

  ngAfterContentChecked(): void {
    if (this.isVisible == false && this.rendererContainer?.nativeElement.offsetParent != null) {
      console.log('isVisible switched from false to true (now is visible)');
      this.isVisible = true;
      this.detectResize();
    }
    else if (this.isVisible == true && this.rendererContainer?.nativeElement.offsetParent == null) {
      console.log('isVisible switched from true to false (now is not visible)');
      this.isVisible = false;
    }
  }

  ngAfterViewInit(): void {
    this.threedSceneEditor.attachToElement(this.rendererContainer);
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
      this.threedSceneSettingsFormGroup.disable({ emitEvent: false });
    } else {
      this.threedSceneSettingsFormGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedSceneSettings): void {
    this.modelValue = value;

    this.threedSceneEditor.updateValue(this.modelValue);
    this.threedSceneSettingsFormGroup.patchValue(
      this.modelValue, { emitEvent: false }
    );

    this.updateSceneModels(value.threedEnvironmentSettings);
    this.updateSceneModels(value.threedDevicesSettings);
    //this.updateValidators(false);
  }

  private updateModel() {
    const value = this.threedSceneSettingsFormGroup.value;
    this.modelValue = value;

    this.threedSceneEditor.updateValue(this.modelValue);

    this.propagateChange(this.modelValue);
  }

  private updateSceneModels(newSettings: ThreedDevicesSettings | ThreedEnvironmentSettings) {
    if (newSettings == null) return;

    console.log(newSettings);

    // must be called ONLY when the model effectively changed (not when properties like pos, rot, scale, attr...changes)
    if ("threedDeviceGroupSettings" in newSettings) {
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
        })
      });
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
    this.threedSceneEditor?.resize();
    setTimeout(() => {
      this.renderer2.removeClass(this.rendererContainer.nativeElement, "zero-size");
      this.threedSceneEditor?.resize();
    }, 50);
    this.fullscreen = false;
  }

  public changeControlMode(mode: "translate" | "rotate" | "scale") {
    this.threedSceneEditor?.changeTransformControlMode(mode);
  }

  public focusOnObject() {
    this.threedSceneEditor?.focusOnObject();
  }

  @HostListener('window:resize')
  public detectResize(): void {
    this.threedSceneEditor?.resize();
    setTimeout(() => {
      this.threedSceneEditor?.resize();
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

  @HostListener('window:keydown', ['$event'])
  public keydown(event: KeyboardEvent): void {
    this.threedSceneEditor?.onKeyDown(event);
  }

  @HostListener('window:keyup', ['$event'])
  public keyup(event: KeyboardEvent): void {
    this.threedSceneEditor?.onKeyUp(event);
  }

  @HostListener('window:mousemove', ['$event'])
  public mousemove(event: MouseEvent): void {
    this.threedSceneEditor?.onMouseMove(event);
  }

  @HostListener('window:click', ['$event'])
  public mouseclick(event: MouseEvent): void {
    this.threedSceneEditor?.onMouseClick(event);
  }
}