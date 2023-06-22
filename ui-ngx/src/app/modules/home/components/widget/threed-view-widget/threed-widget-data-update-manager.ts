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
import { FormattedData } from "@app/shared/public-api";
import {
    fillDataPattern,
    formattedDataFormDatasourceData,
    mergeFormattedData,
    parseFunction,
    processDataPattern,
    safeExecute
} from '@core/utils';
import { parseWithTranslation } from '../lib/maps/common-maps-utils';
import { MarkerImageInfo } from "../lib/maps/map-models";
import { ThreedWidgetActionManager } from "./threed-widget-action-manager";
import { ACTIONS, HTML_ELEMENT } from "./threed/threed-constants";
import { IThreedSceneManager } from "./threed/threed-managers/ithreed-scene-manager";
import { ThreedDevicesSettings, ThreedMarkerSettings, ThreedTooltipSettings } from "./threed/threed-models";


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
        if (!settings || !scene) return;

        const data = this.ctx.data;
        let formattedData = formattedDataFormDatasourceData(data);
        if (this.ctx.latestData && this.ctx.latestData.length) {
            const formattedLatestData = formattedDataFormDatasourceData(this.ctx.latestData);
            formattedData = mergeFormattedData(formattedData, formattedLatestData);
        }

        // We associate the new data with the tooltip settings, according to the entity alias
        formattedData.forEach(fd => {
            settings.threedDeviceGroupSettings?.forEach(deviceGroup => {
                if (deviceGroup.threedEntityAliasSettings.entityAlias == fd.aliasName) {

                    if (deviceGroup.threedMarkerSettings?.showMarker) {
                        this.updateMarker(deviceGroup.threedMarkerSettings, formattedData, fd, scene);
                    }

                    if (deviceGroup.threedTooltipSettings.showTooltip) {
                        this.updateTooltip(deviceGroup.threedTooltipSettings, fd, scene);
                    }
                }

            });
        });

        /*
        // We associate the new data with the tooltip settings, according to the entity alias
        formattedData.forEach(fd => {
            settings.threedDeviceGroupSettings?.forEach(deviceGroup => {
    
                if (deviceGroup.threedMarkerSettings?.showMarker) {
                    this.updateMarker(deviceGroup.threedMarkerSettings, formattedData);
                }
    
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
        });*/
    }


    private updateTooltip(settings: ThreedTooltipSettings, fd: FormattedData, scene: IThreedSceneManager) {
        try {
            const pattern = settings.tooltipPattern;
            const tooltipText = parseWithTranslation.prepareProcessPattern(pattern, true);
            const replaceInfoTooltipMarker = processDataPattern(tooltipText, fd);
            const content = fillDataPattern(tooltipText, replaceInfoTooltipMarker, fd);

            const tooltip = scene.cssManager.updateLabel([fd.entityId], content);
            if (tooltip) {
                this.actionManager.bindPopupActions(tooltip.htmlElement, fd.$datasource, ACTIONS.tooltip);
                if (tooltip.vrMesh) {
                    this.actionManager.bindMeshActions(tooltip.vrMesh, fd.$datasource, ACTIONS.tooltip);
                }
            }
        } catch (_) { }
    }

    private updateMarker(settings: ThreedMarkerSettings, markersData: FormattedData[], data: FormattedData, scene: IThreedSceneManager) {

        const parsedMarkerImageFunction = parseFunction(settings.markerImageFunction, ['data', 'images', 'dsData', 'dsIndex']);
        const image = (settings.markerImage?.length) ? {
            url: settings.markerImage,
            size: settings.markerImageSize || 34
        } : null;

        const currentImage: MarkerImageInfo = settings.useMarkerImageFunction ?
            safeExecute(parsedMarkerImageFunction,
                [data, settings.markerImages, markersData, data.dsIndex]) : image;
        //const imageSize = `height: ${settings.markerImageSize || 34}px; width: ${settings.markerImageSize || 34}px;`;
        //const style = currentImage ? 'background-image: url(' + currentImage.url + '); ' + imageSize : '';

        scene.cssManager.updateImage([data.entityId], currentImage);
    }

    /*
    private updateMarker(settings: ThreedMarkerSettings, markersData: FormattedData[]) {

        const parsedMarkerImageFunction = parseFunction(settings.markerImageFunction, ['data', 'images', 'dsData', 'dsIndex']);
        const image = (settings.markerImage?.length) ? {
            url: settings.markerImage,
            size: settings.markerImageSize || 34
        } : null;


        markersData.forEach(data => {
            const currentImage: MarkerImageInfo = settings.useMarkerImageFunction ?
                safeExecute(parsedMarkerImageFunction,
                    [data, settings.markerImages, markersData, data.dsIndex]) : image;
            const imageSize = `height: ${settings.markerImageSize || 34}px; width: ${settings.markerImageSize || 34}px;`;
            const style = currentImage ? 'background-image: url(' + currentImage.url + '); ' + imageSize : '';

            console.log(currentImage, style);

            settings.icon = {
                icon: L.divIcon({
                    html: `<div class="arrow"
               style="transform: translate(-10px, -10px)
               rotate(${data.rotationAngle}deg);
               ${style}"><div>`
                }), size: [30, 30]
            };
        });
    }*/
} 