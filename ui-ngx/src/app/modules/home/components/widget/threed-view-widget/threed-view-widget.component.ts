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

import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { PageComponent } from '@shared/components/page.component';
import { WidgetContext } from '@home/models/widget-component.models';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { ThreedModelLoaderConfig, ThreedModelLoaderService } from '@core/services/threed-model-loader.service';
import { ThreedViewWidgetSettings } from './threed-models';
import { ThreedFpsScene } from './threed-fps-scene';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import {
  deepClone,
  formattedDataArrayFromDatasourceData,
  formattedDataFormDatasourceData,
  isDefinedAndNotNull,
  isNotEmptyStr,
  isString,
  mergeFormattedData,
  processDataPattern,
  fillDataPattern,
  safeExecute
} from '@core/utils';
import { FormattedData, ReplaceInfo } from '@shared/models/widget.models';
import {
  functionValueCalculator,
  parseWithTranslation
} from '@home/components/widget/lib/maps/common-maps-utils';



/*
Widget Type: Ultimi Valori
Widget settings: 
  1) tb-simple-card-widget-settings (from Simple Card)
  2) tb-map-widget-settings (from Image Map)

Per navigare tra le dashboard (ex click su un sensore) mettere a disposizione un Azione click (vedi Image Map -> Azioni) 
Per modificare la posizione , scala... vedi Markers Placement - Image Map (anche se forse è meglio aggiungere qualcosa sui settings anzichè utilizzare un altro widget)

UNA VOLTA CREATO IL WIDGET-CODE:
Per aggiungere in automatico il widget quando si installa thingsboard, aggiungere un file json con le varie properties alla posizione (path assoluto): 'thingsboard-3.4.4\application\src\main\data\json\system\widget_bundles'
Altrimenti, se si aggiunge il widget a mano (tramite librertia widget/amministratore) è necessario premere su modifica (edit / icon penna) ed aggiornare i vari settings (in avanzate).

*/
@Component({
  selector: 'tb-threed-view-widget',
  templateUrl: './threed-view-widget.component.html',
  styleUrls: ['./threed-view-widget.component.scss']
})
export class ThreedViewWidgetComponent extends PageComponent implements OnInit, AfterViewInit {

  settings: ThreedViewWidgetSettings;

  @Input()
  ctx: WidgetContext;

  @ViewChild('rendererContainer') rendererContainer?: ElementRef;

  public pointerLocked: boolean = false;

  private threedFpsScene: ThreedFpsScene;

  constructor(
    protected store: Store<AppState>,
    protected cd: ChangeDetectorRef,
    private threedModelLoader: ThreedModelLoaderService,
  ) {
    super(store);

    this.threedFpsScene = new ThreedFpsScene();
  }

  ngOnInit(): void {
    this.ctx.$scope.threedViewWidget = this;
    this.settings = this.ctx.settings;

    this.threedFpsScene.updateValue(this.settings.threedSceneSettings);
    this.threedFpsScene.onPointerLockedChanged.subscribe(v => {
      this.pointerLocked = v;
      this.cd.detectChanges();
    });
    this.loadModel();
  }

  private loadModel() {
    let config: ThreedModelLoaderConfig = {
      aliasController: this.ctx.aliasController,
      settings: this.settings.threedModelSettings,
      onLoadModel: (gltf: GLTF) => this.threedFpsScene.replaceModel(gltf)
    }
    this.threedModelLoader.loadModel(config);
  }

  ngAfterViewInit() {
    this.threedFpsScene.attachToElement(this.rendererContainer);
  }

  lockCursor() {
    this.threedFpsScene.lockControls();
  }

  public onDataUpdated() {
    console.log("\n\n\nonDataUpdated - datasources", this.ctx.datasources);
    if (this.ctx.datasources.length > 0) {
      var tbDatasource = this.ctx.datasources[0];
      // TODO...
    }

    const data = this.ctx.data;
    let formattedData = formattedDataFormDatasourceData(data);
    console.log("formattedData", formattedData);
    if (this.ctx.latestData && this.ctx.latestData.length) {
      const formattedLatestData = formattedDataFormDatasourceData(this.ctx.latestData);
      formattedData = mergeFormattedData(formattedData, formattedLatestData);
      console.log("formattedData first if", formattedData);

    }

    //const pattern = this.settings.tooltipPattern;
    const pattern = "<b>${entityName}</b><br/><br/><b>X Pos:</b> ${xPos:2}<br/><b>Y Pos:</b> ${yPos:2}<br/><b>Temperature:</b> ${temperature} °C<br/><small>See advanced settings for details</small>";
    formattedData.forEach(fd => {
      //const markerTooltipText = parseWithTranslation.prepareProcessPattern(pattern, false);
      //console.log(markerTooltipText);
      const replaceInfoTooltipMarker = processDataPattern(pattern, fd);
      console.log(replaceInfoTooltipMarker);
      const content = fillDataPattern(pattern, replaceInfoTooltipMarker, fd)
      console.log(content);
      this.threedFpsScene.updateLabelContent(content);
    });

    //this.updateMarkers(formattedData, false, markerClickCallback);
  }

  /*
  updateMarkers(markersData: FormattedData[], updateBounds = true, callback?) {
    const rawMarkers = markersData.filter(mdata => !!this.extractPosition(mdata));

    rawMarkers.forEach(data => {
      const currentImage: MarkerImageInfo = safeExecute(this.settings.parsedMarkerImageFunction,
        [data, this.settings.markerImages, markersData, data.dsIndex]);
    });
  }*/

  public onResize(width: number, height: number): void {
    this.threedFpsScene?.resize(width, height);
  }

  @HostListener('window:keyup', ['$event'])
  keyUpEvent(event: KeyboardEvent) {
    this.threedFpsScene?.onKeyUp(event);
  }

  @HostListener('window:keydown', ['$event'])
  keyDownEvent(event: KeyboardEvent) {
    this.threedFpsScene?.onKeyDown(event);
  }
}