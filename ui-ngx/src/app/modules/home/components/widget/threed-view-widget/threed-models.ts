import { EntityInfo } from "@app/shared/public-api";
import { ThreedEntityAliasSettings } from "../lib/settings/threed/aliases/threed-entity-alias-settings.component";
import { ThreedEntityKeySettings } from "../lib/settings/threed/aliases/threed-entity-key-settings.component";

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



export interface ThreedObjectSettings {
    entity: EntityInfo;
    modelUrl: string;
    threedPositionVectorSettings: ThreedVectorSettings;
    threedRotationVectorSettings: ThreedVectorSettings;
    threedScaleVectorSettings: ThreedVectorSettings;
}



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
}
export const defaultThreedDeviceGroupSettings: ThreedDeviceGroupSettings = {
    threedEntityAliasSettings: { entityAlias: "" },
    useAttribute: false,
    threedEntityKeySettings: { entityAttribute: "" },
    threedObjectSettings: [],
    threedTooltipSettings: defaultThreedTooltipSettings
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