import { Injectable } from '@angular/core';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ThreedModelSettings
} from '@home/components/widget/threed-view-widget/threed-models';
import { IAliasController } from '@core/api/widget-api.models';
import { AttributeService } from '@core/http/attribute.service';
import { EntityId } from '@shared/models/id/entity-id';
import { AttributeScope } from '@shared/models/telemetry/telemetry.models';
import { switchMap, map, mergeMap, catchError } from 'rxjs/operators';
import { EntityInfo } from '@shared/models/entity.models';
import { from, Observable, of } from 'rxjs';
import { ThreedDeviceGroupSettings } from '@app/modules/home/components/widget/lib/settings/threed/threed-device-group-settings.component';

/*
export interface ThreedModelLoaderConfig {
  settings: ThreedModelSettings;
  aliasController: IAliasController;
  onLoadModel: (gltf: GLTF) => void;
}

export interface ThreedUrlModelLoaderConfig {
  entity: EntityInfo;
  entityAttribute: string;
}
*/

export interface ThreedUniversalModelLoaderConfig {
  entityLoader: ModelUrl | EntityAliasAttribute | EntityInfoAttribute;

  aliasController: IAliasController;
}

export interface ModelUrl {
  entity?: EntityInfo;
  url: string;
}

export interface EntityAliasAttribute {
  entityAlias: string;
  entityAttribute: string;
}

export interface EntityInfoAttribute {
  entity: EntityInfo;
  entityAttribute: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThreedModelLoaderService {

  constructor(
    private attributeService: AttributeService) {
  }

  private isModelUrl(obj: any): obj is ModelUrl {
    return 'url' in obj;
  }

  private isEntityAliasAttribute(obj: any): obj is EntityAliasAttribute {
    return 'entityAlias' in obj && 'entityAttribute' in obj;
  }

  private isEntityInfoAttribute(obj: any): obj is EntityInfoAttribute {
    return 'entity' in obj && 'entityAttribute' in obj;
  }

  public toEntityLoader(settings: ThreedModelSettings): ModelUrl | EntityAliasAttribute | undefined {
    if (settings.modelUrl)
      return { url: settings.modelUrl } as ModelUrl;
    else if (settings.modelEntityAlias && settings.modelUrlAttribute)
      return {
        entityAlias: settings.modelEntityAlias,
        entityAttribute: settings.modelUrlAttribute
      } as EntityAliasAttribute;

    return undefined;
  }

  public toEntityLoaders(settings: ThreedDeviceGroupSettings): EntityAliasAttribute | EntityInfoAttribute[] {
    if (!settings.threedEntityAliasSettings?.entityAlias)
      throw new Error("Entity alias not defined");

    if (settings.useAttribute && settings.threedEntityKeySettings?.entityAttribute)
      return {
        entityAlias: settings.threedEntityAliasSettings.entityAlias,
        entityAttribute: settings.threedEntityKeySettings.entityAttribute
      } as EntityAliasAttribute;
    else if (!settings.useAttribute && settings.threedObjectSettings) {
      let enitytInfoAttributes: EntityInfoAttribute[] = [];
      settings.threedObjectSettings.forEach(object => {
        enitytInfoAttributes.push({
          entity: object.entity,
          entityAttribute: object.modelUrl
        });
      });

      return enitytInfoAttributes;
    }

    return undefined;
  }

  public loadModelAsUrl(config: ThreedUniversalModelLoaderConfig): Observable<{ entityId: string | undefined, base64: string }> {
    if (this.isModelUrl(config.entityLoader)) {
      return of({ entityId: config.entityLoader.entity?.id, base64: config.entityLoader.url });
    } else if (this.isEntityAliasAttribute(config.entityLoader)) {
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
        /*
        switchMap((r: EntityInfo) => {
          //console.log(r);
          entityId = {
            entityType: r.entityType,
            id: r.id
          };
          return this.attributeService.getEntityAttributes(entityId, AttributeScope.SERVER_SCOPE, [entityAttribute]);
        }),
        map(attributes => {
          if (!attributes || attributes.length == 0)
            throw new Error("Invalid attribute");

          return { entityId: entityId.id || "", base64: attributes[0].value }
        })*/
      );
    } else if (this.isEntityInfoAttribute(config.entityLoader)) {
      const entityId: EntityId = {
        entityType: config.entityLoader.entity.entityType,
        id: config.entityLoader.entity.id
      };
      const entityAttribute = config.entityLoader.entityAttribute;

      return this.getObservableModelFromEntityIdAndAttribute(entityId, entityAttribute);
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

  public loadModelAsGLTF(config: ThreedUniversalModelLoaderConfig): Observable<{ entityId: string | undefined, model: GLTF }> {
    return this.loadModelAsUrl(config).pipe(
      mergeMap(({ entityId, base64 }) => {
        return from(fetch(base64).then(res => res.arrayBuffer()).then(buffer => {
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

  /*
  public loadModelAsUrl(config: ThreedUrlModelLoaderConfig): Observable<string> {
    if (!config.entityAttribute || config.entityAttribute.length == 0) return of("");

    const entityId: EntityId = {
      entityType: config.entity.entityType,
      id: config.entity.id
    };

    console.log(entityId, config);

    return this.attributeService.getEntityAttributes(entityId, AttributeScope.SERVER_SCOPE, [config.entityAttribute])
      .pipe(
        map(attributes => {
          console.log(attributes);

          if (!attributes || attributes.length == 0)
            throw new Error("Invalid attribute");

          return attributes[0].value;
        })
      )
  }

  public loadModelAsGLTF(config: ThreedModelLoaderConfig): Observable<GLTF> {
    this.currentConfig = config;

    const modelUrl = this.currentConfig.settings.modelUrl;
    const modelEntityAlias = this.currentConfig.settings.modelEntityAlias;
    const modelUrlAttribute = this.currentConfig.settings.modelUrlAttribute;
    if (!modelEntityAlias || !modelUrlAttribute) {
      return this.loadModelFromBase64(modelUrl);
    }
    const entityAliasId = this.currentConfig.aliasController.getEntityAliasId(modelEntityAlias);
    if (!entityAliasId) {
      return this.loadModelFromBase64(modelUrl);
    }

    const this_ = this;
    this.currentConfig.aliasController.resolveSingleEntityInfo(entityAliasId).pipe(
      switchMap((r: EntityInfo) => {
        //console.log(r);
        const entityId: EntityId = {
          entityType: r.entityType,
          id: r.id
        };
        return this.attributeService.getEntityAttributes(entityId, AttributeScope.SERVER_SCOPE, [modelUrlAttribute]);
      })
    ).subscribe(attributes => {
      if (!attributes || attributes.length == 0) throw new Error("Invalid attribute");

      const modelUrl = attributes[0].value;
      //console.log("modelUrlAttribute: ",);
      this_.loadModelFromUrl(modelUrl);
    });
  }

  private loadModelFromBase64(modelBase64: string) {
    console.log("Loading model from base64...");
    const this_ = this;
    fetch(modelBase64)
      .then(res => res.arrayBuffer())
      .then(buffer => {
        try {
          new GLTFLoader().parse(buffer, "/", gltf => this_.currentConfig.onLoadModel(gltf));
        } catch (error) {
          // TODO: change with defaultThreedModelSettings.modelUrl
          this_.loadModelFromUrl('assets/models/gltf/classroom.glb');
        }
      })
      .catch(e => {
        // TODO: change with defaultThreedModelSettings.modelUrl
        this_.loadModelFromUrl('assets/models/gltf/classroom.glb');
      });
  }

  private loadModelFromUrl(modelUrl: string) {
    console.log("Loading model from url " + modelUrl + "...");
    const this_ = this;
    try {
      new GLTFLoader()
        .load(modelUrl, gltf => this_.currentConfig.onLoadModel(gltf));
    } catch (error) {
      // TODO: change with defaultThreedModelSettings.modelUrl
      this_.loadModelFromUrl('assets/models/gltf/classroom.glb');
    }
  }
  */
}
