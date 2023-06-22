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

import { EntityInfo } from "@app/shared/public-api";
import { ThreedEntityAliasSettings } from "@home/components/widget/lib/settings/threed/aliases/threed-entity-alias-settings.component";
import { ThreedEntityKeySettings } from "@home/components/widget/lib/settings/threed/aliases/threed-entity-key-settings.component";

export interface ThreedViewWidgetSettings {
    hoverColor: string;
    threedSceneSettings: ThreedSceneSettings;
}



export interface ThreedModelSettings {
    modelUrl?: string;
    modelEntityAlias?: string;
    modelUrlAttribute?: string;
}
export const defaultThreedModelSettings: ThreedModelSettings = {
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    modelEntityAlias: '',
    modelUrlAttribute: ''
};



export interface ThreedVectorSettings {
    x: number;
    y: number;
    z: number;
}
export const defaultThreedVectorZeroSettings: ThreedVectorSettings = {
    x: 0,
    y: 0,
    z: 0
};
export const defaultThreedVectorOneSettings: ThreedVectorSettings = {
    x: 1,
    y: 1,
    z: 1
};



export interface ThreedMarkerSettings {
    showMarker: boolean;
    useMarkerImageFunction: boolean;
    markerImage?: string;
    markerImageSize?: number;
    markerImageFunction?: string;
    markerImages?: string[];
}
export const defaultThreedMarkerSettings: ThreedMarkerSettings = {
    showMarker: false,
    useMarkerImageFunction: false,
    markerImage: null,
    markerImageSize: 34,
    markerImageFunction: null,
    markerImages: []
}



export interface ThreedObjectSettings {
    entity: EntityInfo;
    modelUrl: string;
    threedPositionVectorSettings: ThreedVectorSettings;
    threedRotationVectorSettings: ThreedVectorSettings;
    threedScaleVectorSettings: ThreedVectorSettings;
}



export interface ThreedTooltipSettings {
    showTooltip: boolean;
    tooltipPattern: string;
    tooltipOffsetX: number;
    tooltipOffsetY: number;
}
export const defaultThreedTooltipSettings: ThreedTooltipSettings = {
    showTooltip: true,
    tooltipPattern: '<b>${entityName}</b>',
    tooltipOffsetX: 0,
    tooltipOffsetY: 0,
}



export interface ThreedCameraSettings {
    near: number;
    far: number;
    fov: number;
    initialPosition: ThreedVectorSettings;
    initialRotation: ThreedVectorSettings;
}
export const defaultThreedCameraSettings: ThreedCameraSettings = {
    near: 0.1,
    far: 1000,
    fov: 60,
    initialPosition: defaultThreedVectorZeroSettings,
    initialRotation: defaultThreedVectorZeroSettings
}



export interface ThreedEnvironmentSettings {
    threedEntityAliasSettings: ThreedEntityAliasSettings;
    threedEntityKeySettings: ThreedEntityKeySettings;
    useAlias: boolean;
    objectSettings: ThreedObjectSettings | null;
}
export const defaultThreedEnvironmentSettings: ThreedEnvironmentSettings = {
    threedEntityAliasSettings: { entityAlias: "" },
    useAlias: false,
    threedEntityKeySettings: { entityAttribute: "" },
    objectSettings: null
}



export interface ThreedDeviceGroupSettings {
    threedEntityAliasSettings: ThreedEntityAliasSettings;
    useAttribute: boolean;
    threedEntityKeySettings: ThreedEntityKeySettings;
    threedObjectSettings: ThreedObjectSettings[];
    threedTooltipSettings: ThreedTooltipSettings;
    threedMarkerSettings: ThreedMarkerSettings;
}
export const defaultThreedDeviceGroupSettings: ThreedDeviceGroupSettings = {
    threedEntityAliasSettings: { entityAlias: "" },
    useAttribute: false,
    threedEntityKeySettings: { entityAttribute: "" },
    threedObjectSettings: [],
    threedTooltipSettings: defaultThreedTooltipSettings,
    threedMarkerSettings: defaultThreedMarkerSettings
};



export interface ThreedDevicesSettings {
    threedDeviceGroupSettings: ThreedDeviceGroupSettings[];
}
export const defaultThreedDevicesSettings: ThreedDevicesSettings = {
    threedDeviceGroupSettings: [],
};



export interface ThreedSceneSettings {
    /*threedScaleVectorSettings: ThreedVectorSettings,
    threedPositionVectorSettings: ThreedVectorSettings,
    threedRotationVectorSettings: ThreedVectorSettings*/
    threedEnvironmentSettings: ThreedEnvironmentSettings,
    threedCameraSettings: ThreedCameraSettings,
    threedDevicesSettings: ThreedDevicesSettings,
}
export const defaultThreedSceneSettings: ThreedSceneSettings = {
    /*threedScaleVectorSettings: defaultThreedVectorOneSettings,
    threedPositionVectorSettings: defaultThreedVectorZeroSettings,
    threedRotationVectorSettings: defaultThreedVectorZeroSettings,*/
    threedEnvironmentSettings: defaultThreedEnvironmentSettings,
    threedCameraSettings: defaultThreedCameraSettings,
    threedDevicesSettings: defaultThreedDevicesSettings,
};



/* -------------------------------------------------------------- */
/*                      ORBIT SETTINGS                            */
/* -------------------------------------------------------------- */
export interface ThreedSimpleOrbitWidgetSettings {
    threedEntityKeySettings: ThreedEntityKeySettings,
    useAttribute: boolean,
    modelUrl: string,
}
export interface ThreedComplexOrbitWidgetSettings {
    hoverColor: string,
    threedSceneSettings: ThreedSceneSettings
}
export const isThreedSimpleOrbitWidgetSettings = function (obj: any): obj is ThreedSimpleOrbitWidgetSettings {
    return 'useAttribute' in obj;
}
export const isThreedComplexOrbitWidgetSettings = function (obj: any): obj is ThreedComplexOrbitWidgetSettings {
    return 'threedSceneSettings' in obj && 'hoverColor' in obj;
}



/* -------------------------------------------------------------- */
/*                  SIMULATION SETTINGS                           */
/* -------------------------------------------------------------- */
export interface ThreedSimulationWidgetSettings {
    assets: AssetModel[],
    scripts: ScriptModel[],
    menuHtml: string,
    menuCss: string,
    menuJs: string,

    assetUrl: string,
    jsTextFunction: string,
}

export const defaultThreedSimulationWidgetSettings: ThreedSimulationWidgetSettings = {
    assets: [],
    scripts: [
        { name: "setup.js", body: "/* This is the first function executed. You must create the simulation scene here (the setup)!\nYou can use async function, the important thing is to return the Promise at the end! */\nreturn (async function() { await new Promise(resolve => setTimeout(resolve, 1000)); console.log('hello'); })();", deletable: false },
        { name: "start.js", body: "/* This code is executed when the user clicks the play button on the simulation. The simulation should start */", deletable: false },
        { name: "reset.js", body: "/* This code is executed when the user clicks the reset button on the simulation. The simulation should reset */", deletable: false },
        { name: "stop.js", body: "/* This code is executed when the user clicks the stop button on the simulation. You should delete/destory objects that could continue to live */", deletable: false },
        { name: "onDataUpdate.js", body: "/* This code is executed each time there is an update of the data/telemetries of an Entity */", deletable: false },
    ],
    menuHtml: '<div class=\'card\'>HTML code here</div>',
    menuCss: '.card {\n font-weight: bold; \n}',
    menuJs: '',

    assetUrl: null,
    jsTextFunction: "",
};

export interface ScriptModel {
    name: string,
    body: string,
    deletable?: boolean,
}

export interface AssetModel {
    name: string,
    fileName: string,
    type?: string,
    base64: string
}

export enum SimulationState {
    UNCOMPILED, COMPILING, SETUP_DONE, STARTED, STOPPED
}