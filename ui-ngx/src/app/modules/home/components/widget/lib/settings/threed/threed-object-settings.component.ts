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

import { Component, EventEmitter, Output, forwardRef, Input, OnChanges, OnInit, AfterViewInit, SimpleChanges, ViewChild } from '@angular/core';
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
import { ThreedVectorSettings } from '@home/components/widget/threed-view-widget/threed-models';
import { EntityInfo } from '@app/shared/public-api';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@app/core/services/threed-model-loader.service';
import { ThreedModelInputComponent } from '@app/shared/components/threed-model-input.component';

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
export class ThreedObjectSettingsComponent extends PageComponent implements OnInit, OnChanges, AfterViewInit, ControlValueAccessor, Validator {

  @ViewChild("modelInput")
  modelInput: ThreedModelInputComponent;

  @Input()
  disabled: boolean;

  @Input()
  aliasController: IAliasController;

  @Input()
  entityAttribute?: string;

  @Output()
  removeObject = new EventEmitter();

  private modelValue: ThreedObjectSettings;

  private propagateChange = null;

  public threedObjectSettingsFormGroup: FormGroup;

  private lastEntityAttribute?: string;


  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private loader: ThreedModelLoaderService,
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.entityAttribute) {
      this.entityAttribute = changes.entityAttribute.currentValue;

      this.entityAttributeChanged();
    }
  }

  ngAfterViewInit() {
    this.entityAttributeChanged(false);
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

  private entityAttributeChanged(emitEvent: boolean = true) {
    if (this.entityAttribute != null && this.entityAttribute != "null") {
      this.threedObjectSettingsFormGroup?.get("modelUrl").disable({ emitEvent });
      this.tryLoadModel();
    } else {
      this.threedObjectSettingsFormGroup?.get("modelUrl").enable({ emitEvent });
      const base64 = this.threedObjectSettingsFormGroup?.get("modelUrl").value;
      this.modelInput?.writeValue(base64);
    }
  }

  private tryLoadModel() {
    if (!this.modelValue?.entity || !this.entityAttribute) return;

    const config: ThreedUniversalModelLoaderConfig = {
      entityLoader: {
        entity: this.modelValue.entity,
        entityAttribute: this.entityAttribute
      },
      aliasController: this.aliasController
    };
    this.loader.loadModelAsUrl(config).subscribe(url => {
      this.modelInput?.writeValue(url.base64);
    });
  }
}