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

import { Injectable } from '@angular/core';
import { IThreedProgress } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-components/ithreed-progress';
import { IThreedTester } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-components/ithreed-tester';
import { IThreedSceneManager } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-managers/ithreed-scene-manager';
import {
  ThreedDeviceGroupSettings,
  ThreedEnvironmentSettings,
  ThreedSimpleOrbitWidgetSettings
} from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { IAliasController } from '@core/api/widget-api.models';
import { AttributeService } from '@core/http/attribute.service';
import { EntityInfo } from '@shared/models/entity.models';
import { EntityId } from '@shared/models/id/entity-id';
import { AttributeScope } from '@shared/models/telemetry/telemetry.models';
import { Observable, from, of } from 'rxjs';
import { catchError, map, mergeMap, switchMap } from 'rxjs/operators';
import { LoadingManager } from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ThreedUniversalModelLoaderConfig {
  entityLoader: ModelUrl | EntityAliasAttribute;

  aliasController: IAliasController;
}

export interface ModelUrl {
  url: string;
  entity?: EntityInfo;
}

export interface EntityAliasAttribute {
  entityAlias: string;
  entityAttribute: string;
  entity?: EntityInfo;
}

@Injectable({
  providedIn: 'root'
})
export class ThreedModelLoaderService {

  constructor(
    private attributeService: AttributeService) {
  }

  public areLoaderEqual(entityLoader1: ModelUrl | EntityAliasAttribute, entityLoader2: ModelUrl | EntityAliasAttribute): boolean {
    if (!entityLoader1 || !entityLoader2) return false;

    if (this.isModelUrl(entityLoader1) && this.isModelUrl(entityLoader2)) {
      return entityLoader1.url == entityLoader2.url;
    }
    else if (this.isEntityAliasAttribute(entityLoader1) && this.isEntityAliasAttribute(entityLoader2)) {
      return entityLoader1.entityAlias == entityLoader2.entityAlias &&
        entityLoader1.entityAttribute == entityLoader2.entityAttribute &&
        entityLoader1.entity.id == entityLoader2.entity.id;
    }

    return false;
  }

  public isModelUrl(obj: any): obj is ModelUrl {
    return 'url' in obj;
  }
  public isEntityAliasAttribute(obj: any): obj is EntityAliasAttribute {
    return 'entityAlias' in obj && 'entityAttribute' in obj;
  }

  public isConfigValid(config: ThreedUniversalModelLoaderConfig): boolean {
    return (config && config.aliasController && config.entityLoader) ? true : false;
  }

  public toEntityLoader2(settings: ThreedSimpleOrbitWidgetSettings, entityAlias: string): ModelUrl | EntityAliasAttribute | undefined {
    if (!settings.useAttribute && settings.modelUrl)
      return {
        url: settings.modelUrl
      } as ModelUrl;
    else if (settings.useAttribute && entityAlias && settings.threedEntityKeySettings?.entityAttribute)
      return {
        entityAlias,
        entityAttribute: settings.threedEntityKeySettings.entityAttribute
      } as EntityAliasAttribute;

    return undefined;
  }

  public toEntityLoader(settings: ThreedEnvironmentSettings): ModelUrl | EntityAliasAttribute | undefined {
    if (!settings.useAlias && settings.objectSettings?.modelUrl)
      return {
        url: settings.objectSettings.modelUrl,
        entity: settings.objectSettings.entity
      } as ModelUrl;
    else if (settings.useAlias && settings.threedEntityAliasSettings?.entityAlias && settings.threedEntityKeySettings?.entityAttribute)
      return {
        entityAlias: settings.threedEntityAliasSettings.entityAlias,
        entityAttribute: settings.threedEntityKeySettings.entityAttribute
      } as EntityAliasAttribute;

    return undefined;
  }

  public toEntityLoaders(settings: ThreedDeviceGroupSettings): (ModelUrl | EntityAliasAttribute)[] | undefined {
    if (!settings.threedEntityAliasSettings?.entityAlias)
      return undefined;
    //throw new Error("Entity alias not defined");

    if (settings.useAttribute && settings.threedEntityKeySettings?.entityAttribute) {
      let enitytInfoAttributes: EntityAliasAttribute[] = [];
      settings.threedObjectSettings.forEach(object => {
        enitytInfoAttributes.push({
          entityAlias: settings.threedEntityAliasSettings.entityAlias,
          entityAttribute: settings.threedEntityKeySettings.entityAttribute,
          entity: object.entity
        });
      });

      return enitytInfoAttributes;
    }
    else if (!settings.useAttribute && settings.threedObjectSettings) {
      let enitytInfoAttributes: ModelUrl[] = [];
      settings.threedObjectSettings.forEach(object => {
        enitytInfoAttributes.push({
          entity: object.entity,
          url: object.modelUrl
        });
      });

      return enitytInfoAttributes;
    }

    return undefined;
  }

  public loadModelAsUrl(config: ThreedUniversalModelLoaderConfig): Observable<{ entityId: string | undefined, base64: string }> {
    if (!this.isConfigValid(config))
      return of({ entityId: Math.random().toString(), base64: "/assets/models/gltf/default.glb" });

    if (this.isModelUrl(config.entityLoader)) {
      return of({ entityId: config.entityLoader.entity?.id, base64: config.entityLoader.url });
    } else if (this.isEntityAliasAttribute(config.entityLoader)) {

      if (config.entityLoader.entity) {

        const entityId: EntityId = {
          entityType: config.entityLoader.entity.entityType,
          id: config.entityLoader.entity.id
        };
        const entityAttribute = config.entityLoader.entityAttribute;
        return this.getObservableModelFromEntityIdAndAttribute(entityId, entityAttribute);

      } else {

        const entityAliasId = config.aliasController.getEntityAliasId(config.entityLoader.entityAlias);
        const entityAttribute = config.entityLoader.entityAttribute;
        let entityId: EntityId;
        return config.aliasController.resolveSingleEntityInfo(entityAliasId).pipe(
          switchMap((r: EntityInfo) => {
            entityId = {
              entityType: r.entityType,
              id: r.id
            };
            return this.getObservableModelFromEntityIdAndAttribute(entityId, entityAttribute);
          })
        );

      }
    }

    throw new Error("Invalid config");
  }

  private getObservableModelFromEntityIdAndAttribute(entityId: EntityId, entityAttribute: string): Observable<{ entityId: string | undefined, base64: string }> {
    return this.attributeService.getEntityAttributes(entityId, AttributeScope.SERVER_SCOPE, [entityAttribute])
      .pipe(
        map(attributes => {
          if (!attributes || attributes.length == 0)
            throw new Error("Invalid attribute");

          return { entityId: entityId.id || "", base64: attributes[0].value }
        })
      );
  }

  public loadModelAsGLTF(config: ThreedUniversalModelLoaderConfig, progressCallback?: IThreedProgress): Observable<{ entityId: string | undefined, model: GLTF }> {
    return this.loadModelAsUrl(config).pipe(
      mergeMap(({ entityId, base64 }) => {
        return from(this.fetchData(base64, progressCallback).then(buffer => {
          return { buffer, entityId };
        }));
      }),
      mergeMap(data => {
        try {
          const gltfLoader = new GLTFLoader();
          return from(gltfLoader.parseAsync(data.buffer, "/").then(res => {
            return {
              entityId: data.entityId,
              model: res
            };
          }));
        } catch (error) {
          // What to do?
          throw new Error(error);
        }
      }),
      catchError(error => {
        // What to do?
        throw new Error(error);
      })
    );
  }

  public loadModelInScene(scene: IThreedSceneManager, config: ThreedUniversalModelLoaderConfig, id?: string, hasTooltip: boolean = true) {
    if (!this.isConfigValid(config)) return;

    const progressBarComponent = scene.findComponentsByTester(IThreedTester.isIThreedProgress)?.[0];
    this.loadModelAsGLTF(config, progressBarComponent).subscribe(res => {
        const customId = id ? id : res.entityId;

        scene.modelManager.replaceModel(res.model, { id: customId, autoResize: true });
        if (hasTooltip) scene.cssManager.createLabel(customId);
    });
}

  private async fetchData(url: string, progressCallback?: IThreedProgress): Promise<ArrayBuffer> {
    const response = await fetch(url);
    const totalBytes = Number(response.headers.get('Content-Length')) || 1;
    let adjustedTotalBytes = totalBytes;
    let loadedBytes = 0;

    const res = new Response(new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            progressCallback?.updateProgress(1);
            break;
          }

          if (value) {
            loadedBytes += value.byteLength;
            if (adjustedTotalBytes < loadedBytes) adjustedTotalBytes = loadedBytes + 1;
            const progress = loadedBytes / adjustedTotalBytes;
            progressCallback?.updateProgress(progress);
            controller.enqueue(value);
          }
        }
        controller.close();
      },
    }));

    return res.arrayBuffer();
  }
}
