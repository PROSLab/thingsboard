import { ThreedDeviceGroupSettings } from "../lib/settings/threed/threed-device-group-settings.component";

export interface ThreedViewWidgetSettings {
    hexColor: number;
    threedModelSettings: ThreedModelSettings;
    threedSceneSettings: ThreedSceneSettings;
}


export const defaultThreedModelSettings: ThreedModelSettings = {
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    modelEntityAlias: '',
    modelUrlAttribute: ''
};
export interface ThreedModelSettings {
    modelUrl?: string;
    modelEntityAlias?: string;
    modelUrlAttribute?: string;
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
export interface ThreedVectorSettings {
    x: number;
    y: number;
    z: number;
}

export const defaultThreedSceneSettings: ThreedSceneSettings = {
    threedScaleVectorSettings: defaultThreedVectorOneSettings,
    threedPositionVectorSettings: defaultThreedVectorZeroSettings,
    threedRotationVectorSettings: defaultThreedVectorZeroSettings,
};
export interface ThreedSceneSettings {
    threedScaleVectorSettings: ThreedVectorSettings,
    threedPositionVectorSettings: ThreedVectorSettings,
    threedRotationVectorSettings: ThreedVectorSettings
}

export const defaultThreedDevicesSettings: ThreedDevicesSettings = {
    threedDeviceGroupSettings: [],
};
export interface ThreedDevicesSettings {
    threedDeviceGroupSettings: ThreedDeviceGroupSettings[];
}