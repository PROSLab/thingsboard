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

import { Component } from '@angular/core';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/models/widget.models';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { defaultThreedSceneSettings, ThreedComplexOrbitWidgetSettings } from '@home/components/widget/threed-view-widget/threed-models';
import { ThreedSceneControllerType } from '@home/components/widget/threed-view-widget/threed-constants';

@Component({
  selector: 'tb-threed-complex-orbit-widget-settings',
  templateUrl: './threed-complex-orbit-widget-settings.component.html',
  styleUrls: ['./../widget-settings.scss']
})
export class ThreedComplexOrbitWidgetSettingsComponent extends WidgetSettingsComponent {

  threedViewWidgetSettingsForm: FormGroup;

  ThreedSceneControllerType = ThreedSceneControllerType;

  constructor(protected store: Store<AppState>,
              private fb: FormBuilder) {
    super(store);

  }

  protected settingsForm(): FormGroup {
    return this.threedViewWidgetSettingsForm;
  }

  protected override defaultSettings(): WidgetSettings {    
    return {
      hoverColor: "rgba(255,0,0,0.5)",
      threedSceneSettings:  defaultThreedSceneSettings
    } as ThreedComplexOrbitWidgetSettings;
  }

  protected onSettingsSet(settings: WidgetSettings) {
    const t_settings = settings as ThreedComplexOrbitWidgetSettings;

    this.threedViewWidgetSettingsForm = this.fb.group({
      hoverColor: [t_settings.hoverColor, [Validators.required]],
      threedSceneSettings: [t_settings.threedSceneSettings, []],
    });
  }
}


