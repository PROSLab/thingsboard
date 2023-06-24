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

import { Component, AfterViewInit, Input, OnInit, ViewChild } from '@angular/core';
import { AppState } from '@core/core.state';
import { WidgetContext } from '@home/models/widget-component.models';
import { Store } from '@ngrx/store';
import { PageComponent } from '@shared/components/page.component';
import { ThreedSimulationWidgetSettings } from './threed/threed-models';
import { SimulationHelperComponent } from '@app/shared/components/simulation-helper.component';
import {
  formattedDataFormDatasourceData,
  mergeFormattedData
} from '@core/utils';

@Component({
  selector: 'tb-threed-simulation-widget',
  templateUrl: './threed-simulation-widget.component.html',
  styleUrls: ['./threed-simulation-widget.component.scss']
})
export class ThreedSimulationWidgetComponent extends PageComponent implements OnInit, AfterViewInit {

  @ViewChild('simulationHelper') simulationHelper?: SimulationHelperComponent;

  @Input()
  ctx: WidgetContext;

  settings: ThreedSimulationWidgetSettings;

  constructor(
    protected store: Store<AppState>
  ) {
    super(store);
  }

  ngOnInit() {
    this.ctx.$scope.threedSimulationWidget = this;
    this.settings = this.ctx.settings;
  }

  ngAfterViewInit() {
    this.simulationHelper?.updateSettings(this.settings);
  }

  public onDataUpdate() {
    const data = this.ctx.data;
    let formattedData = formattedDataFormDatasourceData(data);
    if (this.ctx.latestData && this.ctx.latestData.length) {
      const formattedLatestData = formattedDataFormDatasourceData(this.ctx.latestData);
      formattedData = mergeFormattedData(formattedData, formattedLatestData);
    }
    console.log("onDataUpdate", formattedData);
    this.simulationHelper?.onDataUpdate(formattedData);
  }

  public onEditModeChanged() {
    this.simulationHelper?.onEditModeChanged(this.ctx.isEdit);
  }

  public onResize(width: number, height: number): void {
    this.simulationHelper?.onResize(width, height);
  }

  /*
  
  savePresence(presence?: number) {
    const saveData = [{
      key: "presence_sim",//this.datasource.dataKeys[0].name,
      value: presence ?? Math.round((Math.random() * 10))
    }];
    // TODO
    let entityId: EntityId;
    this.attributeService.saveEntityTimeseries(entityId, LatestTelemetry.LATEST_TELEMETRY, saveData).subscribe(() => console.log("presence saved"));
  }

  */
}
