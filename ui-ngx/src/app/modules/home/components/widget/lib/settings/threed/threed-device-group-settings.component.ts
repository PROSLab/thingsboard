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

import { Component, forwardRef, Input, OnInit, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, Validator, NG_VALIDATORS, AbstractControl, ValidationErrors } from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import { IAliasController } from '@app/core/public-api';
import { ThreedEntityAliasSettings } from './aliases/threed-entity-alias-settings.component';
import { ThreedEntityKeySettings, ThreedEntityKeySettingsComponent } from './aliases/threed-entity-key-settings.component';
import { EntityInfo } from '@app/shared/public-api';
import { Observable, of } from 'rxjs';
import { tap, publishReplay, refCount } from 'rxjs/operators';

export interface ThreedDeviceGroupSettings {
  threedEntityAliasSettings: ThreedEntityAliasSettings;
  useAttribute: boolean;
  threedEntityKeySettings: ThreedEntityKeySettings;
}

export const defaultThreedDeviceGroupSettings: ThreedDeviceGroupSettings = {
  threedEntityAliasSettings: { entityAlias: "" },
  useAttribute: false,
  threedEntityKeySettings: { entityAttribute: "" }
};

@Component({
  selector: 'tb-threed-device-group-settings',
  templateUrl: './threed-device-group-settings.component.html',
  styleUrls: ['./../widget-settings.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedDeviceGroupSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedDeviceGroupSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedDeviceGroupSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @Input()
  disabled: boolean;

  @Input()
  expanded = false;

  @Input()
  aliasController: IAliasController;

  @ViewChild("entityKeySettings")
  entityKeySettings?: ThreedEntityKeySettingsComponent;

  private modelValue: ThreedDeviceGroupSettings;

  private propagateChange = null;

  public threedDeviceGroupFormGroup: FormGroup;

  public entities$: Observable<EntityInfo[]> = of([]);

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.threedDeviceGroupFormGroup = this.fb.group({
      threedEntityAliasSettings: [null, []],
      useAttribute: [false, []],
      threedEntityKeySettings: [null, []]
    });

    this.threedDeviceGroupFormGroup.get('threedEntityAliasSettings').valueChanges.subscribe(() => this.loadEntities());
    this.threedDeviceGroupFormGroup.get('useAttribute').valueChanges.subscribe(() => this.updateValidators(true));
    
    this.threedDeviceGroupFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });

    this.updateValidators(false);
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedDeviceGroupFormGroup.disable({ emitEvent: false });
    } else {
      this.threedDeviceGroupFormGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedDeviceGroupSettings): void {
    this.modelValue = value;
    this.threedDeviceGroupFormGroup.patchValue(
      value, { emitEvent: false }
    );
    this.updateValidators(false);
  }

  validate(control: AbstractControl): ValidationErrors {
    return this.threedDeviceGroupFormGroup.valid ? null : {
      threedDeviceGroupSettings: {
        valid: false,
      },
    };
  }

  private updateModel() {
    const value: ThreedDeviceGroupSettings = this.threedDeviceGroupFormGroup.value;
    this.modelValue = value;

    this.entityKeySettings?.updateEntityAlias(value.threedEntityAliasSettings.entityAlias);

    if (this.threedDeviceGroupFormGroup.valid) {
      this.propagateChange(this.modelValue);
    } else {
      this.propagateChange(null);
    }
  }

  private updateValidators(emitEvent: boolean) {
    const useAttribute: boolean = this.threedDeviceGroupFormGroup.get('useAttribute').value;
    if (useAttribute) {
      this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').enable({ emitEvent });
    } else {
      this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').disable({ emitEvent });
    }
    this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').updateValueAndValidity({ emitEvent });
  }

  onEntityAliasChanged() {
    this.entityKeySettings?.invalidateInput();
  }

  private loadEntities() {
    const threedEntityAliasSettings: ThreedEntityAliasSettings = this.threedDeviceGroupFormGroup.get('threedEntityAliasSettings').value;
    const entityAliasId = this.aliasController.getEntityAliasId(threedEntityAliasSettings.entityAlias);
    if(entityAliasId == null){
      this.entities$ = of([]);
      return;
    }

    console.log(threedEntityAliasSettings, entityAliasId);
    this.entities$ = this.aliasController.resolveEntitiesInfo(entityAliasId).pipe(
      tap(v => console.log(v)),
      publishReplay(1),
      refCount()
    );
  }
}