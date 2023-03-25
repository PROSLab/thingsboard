import { ThreedEntityAliasSettings } from "../lib/settings/threed/aliases/threed-entity-alias-settings.component";
import { ThreedEntityKeySettings } from "../lib/settings/threed/aliases/threed-entity-key-settings.component";
import { ThreedDeviceGroupSettings } from "../lib/settings/threed/threed-device-group-settings.component";
import { ThreedObjectSettings } from "../lib/settings/threed/threed-object-settings.component";

export interface ThreedViewWidgetSettings {
    hexColor: number;
    //threedModelSettings: ThreedModelSettings;
    threedSceneSettings: ThreedSceneSettings;
    threedTooltipSettings: ThreedTooltipSettings;
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



export interface ThreedEnvironmentSettings {
    threedEntityAliasSettings: ThreedEntityAliasSettings;
    threedEntityKeySettings: ThreedEntityKeySettings;
    useAlias: boolean;
    objectSettings: ThreedObjectSettings;
}
export const defaultThreedEnvironmentSettings: ThreedEnvironmentSettings = {
    threedEntityAliasSettings: { entityAlias: "" },
    useAlias: false,
    threedEntityKeySettings: { entityAttribute: "" },
    objectSettings: null
}



export interface ThreedDevicesSettings {
    threedDeviceGroupSettings: ThreedDeviceGroupSettings[];
}
export const defaultThreedDevicesSettings: ThreedDevicesSettings = {
    threedDeviceGroupSettings: [],
};



export interface ThreedTooltipSettings {
    showTooltip: boolean;
    showTooltipAction: string;
    tooltipPattern: string;
    tooltipOffsetX: number;
    tooltipOffsetY: number;
}
export const defaultThreedTooltipSettings: ThreedTooltipSettings = {
    showTooltip: true,
    showTooltipAction: 'hover',
    tooltipPattern: '<b>${entityName}</b>',
    tooltipOffsetX: 0,
    tooltipOffsetY: 0,
}




export interface ThreedSceneSettings {
    /*threedScaleVectorSettings: ThreedVectorSettings,
    threedPositionVectorSettings: ThreedVectorSettings,
    threedRotationVectorSettings: ThreedVectorSettings*/
    threedEnvironmentSettings: ThreedEnvironmentSettings,
    threedDevicesSettings: ThreedDevicesSettings,
}
export const defaultThreedSceneSettings: ThreedSceneSettings = {
    /*threedScaleVectorSettings: defaultThreedVectorOneSettings,
    threedPositionVectorSettings: defaultThreedVectorZeroSettings,
    threedRotationVectorSettings: defaultThreedVectorZeroSettings,*/
    threedEnvironmentSettings: defaultThreedEnvironmentSettings,
    threedDevicesSettings: defaultThreedDevicesSettings,
};