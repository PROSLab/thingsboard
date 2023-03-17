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
  ValidationErrors
} from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import { 
  ThreedSceneSettings,
} from 'src/app/modules/home/components/widget/threed-view-widget/threed-models';

@Component({
  selector: 'tb-threed-scene-settings',
  templateUrl: './threed-scene-settings.component.html',
  styleUrls: ['./../widget-settings.scss'],
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
export class ThreedSceneSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @Input()
  disabled: boolean;

  private modelValue: ThreedSceneSettings;

  private propagateChange = null;

  public threedSceneSettingsFormGroup: FormGroup;

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.threedSceneSettingsFormGroup = this.fb.group({
      threedScaleVectorSettings: [null, []],
      threedPositionVectorSettings: [null, []],
      threedRotationVectorSettings: [null, []],
    });

    /*
    this.threedSceneSettingsFormGroup.get('threedScaleVectorSettings').valueChanges.subscribe(() => {
      this.updateValidators(true);
    });*/
    
    this.threedSceneSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });
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
    const threedScaleVectorSettings = value.threedScaleVectorSettings;
    const threedPositionVectorSettings = value.threedPositionVectorSettings;
    const threedRotationVectorSettings = value.threedRotationVectorSettings;
    
    const formValue: ThreedSceneSettings = {
      threedScaleVectorSettings,
      threedPositionVectorSettings,
      threedRotationVectorSettings
    };

    this.threedSceneSettingsFormGroup.patchValue(
      formValue, { emitEvent: false }
    );
    this.updateValidators(false);
  }

  private updateModel() {
    const value = this.threedSceneSettingsFormGroup.value;
    this.modelValue = value;
    this.propagateChange(this.modelValue);
  }

  private updateValidators(emitEvent?: boolean): void {
    
    //See .../settings/map/map-settings.component.ts

    //this.threedSceneSettingsFormGroup.get('threedScaleVectorSettings').updateValueAndValidity({emitEvent});
    //this.threedSceneSettingsFormGroup.get('threedPositionVectorSettings').updateValueAndValidity({emitEvent});
    //this.threedSceneSettingsFormGroup.get('threedRotationVectorSettings').updateValueAndValidity({emitEvent});
  }
}