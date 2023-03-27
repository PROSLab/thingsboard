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
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import {
  ThreedCameraSettings,
  ThreedEnvironmentSettings,
} from '@home/components/widget/threed-view-widget/threed-models';
import { ThreedEntityAliasSettings } from './aliases/threed-entity-alias-settings.component';
import { ThreedSceneEditor } from '../../../threed-view-widget/threed-scene-editor';


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
export class ThreedCameraSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @Input()
  disabled: boolean;

  @Input()
  threedSceneEditor: ThreedSceneEditor;

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
}
