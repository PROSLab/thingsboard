import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    ThreedModelSettings
} from '@home/components/widget/threed-view-widget/threed-models';
import { DataSet, DatasourceType, widgetType } from '@shared/models/widget.models';
import { WidgetSubscriptionApi, WidgetSubscriptionOptions } from '@core/api/widget-api.models';
import { isNotEmptyStr } from '@core/utils';
import { EntityDataPageLink } from '@shared/models/query/query.models';
import { Observable, ReplaySubject } from 'rxjs';
import { IAliasController } from '@core/api/widget-api.models';
import { AttributeService } from '@core/http/attribute.service';
import { EntityId } from '@shared/models/id/entity-id';
import { AttributeScope, DataKeyType, LatestTelemetry } from '@shared/models/telemetry/telemetry.models';
import { switchMap } from 'rxjs/operators';
import { EntityInfo } from '@shared/models/entity.models';

export class ThreedModelLoader {

    private aliasController: IAliasController;
    private attributeService: AttributeService;
    //private subscriptionApi: WidgetSubscriptionApi;
    private onLoadModel: (gltf: GLTF) => void;

    constructor(
        aliasController: IAliasController, 
        attributeService: AttributeService,
        //subscriptionApi: WidgetSubscriptionApi, 
        onLoadModel: (gltf: GLTF) => void) {
        this.aliasController = aliasController;
        //this.subscriptionApi = subscriptionApi;
        this.onLoadModel = onLoadModel;
    }

    /*
    public loadModel(settings: ThreedModelSettings) {
        const modelUrl = settings.modelUrl;
        const modelEntityAlias = settings.modelEntityAlias;
        const modelUrlAttribute = settings.modelUrlAttribute;
        if (!modelEntityAlias || !modelUrlAttribute) {
            return this.loadModelFromBase64(modelUrl);
        }
        const entityAliasId = this.aliasController.getEntityAliasId(modelEntityAlias);
        if (!entityAliasId) {
            return this.loadModelFromBase64(modelUrl);
        }

        // Retrive the modelUrl from the entity Alias & Attribute
        const datasources = [
            {
                type: DatasourceType.entity,
                name: modelEntityAlias,
                aliasName: modelEntityAlias,
                entityAliasId,
                dataKeys: [
                    {
                        type: DataKeyType.attribute,
                        name: modelUrlAttribute,
                        label: modelUrlAttribute,
                        settings: {},
                        _hash: Math.random()
                    }
                ]
            }
        ];
        const result = new ReplaySubject<[DataSet, boolean]>();
        let isUpdate = false;
        const imageUrlSubscriptionOptions: WidgetSubscriptionOptions = {
            datasources,
            hasDataPageLink: true,
            singleEntity: true,
            useDashboardTimewindow: false,
            type: widgetType.latest,
            callbacks: {
                onDataUpdated: (subscription) => {
                    if (isNotEmptyStr(subscription.data[0]?.data[0]?.[1])) {
                        result.next([subscription.data[0].data, isUpdate]);
                    } else {
                        result.next([[[0, modelUrl]], isUpdate]);
                    }
                    isUpdate = true;
                }
            }
        };
        this.subscriptionApi.createSubscription(imageUrlSubscriptionOptions, true).subscribe((subscription) => {
            const pageLink: EntityDataPageLink = {
                page: 0,
                pageSize: 1,
                textSearch: null,
                dynamic: true
            };
            subscription.subscribeAllForPaginatedData(pageLink, null);
        });
        this.loadModelFromAlias(result);
    }*/

    public loadModel(settings: ThreedModelSettings) {
        const modelUrl = settings.modelUrl;
        const modelEntityAlias = settings.modelEntityAlias;
        const modelUrlAttribute = settings.modelUrlAttribute;
        if (!modelEntityAlias || !modelUrlAttribute) {
            return this.loadModelFromBase64(modelUrl);
        }
        const entityAliasId = this.aliasController.getEntityAliasId(modelEntityAlias);
        if (!entityAliasId) {
            return this.loadModelFromBase64(modelUrl);
        }

        const this_ = this;
        this.aliasController.resolveSingleEntityInfo(entityAliasId).pipe(
            switchMap((r: EntityInfo) => {
                console.log(r);
                const entityId: EntityId = {
                    entityType: r.entityType,
                    id: r.id
                };
                return this.attributeService.getEntityAttributes(entityId, AttributeScope.SERVER_SCOPE, [modelUrlAttribute]);
            })
        ).subscribe(attributes => {
            if (!attributes || attributes.length == 0) throw new Error("Invalid attribute");

            const modelUrl = attributes[0].value;
            console.log("modelUrlAttribute: ",);
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
                    new GLTFLoader().parse(buffer, "/", gltf => this_.onLoadModel(gltf));
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
                .load(modelUrl, gltf => this_.onLoadModel(gltf));
        } catch (error) {
            // TODO: change with defaultThreedModelSettings.modelUrl
            this_.loadModelFromUrl('assets/models/gltf/classroom.glb');
        }
    }

    /*
    private loadModelFromAlias(alias: Observable<[DataSet, boolean]>) {
        const this_ = this;
        alias.subscribe(res => {
            const modelUrl = res[0][0][1];
            this_.loadModelFromUrl(modelUrl);
        });
    }
    */
}