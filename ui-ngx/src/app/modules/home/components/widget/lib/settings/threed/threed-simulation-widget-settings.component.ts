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

import { AfterContentChecked, AfterViewInit, ChangeDetectorRef, Component, Inject, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatTable } from '@angular/material/table';
import { ThreedModelInputComponent } from '@app/shared/components/threed-model-input.component';
import { JsFuncComponent } from '@app/shared/public-api';
import { AppState } from '@core/core.state';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/models/widget.models';
import { ThreedGenericSceneManager } from '../../../threed-view-widget/threed/threed-managers/threed-generic-scene-manager';
import { ThreedScenes } from '../../../threed-view-widget/threed/threed-scenes/threed-scenes';
import { Threed } from '../../../threed-view-widget/threed/threed';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ThreedScriptDialogComponent } from './threed-script-dialog.component';

interface EntityModelLink {
  entity: string;
  model: any;
}
interface ScriptModel {
  name: string,
  body: string
}

@Component({
  selector: 'tb-threed-simulation-widget-settings',
  templateUrl: './threed-simulation-widget-settings.component.html',
  styleUrls: ['./threed-simulation-widget-settings.component.scss', './../widget-settings.scss']
})
export class ThreedSimulationWidgetSettingsComponent extends WidgetSettingsComponent implements AfterViewInit, AfterContentChecked {

  @ViewChild("modelInput") modelInput: ThreedModelInputComponent;
  @ViewChild(MatTable) table: MatTable<EntityModelLink>;
  @ViewChild("jsEditor") jsEditor: JsFuncComponent;
  @ViewChild('rendererContainer') rendererContainer?: ElementRef;


  threedSimulationWidgetSettingsForm: FormGroup;
  simulationScene: ThreedGenericSceneManager;
  private isVisible: boolean = false;

  //models = [];
  displayedColumns: string[] = ['entity', 'model'];
  dataSource: EntityModelLink[] = [];
  //scripts: ScriptModel[] = [{ name: "main.js", body: "(async function() { await new Promise(resolve => setTimeout(resolve, 1000)); console.log('hello'); })();" }];
  activeScript?: ScriptModel = undefined;


  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    public dialog: MatDialog,
  ) {
    super(store);

    this.simulationScene = ThreedScenes.createSimulationScene();
  }

  protected settingsForm(): FormGroup {
    return this.threedSimulationWidgetSettingsForm;
  }

  protected override defaultSettings(): WidgetSettings {
    return {
      models: [],
      scripts: [{ name: "main.js", body: "(async function() { await new Promise(resolve => setTimeout(resolve, 1000)); console.log('hello'); })();" }],

      modelUrl: null,
      threedEntityAliasSettings: "",
      selectedModelForLink: "",
      jsTextFunction: "",
    };
  }

  protected onSettingsSet(settings: WidgetSettings) {
    // TODO: create SimulationSettings type
    const t_settings = settings as any;

    this.threedSimulationWidgetSettingsForm = this.fb.group({
      models: [t_settings.models, []],
      scripts: [t_settings.scripts, []],

      modelUrl: [t_settings.modelUrl, []],
      threedEntityAliasSettings: [t_settings.threedEntityAliasSettings, ""],
      selectedModelForLink: [t_settings.selectedModelForLink, ""],
      jsTextFunction: [t_settings.jsTextFunction, ""],
    });

    const script = (this.threedSimulationWidgetSettingsForm.get("models") as FormArray).value[0];
    if (script) {
      this.selectScript(script);
      this.cd.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    this.simulationScene.attachToElement(this.rendererContainer);
  }

  ngAfterContentChecked(): void {
    if (this.isVisible == false && this.rendererContainer?.nativeElement.offsetParent != null) {
      this.isVisible = true;
      this.detectResize();
    }
    else if (this.isVisible == true && this.rendererContainer?.nativeElement.offsetParent == null) {
      this.isVisible = false;
    }
  }


  addModel() {
    const model = this.threedSimulationWidgetSettingsForm.get("modelUrl").value;
    const modelName = this.modelInput.name;
    if (!model || !modelName) return;

    const modelsFormArray = this.threedSimulationWidgetSettingsForm.get("models") as FormArray;
    const models = modelsFormArray.value;
    if (!models.find(m => m.name == modelName)) {
      modelsFormArray.value.push({ name: modelName, base64: model });
    }

    this.modelInput.clearImage();
  }

  deleteModel() {
    const modelName = this.modelInput.name;
    if (!modelName) return;

    const modelsFormArray = this.threedSimulationWidgetSettingsForm.get("models") as FormArray;
    const models = modelsFormArray.value;
    const i = models.findIndex(m => m.name == modelName);
    if (i != -1) {
      modelsFormArray.value.splice(i, 1);
    }

    this.modelInput.clearImage();
  }

  visualiseModel(model: any) {
    this.modelInput.clearImage();
    this.modelInput?.writeValue(model.base64, model.name);
    this.cd.detectChanges();
  }

  addLink() {
    this.dataSource.push({
      entity: this.threedSimulationWidgetSettingsForm.get('threedEntityAliasSettings').value.entityAlias,
      model: this.threedSimulationWidgetSettingsForm.get('selectedModelForLink').value
    });
    this.table.renderRows();

    this.threedSimulationWidgetSettingsForm.get('selectedModelForLink').setValue("");
  }

  visualiseLink(row: EntityModelLink) {
    this.threedSimulationWidgetSettingsForm.get('threedEntityAliasSettings').setValue(row.entity);
    this.threedSimulationWidgetSettingsForm.get('selectedModelForLink').setValue(row.model);
  }

  deleteLink() {
    const entity = this.threedSimulationWidgetSettingsForm.get('threedEntityAliasSettings').value;
    const model = this.threedSimulationWidgetSettingsForm.get('selectedModelForLink').value;
    const i = this.dataSource.findIndex(o => o.entity == entity && o.model == model);
    if (i != -1) {
      this.dataSource.splice(i, 1);
      this.table.renderRows();
    }

    this.threedSimulationWidgetSettingsForm.get('threedEntityAliasSettings').setValue(undefined);
    this.threedSimulationWidgetSettingsForm.get('selectedModelForLink').setValue("");
  }

  selectScript(script: ScriptModel) {
    if (this.activeScript) {
      const scriptsFormArray = this.threedSimulationWidgetSettingsForm.get("scripts") as FormArray;
      const scripts = scriptsFormArray.value;
      const i = scripts.findIndex(o => o.name == this.activeScript.name);
      if (i != -1) {
        const jsBody = this.threedSimulationWidgetSettingsForm.get('jsTextFunction').value;
        scriptsFormArray.value[i].body = jsBody;
      }
    }
    this.activeScript = script;
    this.jsEditor?.writeValue(script.body);
    this.threedSimulationWidgetSettingsForm.get('jsTextFunction').setValue(script.body);
    this.jsEditor?.validateOnSubmit();
  }

  addScript(fileName?: string) {
    const oldName = fileName;
    const editing = oldName != undefined;

    const dialogRef = this.dialog.open(ThreedScriptDialogComponent, {
      width: '250px',
      data: { fileName: fileName ?? "" }
    });

    dialogRef.afterClosed().subscribe((result?: string) => {
      if (!result) return;

      const fileName = result.toLowerCase().trim();
      const nameRegex = /^[a-zA-Z\s]+$/;
      if (!nameRegex.test(fileName)) return;
      if (fileName.length == 0) return;

      const scriptsFormArray = this.threedSimulationWidgetSettingsForm.get("scripts") as FormArray;
      const scripts = scriptsFormArray.value;
      if (editing) {
        const i = scripts.findIndex(o => o.name == oldName + ".js");
        if (i != -1) {
          scriptsFormArray.value[i].name = fileName + ".js";
          this.activeScript = scripts[i];
        }
      } else {
        const i = scripts.findIndex(o => o.name == fileName + ".js");
        if (i == -1) {
          scriptsFormArray.value.push({
            name: fileName + ".js",
            body: "",
          });
        }
      }

      this.cd.detectChanges();
    });
  }

  editScript() {
    if (!this.activeScript || this.activeScript.name == "main.js") return;

    const oldName = this.activeScript.name.replace(".js", "");
    this.addScript(oldName);
  }

  deleteScript() {
    if (!this.activeScript || this.activeScript.name == "main.js") return;

    const scriptsFormArray = this.threedSimulationWidgetSettingsForm.get("scripts") as FormArray;
    const scripts = scriptsFormArray.value;
    const i = scripts.findIndex(o => o.name == this.activeScript.name);
    if (i != -1) {
      scriptsFormArray.value.splice(i, 1);
      this.cd.detectChanges();
    }
  }

  compile() {
    // TODO recompile scripts and restart simulation scene
    const jsBody = this.threedSimulationWidgetSettingsForm.get('jsTextFunction').value;
    const functionRef = new Function('simulationScene', 'Threed', jsBody);
    try {
      const result = functionRef(this.simulationScene, Threed);
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }

  @HostListener('window:resize')
  public detectResize(): void {
    this.simulationScene?.resize();
    setTimeout(() => {
      this.simulationScene?.resize();
    }, 1000);
  }
}