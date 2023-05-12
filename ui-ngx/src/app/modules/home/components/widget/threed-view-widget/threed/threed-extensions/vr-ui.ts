import * as THREE from 'three';
import { createText } from 'three/examples/jsm/webxr/Text2D';
import { A_TAG, HTML_ELEMENT, ROOT_TAG } from '../threed-constants';


export class VrUi {

    public static getATag(line: string): HTMLAnchorElement | undefined {
        const parser = new DOMParser();
        const doc = parser.parseFromString(line, 'text/html');
        return doc.getElementsByTagName('a')?.[0];
    }

    public static createPanelFromHtml(
        htmlString: string,
        panelOptions: {
            margin?: number,
            backgroundColor?: number,
            opacity?: number,
            textSize?: number,
        } = {
                margin: 5,
                backgroundColor: 0x000000,
                opacity: 0.5,
                textSize: 2
            }
    ): THREE.Group {

        panelOptions.margin = panelOptions.margin || 5;
        panelOptions.backgroundColor = panelOptions.backgroundColor || 0x000000;
        panelOptions.opacity = panelOptions.opacity || 0.5;
        panelOptions.textSize = panelOptions.textSize || 2;

        const lines = htmlString.split(/<br\s*\/?>/i);
        const height = panelOptions.textSize;
        const group = new THREE.Group();
        const regex = /<[^>]*>/g;
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];

            let element: THREE.Mesh;
            const a = VrUi.getATag(line);
            if (a) {
                const text = a.innerText.replace(regex, '');
                element = VrUi.createTagA(text, height, a)
            }
            else {
                const text = line.replace(regex, '');
                element = createText(text, height);
            }

            element.userData[ROOT_TAG] = true
            element.position.set(0, (lines.length - index) * height, 0);
            element.renderOrder = 1
            group.add(element);
        }

        var bbox = new THREE.Box3().setFromObject(group);
        var cent = bbox.getCenter(new THREE.Vector3());
        var size = bbox.getSize(new THREE.Vector3());
        // Create a background Mesh
        const backgroundGeometry = new THREE.PlaneGeometry(size.x + panelOptions.margin, size.y + panelOptions.margin);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            color: panelOptions.backgroundColor,
            side: THREE.DoubleSide,
            transparent: panelOptions.opacity < 1,
            opacity: panelOptions.opacity,
        });
        const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        backgroundMesh.position.set(cent.x, cent.y, cent.z - 0.1)
        group.add(backgroundMesh);


        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        group.userData[HTML_ELEMENT] = doc.body;

        group.renderOrder = 2;
        backgroundMesh.renderOrder = 0;
        return group;
        //this.sceneManager.scene.add(group);

        /* 
        const box = new THREE.BoxHelper(group, 0xffff00);
        box.renderOrder = 3;
        this.sceneManager.scene.add(box);
        */
    }

    public static createTagA(message: string, height: number, a: HTMLAnchorElement) {

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        let metrics = null;
        const textHeight = 100;
        context.font = 'normal ' + textHeight + 'px Arial';
        metrics = context.measureText(message);
        const textWidth = metrics.width;
        canvas.width = textWidth;
        canvas.height = textHeight+2;
        context.font = 'normal ' + textHeight + 'px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#0000ff';
        context.fillText(message, textWidth / 2, textHeight / 2);
        // underline text
        context.fillRect(0, textHeight, textWidth*2, 2);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            map: texture,
            transparent: true,
        });
        const geometry = new THREE.PlaneGeometry(
            (height * textWidth) / textHeight,
            height
        );
        const plane = new THREE.Mesh(geometry, material);
        plane.userData[A_TAG] = a;
        return plane;
    }

}