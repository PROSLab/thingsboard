import { Injectable } from '@angular/core';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ThreedModelSettings
} from '@home/components/widget/threed-view-widget/threed-models';
import { IAliasController } from '@core/api/widget-api.models';
import { AttributeService } from '@core/http/attribute.service';
import { EntityId } from '@shared/models/id/entity-id';
import { AttributeScope } from '@shared/models/telemetry/telemetry.models';
import { switchMap, map } from 'rxjs/operators';
import { EntityInfo } from '@shared/models/entity.models';
import { Observable, of } from 'rxjs';

export interface ThreedModelLoaderConfig {
  settings: ThreedModelSettings;
  aliasController: IAliasController;
  onLoadModel: (gltf: GLTF) => void;
}

export interface ThreedUrlModelLoaderConfig {
  entity: EntityInfo;
  entityAttribute: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThreedModelLoaderService {

  private currentConfig: ThreedModelLoaderConfig;

  constructor(
    private attributeService: AttributeService) {
  }

  public getUrlModel(config: ThreedUrlModelLoaderConfig): Observable<string> {
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

  public loadModel(config: ThreedModelLoaderConfig) {
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
}
