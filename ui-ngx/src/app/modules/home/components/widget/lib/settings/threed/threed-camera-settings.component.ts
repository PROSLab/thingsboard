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

import { Component, forwardRef, Input, OnInit } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  Validators
} from '@angular/forms';
import { AppState } from '@core/core.state';
import { CAMERA_ID } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-constants';
import {
  ThreedCameraSettings,
} from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { PageComponent } from '@shared/components/page.component';
import { ThreedTransformControllerComponent } from '../../../threed-view-widget/threed/threed-components/threed-transform-controller-component';
import { ThreedGenericSceneManager } from '../../../threed-view-widget/threed/threed-managers/threed-generic-scene-manager';
import { IThreedExpandable } from './ithreed-expandable';


@Component({
  selector: 'tb-threed-camera-settings',
  templateUrl: './threed-camera-settings.component.html',
  styleUrls: ['./../widget-settings.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedCameraSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedCameraSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedCameraSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator, IThreedExpandable {

  @Input()
  disabled: boolean;

  @Input()
  sceneEditor: ThreedGenericSceneManager;

  private modelValue: ThreedCameraSettings;

  private propagateChange = null;

  public threedCameraSettingsFormGroup: FormGroup;

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder) {
    super(store);

  }

  ngOnInit(): void {
    this.threedCameraSettingsFormGroup = this.fb.group({
      near: [0.1, [Validators.min(0)]],
      far: [1000, [Validators.min(0)]],
      fov: [60, [Validators.min(0)]],
      initialPosition: [null, []],
      initialRotation: [null, []],
    });

    const transformComponent = this.sceneEditor.getComponent(ThreedTransformControllerComponent);
    transformComponent.positionChanged.subscribe(v => this.updateObjectVector(v, "initialPosition"));
    transformComponent.rotationChanged.subscribe(v => this.updateObjectVector(v, "initialRotation"));

    //this.threedCameraSettingsFormGroup.get('useAlias').valueChanges.subscribe(() => this.updateValidators(true));
    this.threedCameraSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });
    this.updateValidators(false);
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  validate(control: AbstractControl): ValidationErrors {
    return this.threedCameraSettingsFormGroup.valid ? null : {
      threedCameraSettings: {
        valid: false,
      },
    };
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedCameraSettingsFormGroup.disable({ emitEvent: false });
    } else {
      this.threedCameraSettingsFormGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedCameraSettings): void {
    this.modelValue = value;

    this.threedCameraSettingsFormGroup.patchValue(
      this.modelValue, { emitEvent: false }
    );
    this.updateValidators(false);
  }

  private updateModel() {
    const value: ThreedCameraSettings = this.threedCameraSettingsFormGroup.value;
    this.modelValue = value;

    // TODO: remove if...
    if (!this.propagateChange) {
      console.error("propagateChange undefined");
      return;
    }

    if (this.threedCameraSettingsFormGroup.valid) {
      this.propagateChange(this.modelValue);
    } else {
      this.propagateChange(null);
    }
  }

  private updateValidators(emitEvent: boolean) {
    /*
    const useAlias: boolean = this.threedCameraSettingsFormGroup.get('useAlias').value;
    if (useAlias) {
      this.threedCameraSettingsFormGroup.get('threedEntityAliasSettings').enable({ emitEvent });
      this.threedCameraSettingsFormGroup.get('threedEntityKeySettings').enable({ emitEvent });
    } else {
      this.threedCameraSettingsFormGroup.get('threedEntityAliasSettings').disable({ emitEvent });
      this.threedCameraSettingsFormGroup.get('threedEntityKeySettings').disable({ emitEvent });
    }
    this.threedCameraSettingsFormGroup.get('threedEntityKeySettings').updateValueAndValidity({ emitEvent });
    */
  }

  private updateObjectVector(objectVector: any, formName: string) {
    if (objectVector.id == CAMERA_ID)
      this.threedCameraSettingsFormGroup.get(formName).setValue(objectVector.vector, { emitValue: false });
  }

  public forceExpand(id: string): void {
    if (id == CAMERA_ID) {
      // may be in future
      // this.expanded = true;
    }
  }
}
