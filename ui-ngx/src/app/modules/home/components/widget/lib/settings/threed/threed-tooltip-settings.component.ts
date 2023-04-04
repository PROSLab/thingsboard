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
import { ThreedModelLoaderService } from '@app/core/services/threed-model-loader.service';
import {
  ShowTooltipAction, 
  showTooltipActionTranslationMap
} from '@home/components/widget/lib/maps/map-models';
import { ThreedTooltipSettings } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';


@Component({
  selector: 'tb-threed-tooltip-settings',
  templateUrl: './threed-tooltip-settings.component.html',
  styleUrls: ['./../widget-settings.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedTooltipSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedTooltipSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedTooltipSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @Input()
  disabled: boolean;

  @Input()
  aliasController: IAliasController;

  private modelValue: ThreedTooltipSettings;

  private propagateChange = null;

  public threedTooltipSettingsFromGroup: FormGroup;

  showTooltipActions = Object.values(ShowTooltipAction);

  showTooltipActionTranslations = showTooltipActionTranslationMap;

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private loader: ThreedModelLoaderService,
    private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.threedTooltipSettingsFromGroup = this.fb.group({
      showTooltip: [null, []],
      showTooltipAction: [null, []],
      tooltipPattern: [null, []],
      tooltipOffsetX: [null, []],
      tooltipOffsetY: [null, []]
    });

    this.threedTooltipSettingsFromGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });
    this.threedTooltipSettingsFromGroup.get('showTooltip').valueChanges.subscribe(() => {
      this.updateValidators(true);
    });
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedTooltipSettingsFromGroup.disable({ emitEvent: false });
    } else {
      this.threedTooltipSettingsFromGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedTooltipSettings): void {
    this.modelValue = value;
    this.threedTooltipSettingsFromGroup.patchValue(
      value, { emitEvent: false }
    );
  }

  public validate(c: FormControl) {
    return this.threedTooltipSettingsFromGroup.valid ? null : {
      threedTooltipSettings: {
        valid: false,
      },
    };
  }

  private updateModel() {
    const value: ThreedTooltipSettings = this.threedTooltipSettingsFromGroup.value;
    this.modelValue = value;

    // TODO: remove if...
    if (!this.propagateChange) return;

    this.propagateChange(this.modelValue);
  }

  private updateValidators(emitEvent?: boolean): void {
    const showTooltip: boolean = this.threedTooltipSettingsFromGroup.get('showTooltip').value;
    if (showTooltip) {
      this.threedTooltipSettingsFromGroup.get('showTooltipAction').enable({emitEvent});
      this.threedTooltipSettingsFromGroup.get('tooltipOffsetX').enable({emitEvent});
      this.threedTooltipSettingsFromGroup.get('tooltipOffsetY').enable({emitEvent});
      this.threedTooltipSettingsFromGroup.get('tooltipPattern').enable({emitEvent});
    } else {
      this.threedTooltipSettingsFromGroup.get('showTooltipAction').disable({emitEvent});
      this.threedTooltipSettingsFromGroup.get('tooltipPattern').disable({emitEvent});
      this.threedTooltipSettingsFromGroup.get('tooltipOffsetX').disable({emitEvent});
      this.threedTooltipSettingsFromGroup.get('tooltipOffsetY').disable({emitEvent});
    }

    this.threedTooltipSettingsFromGroup.get('showTooltipAction').updateValueAndValidity({emitEvent: false});
    this.threedTooltipSettingsFromGroup.get('tooltipPattern').updateValueAndValidity({emitEvent: false});
    this.threedTooltipSettingsFromGroup.get('tooltipOffsetX').updateValueAndValidity({emitEvent: false});
    this.threedTooltipSettingsFromGroup.get('tooltipOffsetY').updateValueAndValidity({emitEvent: false});  
  }
}