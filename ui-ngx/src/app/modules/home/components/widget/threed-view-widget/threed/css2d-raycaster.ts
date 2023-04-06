import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { IThreedSceneManager } from './threed-managers/ithreed-scene-manager';

export class CSS2DRaycaster {

    private chacedCenter = new THREE.Vector2();
    constructor(private sceneManager: IThreedSceneManager) { }

    // Override the intersectObject method to handle CSS3DObjects
    intersectObject(object: THREE.Object3D, querySelector: string = "*"): Array<Element> {
        // Check if the object is a CSS3DObject
        if (object instanceof CSS2DObject) {
            // Get the HTML element
            const element = object.element;
            const childElements = element.querySelectorAll(querySelector);
            const clickedObjects: Element[] = [];
            this.chacedCenter = this.sceneManager.center;

            for (let i = 0; i < childElements.length; i++) {
                if (this.intersectHtml(childElements[i])) {
                    clickedObjects.push(childElements[i]);
                }
            }
            return clickedObjects;
        }
        else {
            return [];
        }
    }

    private intersectHtml(element: Element): boolean {
        const childRect = element.getBoundingClientRect();
        if (childRect.x == 0 && childRect.y == 0 && childRect.width == 0 && childRect.height == 0) return false;

        return this.chacedCenter.x >= childRect.left &&
            this.chacedCenter.x <= childRect.right &&
            this.chacedCenter.y >= childRect.top &&
            this.chacedCenter.y <= childRect.bottom;
    }


    // Override the intersectObjects method to handle CSS3DObjects
    intersectObjects(objects: THREE.Object3D[], querySelector: string = "*"): Array<Element> {
        var intersects = [];
        for (var i = 0; i < objects.length; i++) {
            this.intersectObject(objects[i], querySelector).forEach(e => intersects.push(e));
        }
        return intersects;
    }

}