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
  ValidationErrors,
  Validators,
  FormArray
} from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import { IAliasController } from '@app/core/public-api';
import { ThreedDevicesSettings } from 'src/app/modules/home/components/widget/threed-view-widget/threed-models';
import { defaultThreedDeviceGroupSettings, ThreedDeviceGroupSettings } from './threed-device-group-settings.component';
import { ThreedEntityKeySettingsComponent } from './aliases/threed-entity-key-settings.component';
import { ThreedSceneEditor } from '../../../threed-view-widget/threed-scene-editor';

@Component({
  selector: 'tb-threed-devices-settings',
  templateUrl: './threed-devices-settings.component.html',
  styleUrls: ['./../widget-settings.scss', './threed-devices-settings.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedDevicesSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedDevicesSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedDevicesSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {


  @Input()
  aliasController: IAliasController;

  @Input()
  threedSceneEditor: ThreedSceneEditor;

  @Input()
  disabled: boolean;

  private modelValue: ThreedDevicesSettings;

  private propagateChange = null;

  public threedDevicesSettingsFormGroup: FormGroup;

  //public devicesGroup: any[] = [];

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.threedDevicesSettingsFormGroup = this.fb.group({
      threedDeviceGroupSettings: this.prepareDeviceGroupsFormArray([]),
    });
    this.threedDevicesSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });
  }


  private prepareDeviceGroupsFormArray(threedDeviceGroupSettings: ThreedDeviceGroupSettings[] | undefined): FormArray {
    const deviceGroupsControls: Array<AbstractControl> = [];
    if (threedDeviceGroupSettings) {
      threedDeviceGroupSettings.forEach((deviceGroup) => {
        deviceGroupsControls.push(this.fb.control(deviceGroup, [Validators.required]));
      });
    }
    return this.fb.array(deviceGroupsControls);
  }

  deviceGroupsFormArray(): FormArray {
    return this.threedDevicesSettingsFormGroup.get('threedDeviceGroupSettings') as FormArray;
  }

  public trackByDeviceGroupControl(index: number, deviceGroupControl: AbstractControl): any {
    return deviceGroupControl;
  }


  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  validate(control: AbstractControl): ValidationErrors {
    return this.threedDevicesSettingsFormGroup.valid ? null : {
      threedDevicesSettings: {
        valid: false,
      },
    };
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedDevicesSettingsFormGroup.disable({ emitEvent: false });
    } else {
      this.threedDevicesSettingsFormGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedDevicesSettings): void {
    this.modelValue = value;

    this.threedDevicesSettingsFormGroup.setControl('threedDeviceGroupSettings', this.prepareDeviceGroupsFormArray(value.threedDeviceGroupSettings), { emitEvent: false });

    /*
    this.threedDevicesSettingsFormGroup.patchValue(
      value, { emitEvent: false }
    );*/
  }

  private updateModel() {
    const value: ThreedDevicesSettings = this.threedDevicesSettingsFormGroup.value;
    this.modelValue = value;

    // TODO: remove if...
    if (!this.propagateChange) {
      console.error("propagateChange undefined in ThreeDevicesSettingsComponent");
      return;
    } 

    if (this.threedDevicesSettingsFormGroup.valid) {
      this.propagateChange(this.modelValue);
    } else {
      this.propagateChange(null);
    }
  }

  public addDeviceGroup() {
    const deviceGroup: ThreedDeviceGroupSettings = defaultThreedDeviceGroupSettings;
    const deviceGroupsArray = this.threedDevicesSettingsFormGroup.get('threedDeviceGroupSettings') as FormArray;
    const deviceGroupControl = this.fb.control(deviceGroup, [Validators.required]);
    (deviceGroupControl as any).new = true;
    deviceGroupsArray.push(deviceGroupControl);
    this.threedDevicesSettingsFormGroup.updateValueAndValidity();
  }

  public removeDeviceGroup(index: number) {
    (this.threedDevicesSettingsFormGroup.get('threedDeviceGroupSettings') as FormArray).removeAt(index);
  }
}
