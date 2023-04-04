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

import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, forwardRef } from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  Validator
} from '@angular/forms';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@app/core/services/threed-model-loader.service';
import { ThreedModelInputComponent } from '@app/shared/components/threed-model-input.component';
import { IAliasController } from '@core/api/widget-api.models';
import { AppState } from '@core/core.state';
import {
  ShowTooltipAction,
  showTooltipActionTranslationMap
} from '@home/components/widget/lib/maps/map-models';
import { ThreedObjectSettings, defaultThreedVectorOneSettings, defaultThreedVectorZeroSettings } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { PageComponent } from '@shared/components/page.component';
import { ThreedTransformControllerComponent } from '../../../threed-view-widget/threed/threed-components/threed-transform-controller-component';
import { ThreedGenericSceneManager } from '../../../threed-view-widget/threed/threed-managers/threed-generic-scene-manager';

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
  deletable: boolean = true;

  @Input()
  aliasController: IAliasController;

  @Input()
  entityAttribute?: string;

  @Input()
  entityAlias?: string;

  @Input()
  sceneEditor: ThreedGenericSceneManager;

  @Input()
  customObjectId?: string;

  @Output()
  removeObject = new EventEmitter();

  private modelValue: ThreedObjectSettings;

  private propagateChange = null;

  public threedObjectSettingsFormGroup: FormGroup;

  showTooltipActions = Object.values(ShowTooltipAction);

  showTooltipActionTranslations = showTooltipActionTranslationMap;

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

      showTooltip: [null, []],
      showTooltipAction: [null, []],
      tooltipPattern: [null, []],
      tooltipOffsetX: [null, []],
      tooltipOffsetY: [null, []],

      threedPositionVectorSettings: [defaultThreedVectorZeroSettings, []],
      threedRotationVectorSettings: [defaultThreedVectorZeroSettings, []],
      threedScaleVectorSettings: [defaultThreedVectorOneSettings, []],
    });

    this.threedObjectSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });
    this.threedObjectSettingsFormGroup.get('showTooltip').valueChanges.subscribe(() => {
      this.updateValidators(true);
    });

    const transformComponent = this.sceneEditor.getComponent(ThreedTransformControllerComponent);
    transformComponent.positionChanged.subscribe(v => this.updateObjectVector(v, "threedPositionVectorSettings"));
    transformComponent.rotationChanged.subscribe(v => this.updateObjectVector(v, "threedRotationVectorSettings"));
    transformComponent.scaleChanged.subscribe(v => this.updateObjectVector(v, "threedScaleVectorSettings"));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.entityAttribute) {
      this.entityAttribute = changes.entityAttribute.currentValue;
      this.entityAttributeChanged();
    }
    if (changes.entityAlias) {
      this.entityAlias = changes.entityAlias.currentValue;
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
    if (!this.propagateChange) {
      console.error("PropagateChange undefined");
      return;
    }

    this.propagateChange(this.modelValue);
  }

  private updateValidators(emitEvent?: boolean): void {
    const showTooltip: boolean = this.threedObjectSettingsFormGroup.get('showTooltip').value;
    if (showTooltip) {
      this.threedObjectSettingsFormGroup.get('showTooltipAction').enable({emitEvent});
      this.threedObjectSettingsFormGroup.get('tooltipOffsetX').enable({emitEvent});
      this.threedObjectSettingsFormGroup.get('tooltipOffsetY').enable({emitEvent});
      this.threedObjectSettingsFormGroup.get('tooltipPattern').enable({emitEvent});
    } else {
      this.threedObjectSettingsFormGroup.get('showTooltipAction').disable({emitEvent});
      this.threedObjectSettingsFormGroup.get('tooltipPattern').disable({emitEvent});
      this.threedObjectSettingsFormGroup.get('tooltipOffsetX').disable({emitEvent});
      this.threedObjectSettingsFormGroup.get('tooltipOffsetY').disable({emitEvent});
    }

    this.threedObjectSettingsFormGroup.get('showTooltipAction').updateValueAndValidity({emitEvent: false});
    this.threedObjectSettingsFormGroup.get('tooltipPattern').updateValueAndValidity({emitEvent: false});
    this.threedObjectSettingsFormGroup.get('tooltipOffsetX').updateValueAndValidity({emitEvent: false});
    this.threedObjectSettingsFormGroup.get('tooltipOffsetY').updateValueAndValidity({emitEvent: false});  
  }

  private entityAttributeChanged(emitEvent: boolean = true) {
    console.log("entityAttributeChanged", this.entityAttribute, this.entityAlias);
    if (this.entityAttribute != null) {
      this.threedObjectSettingsFormGroup?.get("modelUrl").disable({ emitEvent });
      this.tryLoadModel();
    } else {
      this.threedObjectSettingsFormGroup?.get("modelUrl").enable({ emitEvent });
      const base64 = this.threedObjectSettingsFormGroup?.get("modelUrl").value;
      this.modelInput?.writeValue(base64);
    }
  }

  private tryLoadModel() {
    console.log(this.modelValue);
    if (!this.modelValue?.entity || !this.entityAttribute || !this.entityAlias) return;

    const config: ThreedUniversalModelLoaderConfig = {
      entityLoader: {
        entity: this.modelValue.entity,
        entityAlias: this.entityAlias,
        entityAttribute: this.entityAttribute,
      },
      aliasController: this.aliasController
    };
    this.loader.loadModelAsUrl(config).subscribe(url => {
      this.modelInput?.writeValue(url.base64);
    });
  }

  private updateObjectVector(objectVector: any, formName: string) {
    console.log("updateObjectVector", objectVector, formName, (this.customObjectId || this.modelValue?.entity?.id));
    if (objectVector.id == (this.customObjectId || this.modelValue?.entity?.id))
      this.threedObjectSettingsFormGroup.get(formName).setValue(objectVector.vector, { emitValue: false });
  }
}