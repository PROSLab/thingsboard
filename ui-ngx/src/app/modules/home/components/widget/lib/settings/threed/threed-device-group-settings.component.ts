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

import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild, forwardRef } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormArray,
  FormBuilder,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  Validators
} from '@angular/forms';
import { IAliasController } from '@app/core/public-api';
import { EntityInfo } from '@app/shared/public-api';
import { AppState } from '@core/core.state';
import { ThreedDeviceGroupSettings, ThreedObjectSettings, defaultThreedVectorOneSettings, defaultThreedVectorZeroSettings } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { PageComponent } from '@shared/components/page.component';
import { ThreedGenericSceneManager } from '../../../threed-view-widget/threed/threed-managers/threed-generic-scene-manager';
import { ThreedEntityAliasSettings } from './aliases/threed-entity-alias-settings.component';
import { ThreedEntityKeySettings, ThreedEntityKeySettingsComponent } from './aliases/threed-entity-key-settings.component';


@Component({
  selector: 'tb-threed-device-group-settings',
  templateUrl: './threed-device-group-settings.component.html',
  styleUrls: ['./threed-device-group-settings.component.scss', './../widget-settings.scss'],
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
export class ThreedDeviceGroupSettingsComponent extends PageComponent implements OnInit, AfterViewInit, ControlValueAccessor, Validator {

  @Input()
  disabled: boolean;

  @Input()
  aliasController: IAliasController;

  @Input()
  sceneEditor: ThreedGenericSceneManager;

  @Input()
  label: string = "Devices Group";

  @ViewChild("entityKeySettings")
  entityKeySettings?: ThreedEntityKeySettingsComponent;

  @Output()
  removeDeviceGroup = new EventEmitter();


  private modelValue: ThreedDeviceGroupSettings;

  private propagateChange = null;

  public threedDeviceGroupFormGroup: FormGroup;

  public expanded = false;
  public entityAttribute?: string;
  public entityAlias?: string;
  private lastEntityKeySettings?: ThreedEntityKeySettings;
  public deletedDevices: EntityInfo[] = [];

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.threedDeviceGroupFormGroup = this.fb.group({
      threedEntityAliasSettings: [null, [Validators.required]],
      useAttribute: [false, []],
      threedEntityKeySettings: [null, []],
      threedTooltipSettings: [null, []],
      threedObjectSettings: this.prepareObjectsFormArray([]),
    });

    this.threedDeviceGroupFormGroup.get('threedEntityAliasSettings').valueChanges.subscribe(() => this.loadEntities());
    this.threedDeviceGroupFormGroup.get('useAttribute').valueChanges.subscribe(() => this.updateValidators(true));
    this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').valueChanges.subscribe(() => {
      const useAttribute = this.threedDeviceGroupFormGroup.get('useAttribute').value;
      const entityAttribute = this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').value.entityAttribute;
      this.entityAttribute = useAttribute ? entityAttribute || "" : null;
    });

    this.threedDeviceGroupFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });

    this.updateValidators(false);
  }

  ngAfterViewInit(): void {
    this.entityKeySettings?.updateEntityAlias(this.modelValue?.threedEntityAliasSettings?.entityAlias);
  }


  private prepareObjectsFormArray(threedObjectSettings: ThreedObjectSettings[] | undefined): FormArray {
    const objectsControls: Array<AbstractControl> = [];
    if (threedObjectSettings) {
      threedObjectSettings.forEach((object) => {
        objectsControls.push(this.fb.control(object, [Validators.required]));
      });
    }
    return this.fb.array(objectsControls);
  }

  objectsFormArray(): FormArray {
    return this.threedDeviceGroupFormGroup.get('threedObjectSettings') as FormArray;
  }

  public trackByObjectControl(index: number, objectControl: AbstractControl): any {
    return objectControl;
  }

  public addObjectIfNotExists(entity: EntityInfo) {
    const objectsArray = this.threedDeviceGroupFormGroup.get('threedObjectSettings') as FormArray;

    const objectValues: ThreedObjectSettings[] = objectsArray.value;
    if (objectValues.find(o => o.entity.id == entity.id))
      return;

    const object: ThreedObjectSettings = {
      entity,
      modelUrl: "",
      threedPositionVectorSettings: defaultThreedVectorZeroSettings,
      threedRotationVectorSettings: defaultThreedVectorZeroSettings,
      threedScaleVectorSettings: defaultThreedVectorOneSettings,
    };
    const objectControl = this.fb.control(object, [Validators.required]);
    (objectControl as any).new = true;
    objectsArray.push(objectControl);
    this.threedDeviceGroupFormGroup.updateValueAndValidity();

    for (let i = 0; i < this.deletedDevices.length; i++) {
      const element = this.deletedDevices[i];
      if(element.id == entity.id){
        this.deletedDevices.splice(i, 1);
        break;
      }
    }
  }

  public removeObject(index: number) {
    const devicesFormArray = this.threedDeviceGroupFormGroup.get('threedObjectSettings') as FormArray;
    const objectControl = devicesFormArray.get([index]);
    this.deletedDevices.push(objectControl.value.entity);
    devicesFormArray.removeAt(index);
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
    this.threedDeviceGroupFormGroup.setControl('threedObjectSettings', this.prepareObjectsFormArray(value.threedObjectSettings), { emitEvent: false });
    this.lastEntityKeySettings = this.modelValue?.threedEntityKeySettings;

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

    // TODO: remove if...
    if (!this.propagateChange) {
      console.error("PropagateChange is undefined");
      return;
    }

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
      this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').setValue({ entityAttribute: this.lastEntityKeySettings?.entityAttribute || "" }, { emitEvent });
      this.entityAttribute = this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').value.entityAttribute;
      this.entityAlias = this.threedDeviceGroupFormGroup.get('threedEntityAliasSettings').value.entityAlias;
    } else {
      this.lastEntityKeySettings = this.modelValue?.threedEntityKeySettings;
      this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').disable({ emitEvent });
      this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').setValue({ entityAttribute: null }, { emitEvent });
      this.entityAttribute = null;
      this.entityAlias = null;
    }

    this.threedDeviceGroupFormGroup.get('threedEntityKeySettings').updateValueAndValidity({ emitEvent });
  }

  onEntityAliasChanged() {
    this.entityKeySettings?.invalidateInput();
  }

  private loadEntities() {
    const threedEntityAliasSettings: ThreedEntityAliasSettings = this.threedDeviceGroupFormGroup.get('threedEntityAliasSettings').value;
    const entityAliasId = this.aliasController.getEntityAliasId(threedEntityAliasSettings.entityAlias);
    if (entityAliasId == null) {
      (this.threedDeviceGroupFormGroup.get('threedObjectSettings') as FormArray).clear();
      this.entityAlias = null;
      return;
    }

    this.entityAlias = threedEntityAliasSettings.entityAlias;
    this.aliasController.resolveEntitiesInfo(entityAliasId).subscribe(eis => {
      eis.forEach(e => this.addObjectIfNotExists(e))
    });
  }
}