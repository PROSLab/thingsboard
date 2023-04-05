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

import { WidgetContext } from "@app/modules/home/models/widget-component.models";
import {
    fillDataPattern,
    formattedDataFormDatasourceData,
    mergeFormattedData,
    processDataPattern
} from '@core/utils';
import { parseWithTranslation } from '../lib/maps/common-maps-utils';
import { ThreedWidgetActionManager } from "./threed-widget-action-manager";
import { IThreedSceneManager } from "./threed/threed-managers/ithreed-scene-manager";
import { ACTIONS } from "./threed/threed-constants";
import { ThreedDevicesSettings } from "./threed/threed-models";


export class ThreedWidgetDataUpdateManager {

    private readonly ctx: WidgetContext;
    private readonly actionManager: ThreedWidgetActionManager;

    constructor(
        ctx: WidgetContext,
        actionManager: ThreedWidgetActionManager
    ) {
        this.ctx = ctx;
        this.actionManager = actionManager;
    }

    public onDataUpdate(settings: ThreedDevicesSettings, scene: IThreedSceneManager) {
        if(!settings || !scene) return;
        
        const data = this.ctx.data;
        let formattedData = formattedDataFormDatasourceData(data);
        if (this.ctx.latestData && this.ctx.latestData.length) {
            const formattedLatestData = formattedDataFormDatasourceData(this.ctx.latestData);
            formattedData = mergeFormattedData(formattedData, formattedLatestData);
        }

        // We associate the new data with the tooltip settings, according to the entity alias
        formattedData.forEach(fd => {
            settings.threedDeviceGroupSettings?.forEach(deviceGroup => {
                if (deviceGroup.threedTooltipSettings.showTooltip) {
                    if (deviceGroup.threedEntityAliasSettings.entityAlias == fd.aliasName) {
                        const pattern = deviceGroup.threedTooltipSettings.tooltipPattern;
                        const tooltipText = parseWithTranslation.prepareProcessPattern(pattern, true);
                        const replaceInfoTooltipMarker = processDataPattern(tooltipText, fd);
                        const content = fillDataPattern(tooltipText, replaceInfoTooltipMarker, fd);

                        const tooltip = scene.cssManager.updateLabelContent([fd.entityId], content);
                        if (tooltip) this.actionManager.bindPopupActions(tooltip.divElement, fd.$datasource, ACTIONS.tooltip);
                    }
                }
            });
        });
    }
} 