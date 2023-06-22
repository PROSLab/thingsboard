import * as CANNON from "cannon-es";
import * as PF from "pathfinding";
import * as THREE from "three";
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as ThreedConstats from "./threed-constants";
import * as ThreedConversionUtils from "./threed-conversion-utils";
import * as ThreedModels from "./threed-models";
import { ThreedUtils } from "./threed-utils";
import { IThreedTester } from "./threed-components/ithreed-tester";
import { ThreedAbstractRaycasterComponent } from "./threed-components/threed-abstract-raycaster-component";
import { ThreedAnimatorComponent } from "./threed-components/threed-animator-component";
import { ThreedBaseComponent } from "./threed-components/threed-base-component";
import { ThreedCameraPreviewComponent } from "./threed-components/threed-camera-preview-component";
import { ThreedDefaultAmbientComponent } from "./threed-components/threed-default-ambient-component";
import { ThreedFirstPersonControllerComponent } from "./threed-components/threed-first-person-controller-component";
import { ThreedGameObjectComponent } from "./threed-components/threed-gameobject-component";
import { ThreedGroupGameObjectComponent } from "./threed-components/threed-group-gameobject-component";
import { ThreedHightlightRaycasterComponent } from "./threed-components/threed-hightlight-raycaster-component";
import { ThreedHightlightTooltipRaycasterComponent } from "./threed-components/threed-hightlight-tooltip-raycaster-component";
import { ThreedMoveToPositionComponent } from "./threed-components/threed-move-to-position-component";
import { ThreedNavMeshComponent } from "./threed-components/threed-nav-mesh-component";
import { ThreedOrbitControllerComponent } from "./threed-components/threed-orbit-controller-component";
import { ThreedPersonComponent } from "./threed-components/threed-person-component";
import { ThreedPerspectiveCameraComponent } from "./threed-components/threed-perspective-camera-component";
import { ThreedProgressBarComponent } from "./threed-components/threed-progress-bar-component";
import { ThreedRigidbodyComponent } from "./threed-components/threed-rigidbody-component";
import { ThreedTransformControllerComponent } from "./threed-components/threed-transform-controller-component";
import { ThreedTransformRaycasterComponent } from "./threed-components/threed-transform-raycaster-component";
import { ThreedVrControllerComponent } from "./threed-components/threed-vr-controller-component";
import { ThreedVrHightlightTooltipRaycasterComponent } from "./threed-components/threed-vr-hightlight-tooltip-raycaster-component";
import { CSS2DRaycaster } from "./threed-extensions/css2d-raycaster";
import { DebugablePerspectiveCamera } from "./threed-extensions/debugable-perspective-camera";
import { VrUi } from "./threed-extensions/vr-ui";
import { ThreedCssManager } from "./threed-managers/threed-css-manager";
import { ThreedCssRenderer } from "./threed-managers/threed-css-renderer";
import { ThreedEarthquakeController } from "./threed-managers/threed-earthquake-controller";
import { ThreedEventManager } from "./threed-managers/threed-event-manager";
import { ThreedGenericSceneManager } from "./threed-managers/threed-generic-scene-manager";
import { ThreedModelManager } from "./threed-managers/threed-model-manager";
import { ThreedPhysicManager } from "./threed-managers/threed-physic-manager";
import { ThreedWebRenderer } from "./threed-managers/threed-web-renderer";
import { ThreedSceneBuilder } from "./threed-scenes/threed-scene-builder";
import { ThreedScenes } from "./threed-scenes/threed-scenes";


export const Threed = {
    Libs: {
        THREE,
        GLTFLoader,

        CANNON,
        TWEEN,
        PF,
    },

    Components: {
        IThreedTester,
        ThreedAbstractRaycasterComponent,
        ThreedAnimatorComponent,
        ThreedBaseComponent,
        ThreedCameraPreviewComponent,
        ThreedDefaultAmbientComponent,
        ThreedFirstPersonControllerComponent,
        ThreedGameObjectComponent,
        ThreedGroupGameObjectComponent,
        ThreedHightlightRaycasterComponent,
        ThreedHightlightTooltipRaycasterComponent,
        ThreedMoveToPositionComponent,
        ThreedNavMeshComponent,
        ThreedOrbitControllerComponent,
        ThreedPersonComponent,
        ThreedPerspectiveCameraComponent,
        ThreedProgressBarComponent,
        ThreedRigidbodyComponent,
        ThreedTransformControllerComponent,
        ThreedTransformRaycasterComponent,
        ThreedVrControllerComponent,
        ThreedVrHightlightTooltipRaycasterComponent,
    },

    Extensions: {
        CSS2DRaycaster,
        DebugablePerspectiveCamera,
        VrUi
    },

    Managers: {
        ThreedCssManager,
        ThreedCssRenderer,
        ThreedEarthquakeController,
        ThreedEventManager,
        ThreedGenericSceneManager,
        ThreedModelManager,
        ThreedPhysicManager,
        ThreedWebRenderer
    },

    Scenes: {
        ThreedSceneBuilder,
        ThreedScenes
    },

    ThreedConstats,
    ThreedConversionUtils,
    ThreedModels,
    ThreedUtils
}