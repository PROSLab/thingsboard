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

import { Component, ElementRef, forwardRef, Input, OnInit, ViewChild } from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  Validator
} from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import { IAliasController } from '@core/api/widget-api.models';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap, publishReplay, refCount, startWith, tap } from 'rxjs/operators';
import { DataKey } from '@shared/models/widget.models';
import { DataKeyType } from '@shared/models/telemetry/telemetry.models';
import { EntityService } from '@core/http/entity.service';
import { ThreedModelSettings, ThreedVectorSettings } from '@home/components/widget/threed-view-widget/threed-models';
import { EntityInfo } from '@app/shared/public-api';

export interface ThreedObjectSettings {
  entity: EntityInfo;
  modelUrl: string;
  threedPositionVectorSettings: ThreedVectorSettings;
  threedRotationVectorSettings: ThreedVectorSettings;
  threedScaleVectorSettings: ThreedVectorSettings;
}

@Component({
  selector: 'tb-threed-object-settings',
  templateUrl: './threed-object-settings.component.html',
  styleUrls: ['./../widget-settings.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedObjectSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedObjectSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedObjectSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @Input()
  disabled: boolean;

  @Input()
  aliasController: IAliasController;

  @Input()
  entity?: EntityInfo;

  @Input()
  entityAttribute?: string;

  private modelValue: ThreedObjectSettings;

  private propagateChange = null;

  public threedObjectSettingsFormGroup: FormGroup;

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private entityService: EntityService,
    private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.threedObjectSettingsFormGroup = this.fb.group({
      entity: [null, []],
      modelUrl: [null, []],
      threedPositionVectorSettings: [null, []],
      threedRotationVectorSettings: [null, []],
      threedScaleVectorSettings: [null, []],
    });
    this.threedObjectSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });

    if (this.entity && this.entityAttribute) {
      this.threedObjectSettingsFormGroup.get("modelUrl").enable();
    } else {
      this.threedObjectSettingsFormGroup.get("modelUrl").disable();
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedObjectSettingsFormGroup.disable({ emitEvent: false });
    } else {
      this.threedObjectSettingsFormGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedObjectSettings): void {
    this.modelValue = value;
    this.threedObjectSettingsFormGroup.patchValue(
      value, { emitEvent: false }
    );
  }

  public validate(c: FormControl) {
    return this.threedObjectSettingsFormGroup.valid ? null : {
      threedObjectSettings: {
        valid: false,
      },
    };
  }

  private updateModel() {
    const value: ThreedObjectSettings = this.threedObjectSettingsFormGroup.value;
    this.modelValue = value;

    // TODO: remove if...
    if (!this.propagateChange) return;

    this.propagateChange(this.modelValue);
  }
}