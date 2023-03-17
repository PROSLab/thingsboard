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
import { isNumber } from '@core/utils';
import { ThreedVectorSettings } from 'src/app/modules/home/components/widget/threed-view-widget/threed-models';

@Component({
  selector: 'tb-threed-vector-settings',
  templateUrl: './threed-vector-settings.component.html',
  styleUrls: ['./../widget-settings.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedVectorSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedVectorSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedVectorSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @Input()
  disabled: boolean;

  @Input()
  positiveOnly: boolean = false;

  @Input()
  label: string = "Vector";

  private modelValue: ThreedVectorSettings;

  private propagateChange = null;

  public threedVectorSettingsFormGroup: FormGroup;

  constructor(protected store: Store<AppState>,
              private translate: TranslateService,
              private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    const validators = [];
    if(this.positiveOnly) validators.push(Validators.min(0))
    this.threedVectorSettingsFormGroup = this.fb.group({
      x: [1, validators],
      y: [1, validators],
      z: [1, validators]
    });
    this.threedVectorSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  validate(control: AbstractControl): ValidationErrors {
    return this.threedVectorSettingsFormGroup.valid ? null : {
      threedVectorSettings: {
        valid: false,
      },
    };
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedVectorSettingsFormGroup.disable({emitEvent: false});
    } else {
      this.threedVectorSettingsFormGroup.enable({emitEvent: false});
    }
  }

  writeValue(value: ThreedVectorSettings): void {
    this.modelValue = value;
    this.threedVectorSettingsFormGroup.patchValue(
      value, {emitEvent: false}
    );
  }

  private updateModel() {
    const value: ThreedVectorSettings = this.threedVectorSettingsFormGroup.value;
    this.modelValue = value;
    if (this.threedVectorSettingsFormGroup.valid) {
      this.propagateChange(this.modelValue);
    } else {
      this.propagateChange(null);
    }
  }
}
