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
import { defaultThreedModelSettings } from 'src/app/modules/home/components/widget/threed-view-widget/threed-models';

@Component({
  selector: 'tb-threed-view-widget-settings',
  templateUrl: './threed-view-widget-settings.component.html',
  styleUrls: ['./../widget-settings.scss']
})
export class ThreedViewWidgetSettingsComponent extends WidgetSettingsComponent {

  threedViewWidgetSettingsForm: FormGroup;

  constructor(protected store: Store<AppState>,
              private fb: FormBuilder) {
    super(store);
  }

  protected settingsForm(): FormGroup {
    return this.threedViewWidgetSettingsForm;
  }

  protected defaultSettings(): WidgetSettings {
    return {
      hexColor: 0xff0000,
      imageMapProviderSettings: defaultThreedModelSettings
    };
  }

  protected onSettingsSet(settings: WidgetSettings) {
    this.threedViewWidgetSettingsForm = this.fb.group({
      hexColor: [settings.hexColor, [Validators.required]],
      imageMapProviderSettings: [settings.imageMapProviderSettings, []],
    });
  }
}

