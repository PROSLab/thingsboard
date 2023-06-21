import * as CANNON from "cannon-es";
import * as PF from "pathfinding";
import * as THREE from "three";
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js';
import * as ThreedConstats from "./threed-constants";
import * as ThreedConversionUtils from "./threed-conversion-utils";
import * as ThreedModels from "./threed-models";
import { ThreedUtils } from "./threed-utils";

export const Threed = {
    Libs: {
        THREE,
        CANNON,
        TWEEN,
        PF
    },

    ThreedConstats,
    ThreedConversionUtils,
    ThreedModels,
    ThreedUtils
}