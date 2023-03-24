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
  defaultThreedVectorOneSettings,
  defaultThreedVectorZeroSettings,
  ThreedEnvironmentSettings,
  ThreedSceneSettings,
} from '@home/components/widget/threed-view-widget/threed-models';
import { IAliasController } from '@app/core/public-api';
import { ThreedEntityAliasSettings } from './aliases/threed-entity-alias-settings.component';
import { ThreedEntityKeySettings, ThreedEntityKeySettingsComponent } from './aliases/threed-entity-key-settings.component';
import { ThreedObjectSettings } from './threed-object-settings.component';
import { ThreedSceneEditor } from '../../../threed-view-widget/threed-scene-editor';


@Component({
  selector: 'tb-threed-environment-settings',
  templateUrl: './threed-environment-settings.component.html',
  styleUrls: ['./../widget-settings.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedEnvironmentSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedEnvironmentSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedEnvironmentSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @Input()
  disabled: boolean;

  @Input()
  aliasController: IAliasController;

  @Input()
  threedSceneEditor: ThreedSceneEditor;

  @ViewChild("entityKeySettings")
  entityKeySettings?: ThreedEntityKeySettingsComponent;

  private modelValue: ThreedEnvironmentSettings;

  private propagateChange = null;

  public threedEnvironmentSettingsFormGroup: FormGroup;

  public entityAttribute?: string;
  private lastEntityKeySettings?: ThreedEntityKeySettings;

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder) {
    super(store);

  }

  ngOnInit(): void {
    this.threedEnvironmentSettingsFormGroup = this.fb.group({
      threedEntityAliasSettings: [null, []],
      threedEntityKeySettings: [null, []],
      useAlias: [false, []],
      objectSettings: [null, []]
    });

    this.threedEnvironmentSettingsFormGroup.get('useAlias').valueChanges.subscribe(() => this.updateValidators(true));
    this.threedEnvironmentSettingsFormGroup.get('threedEntityKeySettings').valueChanges.subscribe(() => this.updateEntityKeySettings());
    this.threedEnvironmentSettingsFormGroup.get('threedEntityAliasSettings').valueChanges.subscribe(() => this.loadEntity());
    this.threedEnvironmentSettingsFormGroup.valueChanges.subscribe(() => {
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
    return this.threedEnvironmentSettingsFormGroup.valid ? null : {
      threedEnvironmentSettings: {
        valid: false,
      },
    };
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedEnvironmentSettingsFormGroup.disable({ emitEvent: false });
    } else {
      this.threedEnvironmentSettingsFormGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedEnvironmentSettings): void {
    this.modelValue = value;

    this.threedEnvironmentSettingsFormGroup.patchValue(
      this.modelValue, { emitEvent: false }
    );
    this.updateValidators(false);
  }

  private updateModel() {
    const value: ThreedEnvironmentSettings = this.threedEnvironmentSettingsFormGroup.value;
    this.modelValue = value;

    this.entityKeySettings?.updateEntityAlias(value.threedEntityAliasSettings?.entityAlias);

    // TODO: remove if...
    if (!this.propagateChange) {
      console.error("propagateChange undefined");
      return;
    }

    if (this.threedEnvironmentSettingsFormGroup.valid) {
      this.propagateChange(this.modelValue);
    } else {
      this.propagateChange(null);
    }
  }

  private updateValidators(emitEvent: boolean) {
    const useAlias: boolean = this.threedEnvironmentSettingsFormGroup.get('useAlias').value;

    if (useAlias) {
      this.threedEnvironmentSettingsFormGroup.get('threedEntityAliasSettings').enable({ emitEvent });
      this.threedEnvironmentSettingsFormGroup.get('threedEntityKeySettings').enable({ emitEvent });
      this.threedEnvironmentSettingsFormGroup.get('threedEntityKeySettings').setValue({ entityAttribute: this.lastEntityKeySettings?.entityAttribute || "" }, { emitEvent });
      this.entityAttribute = this.threedEnvironmentSettingsFormGroup.get('threedEntityKeySettings').value.entityAttribute;
    } else {
      this.lastEntityKeySettings = this.modelValue?.threedEntityKeySettings;
      this.threedEnvironmentSettingsFormGroup.get('threedEntityAliasSettings').disable({ emitEvent });
      this.threedEnvironmentSettingsFormGroup.get('threedEntityKeySettings').disable({ emitEvent });
      this.threedEnvironmentSettingsFormGroup.get('threedEntityKeySettings').setValue({ entityAttribute: null }, { emitEvent });
      this.entityAttribute = null;
    }

    this.threedEnvironmentSettingsFormGroup.get('threedEntityKeySettings').updateValueAndValidity({ emitEvent });
  }

  private updateEntityKeySettings() {
    const useAttribute = this.threedEnvironmentSettingsFormGroup.get('useAlias').value;
    const entityAttribute = this.threedEnvironmentSettingsFormGroup.get('threedEntityKeySettings').value.entityAttribute;
    this.entityAttribute = useAttribute ? entityAttribute || "" : null;
  }

  onEntityAliasChanged() {
    this.entityKeySettings?.invalidateInput();
  }

  private loadEntity() {
    const threedEntityAliasSettings: ThreedEntityAliasSettings = this.threedEnvironmentSettingsFormGroup.get('threedEntityAliasSettings').value;
    if (!threedEntityAliasSettings) return;

    const entityAliasId = this.aliasController.getEntityAliasId(threedEntityAliasSettings.entityAlias);
    if (entityAliasId == null) {
      this.threedEnvironmentSettingsFormGroup.get('objectSettings').patchValue({ entity: null });
      return;
    }

    this.aliasController.resolveSingleEntityInfo(entityAliasId).subscribe(entity => {
      this.threedEnvironmentSettingsFormGroup.get('objectSettings').patchValue({ entity });
    });
  }
}