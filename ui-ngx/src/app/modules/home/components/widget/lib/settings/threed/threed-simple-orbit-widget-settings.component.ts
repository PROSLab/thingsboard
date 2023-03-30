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

import { AfterViewInit, Component, ViewChild, ElementRef, HostListener, OnInit, AfterContentChecked } from '@angular/core';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/models/widget.models';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { ThreedSimpleOrbitWidgetSettings } from '@home/components/widget/threed-view-widget/threed-models';
import { ThreedSceneEditor } from '@home/components/widget/threed-view-widget/threed-scene-editor';
import { ThreedSceneControllerType } from '@home/components/widget/threed-view-widget/threed-constants';
import { ThreedEntityKeySettings } from './aliases/threed-entity-key-settings.component';
import { ThreedModelInputComponent } from '@app/shared/components/threed-model-input.component';
import { EntityInfo } from '@app/shared/public-api';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@app/core/services/threed-model-loader.service';

@Component({
  selector: 'tb-threed-simple-orbit-widget-settings',
  templateUrl: './threed-simple-orbit-widget-settings.component.html',
  styleUrls: ['./threed-simple-orbit-widget-settings.component.scss', './../widget-settings.scss']
})
export class ThreedSimpleOrbitWidgetSettingsComponent extends WidgetSettingsComponent implements OnInit {

  @ViewChild("modelInput") modelInput: ThreedModelInputComponent;

  threedSimpleOrbitWidgetSettingsForm: FormGroup;

  public entityAlias?: string;
  private entityAttribute?: string;
  private entity?: EntityInfo;
  private lastEntityKeySettings?: ThreedEntityKeySettings;

  constructor(
    protected store: Store<AppState>,
    private loader: ThreedModelLoaderService,
    private fb: FormBuilder) {
    super(store);

  }

  ngOnInit() {
    if (this.widget.config.datasources) {
      const datasource = this.widget.config.datasources[0];
      const aliases = this.aliasController.getEntityAliases();
      const entityAliasId = datasource.entityAliasId;
      this.entityAlias = aliases[entityAliasId].alias;
      this.aliasController.resolveSingleEntityInfo(entityAliasId).subscribe(entity => {
        this.entity = entity;
        this.entityAttributeChanged(false);
      });
    }

    this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').valueChanges.subscribe(() => this.entityAttributeChanged());
  }

  protected settingsForm(): FormGroup {
    return this.threedSimpleOrbitWidgetSettingsForm;
  }

  protected override defaultSettings(): WidgetSettings {
    return {
      threedEntityKeySettings: null,
      useAttribute: false,
      modelUrl: null
    } as ThreedSimpleOrbitWidgetSettings;
  }

  protected onSettingsSet(settings: WidgetSettings) {
    console.log(this.settings);
    const t_settings = settings as ThreedSimpleOrbitWidgetSettings;

    this.lastEntityKeySettings = t_settings.threedEntityKeySettings;

    this.threedSimpleOrbitWidgetSettingsForm = this.fb.group({
      threedEntityKeySettings: [t_settings.threedEntityKeySettings, []],
      useAttribute: [t_settings.useAttribute, []],
      modelUrl: [t_settings.modelUrl, []],
    });
  }

  protected doUpdateSettings(settingsForm: FormGroup, settings: WidgetSettings) {
    const t_settings = settings as ThreedSimpleOrbitWidgetSettings;
    this.lastEntityKeySettings = t_settings.threedEntityKeySettings;
    this.entityAttributeChanged(false);
  }

  protected validatorTriggers(): string[] {
    return ['useAttribute'];
  }

  protected updateValidators(emitEvent: boolean) {
    const useAttribute: boolean = this.threedSimpleOrbitWidgetSettingsForm.get('useAttribute').value;

    if (useAttribute) {
      this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').enable({ emitEvent });
      this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').setValue({ entityAttribute: this.lastEntityKeySettings?.entityAttribute || "" }, { emitEvent });
      this.entityAttribute = this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').value.entityAttribute;
    } else {
      this.lastEntityKeySettings = this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').value?.entityAttribute;
      this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').disable({ emitEvent });
      this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').setValue({ entityAttribute: null }, { emitEvent });
      this.entityAttribute = null;
    }

    this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').updateValueAndValidity({ emitEvent });
  }

  private entityAttributeChanged(emitEvent: boolean = true) {
    this.updateEntityKeySettings();
    if (this.entityAttribute != null) {
      this.threedSimpleOrbitWidgetSettingsForm?.get("modelUrl").disable({ emitEvent });
      this.tryLoadModel();
    } else {
      this.threedSimpleOrbitWidgetSettingsForm?.get("modelUrl").enable({ emitEvent });
      const base64 = this.threedSimpleOrbitWidgetSettingsForm?.get("modelUrl").value;
      this.modelInput?.writeValue(base64);
    }
  }

  private updateEntityKeySettings() {
    const useAttribute = this.threedSimpleOrbitWidgetSettingsForm.get('useAttribute').value;
    const entityAttribute = this.threedSimpleOrbitWidgetSettingsForm.get('threedEntityKeySettings').value?.entityAttribute;
    this.entityAttribute = useAttribute ? entityAttribute || "" : null;
  }

  private tryLoadModel() {
    if (!this.entity || !this.entityAttribute || !this.entityAlias) return;

    const config: ThreedUniversalModelLoaderConfig = {
      entityLoader: {
        entity: this.entity,
        entityAlias: this.entityAlias,
        entityAttribute: this.entityAttribute,
      },
      aliasController: this.aliasController
    };
    this.loader.loadModelAsUrl(config).subscribe(url => {
      this.modelInput?.writeValue(url.base64);
    });
  }
}