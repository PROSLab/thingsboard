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

import { WidgetContext } from "@app/modules/home/models/widget-component.models";
import { Datasource, WidgetActionDescriptor } from "@app/shared/public-api";
import { ACTIONS, A_TAG } from "./threed/threed-constants";

interface IAction {
    [name: string]: ($event: Event, datasource: Datasource) => void
}

export class ThreedWidgetActionManager {

    private readonly ctx: WidgetContext;
    private actions: Map<string, IAction> = new Map();

    constructor(ctx: WidgetContext) {
        this.ctx = ctx;
    }

    public createActions(name: string): void {
        const descriptors = this.ctx.actionsApi.getActionDescriptors(name);
        const actions = {};
        descriptors.forEach(descriptor => {
            actions[descriptor.name] = ($event: Event, datasource: Datasource) => this.onCustomAction(descriptor, $event, datasource);
        }, actions);

        console.log(actions);
        this.actions.set(name, actions);
    }

    public getActions(name: string): IAction | undefined {
        return this.actions.get(name);
    }

    private onCustomAction(descriptor: WidgetActionDescriptor, $event: Event, entityInfo: Datasource): void {
        if ($event) {
            $event.preventDefault();
            $event.stopPropagation();
        }
        const { entityId, entityName, entityLabel, entityType } = entityInfo;
        this.ctx.actionsApi.handleWidgetAction($event, descriptor, {
            entityType,
            id: entityId
        }, entityName, null, entityLabel);
    }

    public bindPopupActions(tooltip: HTMLElement, datasource: Datasource, name: string = ACTIONS.tooltip): void {
        const actions = tooltip.getElementsByClassName('tb-custom-action');
        const currentAction = this.getActions(name);
        if (!currentAction) return;
        Array.from(actions).forEach(
            (element: HTMLElement) => {
                const actionName = element.getAttribute('data-action-name');
                if (element && currentAction[actionName]) {
                    element.addEventListener('pointerdown', $event => {
                        currentAction[actionName]($event, datasource);
                    });
                }
            });
    }

    public bindMeshActions(group: THREE.Group, datasource: Datasource, name: string = ACTIONS.tooltip): void {
        const currentAction = this.getActions(name);
        if (!currentAction) return;

        group.traverse(o => {
            const aTag = o.userData[A_TAG]
            if(aTag){
                const actionName = aTag.getAttribute('data-action-name');
                if (currentAction[actionName]) {
                    aTag.addEventListener('pointerdown', $event => {
                        currentAction[actionName]($event, datasource);
                    });
                }
            }
        })
    }
} 