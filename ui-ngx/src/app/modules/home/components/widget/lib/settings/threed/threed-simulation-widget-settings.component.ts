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

import { OnInit, AfterContentChecked, AfterViewInit, ChangeDetectorRef, Component, HostListener, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AssetModel, ScriptModel, ThreedSimulationWidgetSettings, defaultThreedSimulationWidgetSettings } from '@app/modules/home/components/widget/threed-view-widget/threed/threed-models';
import { ThreedModelInputComponent } from '@app/shared/components/threed-model-input.component';
import { JsFuncComponent } from '@app/shared/public-api';
import { AppState } from '@core/core.state';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/models/widget.models';
import { ThreedScriptDialogComponent } from './threed-script-dialog.component';
import { SimulationHelperComponent } from '@app/shared/components/simulation-helper.component';
import { ImageInputComponent } from '@app/shared/components/image-input.component';


@Component({
  selector: 'tb-threed-simulation-widget-settings',
  templateUrl: './threed-simulation-widget-settings.component.html',
  styleUrls: ['./threed-simulation-widget-settings.component.scss', './../widget-settings.scss']
})
export class ThreedSimulationWidgetSettingsComponent extends WidgetSettingsComponent implements OnInit, AfterViewInit, AfterContentChecked {

  @ViewChild("modelInput") modelInput: ThreedModelInputComponent;
  @ViewChild("imageInput") imageInput: ImageInputComponent;
  @ViewChild("jsEditor1") jsEditor1: JsFuncComponent;
  @ViewChild("jsEditor2") jsEditor2: JsFuncComponent;
  @ViewChild('simulationHelper') simulationHelper: SimulationHelperComponent;


  threedSimulationWidgetSettingsForm: FormGroup;
  private isVisible: boolean = false;
  activeScript?: ScriptModel = undefined;
  private currentJsEditor?: JsFuncComponent;

  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    public dialog: MatDialog,
  ) {
    super(store);
  }

  ngOnInit() {
  }

  protected settingsForm(): FormGroup {
    return this.threedSimulationWidgetSettingsForm;
  }

  protected override defaultSettings(): WidgetSettings {
    return defaultThreedSimulationWidgetSettings;
  }

  protected onSettingsSet(settings: WidgetSettings) {
    const t_settings = settings as ThreedSimulationWidgetSettings;

    this.threedSimulationWidgetSettingsForm = this.fb.group({
      assets: [t_settings.assets, []],
      scripts: [t_settings.scripts, []],
      menuHtml: [t_settings.menuHtml, []],
      menuCss: [t_settings.menuCss, []],
      menuJs: [t_settings.menuJs, []],

      modelUrl: [t_settings.modelUrl, []],
      imageUrl: [t_settings.imageUrl, []],
      use3D: [t_settings.use3D, []],
      jsTextFunction: [t_settings.jsTextFunction, []],
      jsTextFunction2: [t_settings.jsTextFunction2, []],
    });

    const script = (this.threedSimulationWidgetSettingsForm.get("scripts") as FormArray).value[0];
    if (script) {
      this.selectScript(script);
      this.cd.detectChanges();
    }
    this.threedSimulationWidgetSettingsForm.valueChanges.subscribe(_ => this.updateModel());
    this.threedSimulationWidgetSettingsForm.get("use3D").valueChanges.subscribe(_ => {
      this.modelInput?.clearImage();
      this.imageInput?.clearImage();
    });
    this.simulationHelper?.updateSettings(this.threedSimulationWidgetSettingsForm.value);
  }

  ngAfterContentChecked(): void {
    const rendererContainer = this.simulationHelper.rendererContainer;
    if (this.isVisible == false && rendererContainer?.nativeElement.offsetParent != null) {
      this.isVisible = true;
      this.detectResize();
    }
    else if (this.isVisible == true && rendererContainer?.nativeElement.offsetParent == null) {
      this.isVisible = false;
    }
  }

  private updateModel() {
    this.activeScript.body = this.threedSimulationWidgetSettingsForm.get(this.activeScript.name == "onDataUpdate.js" ? 'jsTextFunction2' : 'jsTextFunction').value;
    this.simulationHelper?.updateSettings(this.threedSimulationWidgetSettingsForm.value);
  }

  addAsset() {
    const use3D = this.threedSimulationWidgetSettingsForm.get("use3D").value;
    let asset: string;
    let assetFileName: string;
    if (use3D) {
      asset = this.threedSimulationWidgetSettingsForm.get("modelUrl").value;
      assetFileName = this.modelInput.name;
    } else {
      asset = this.threedSimulationWidgetSettingsForm.get("imageUrl").value;
      assetFileName = this.imageInput.name;
    }

    if (!asset || !assetFileName) return;

    const assetNameWithoutExtension = assetFileName.match(/^([^.]+)/)[1];
    const assetsFormArray = this.threedSimulationWidgetSettingsForm.get("assets") as FormArray;
    const assets = assetsFormArray.value;
    if (!assets.find(m => m.name == assetNameWithoutExtension)) {
      const newAsset: AssetModel = { name: assetNameWithoutExtension, fileName: assetFileName, base64: asset, type: use3D ? '3D' : '2D' };
      assetsFormArray.value.push(newAsset);
    }

    if (use3D) this.modelInput?.clearImage();
    else this.imageInput?.clearImage();
  }

  deleteAsset() {
    const use3D = this.threedSimulationWidgetSettingsForm.get("use3D").value;

    const assetFileName = use3D ? this.modelInput.name : this.imageInput.name;
    if (!assetFileName) return;

    const assetsFormArray = this.threedSimulationWidgetSettingsForm.get("assets") as FormArray;
    const assets = assetsFormArray.value;
    const i = assets.findIndex(m => m.fileName == assetFileName);
    if (i != -1) {
      assetsFormArray.value.splice(i, 1);
    }

    if (use3D) this.modelInput?.clearImage();
    else this.imageInput?.clearImage();
  }

  visualiseAsset(asset: AssetModel) {
    const use3D = asset.type == '3D';
    this.threedSimulationWidgetSettingsForm.get("use3D").setValue(use3D);
    if (use3D) {
      this.modelInput?.clearImage();
      this.modelInput?.writeValue(asset.base64, asset.fileName);
    } else {
      this.imageInput?.clearImage();
      this.imageInput?.writeValue(asset.base64, asset.fileName);
    }

    this.cd.detectChanges();
  }

  selectScript(script: ScriptModel) {
    if (this.activeScript) {
      const scriptsFormArray = this.threedSimulationWidgetSettingsForm.get("scripts") as FormArray;
      const scripts = scriptsFormArray.value;
      const i = scripts.findIndex(o => o.name == this.activeScript.name);
      if (i != -1) {
        const jsBody = this.threedSimulationWidgetSettingsForm.get(this.activeScript.name == "onDataUpdate.js" ? 'jsTextFunction2' : 'jsTextFunction').value;
        scriptsFormArray.value[i].body = jsBody;
      }
    }
    this.activeScript = script;
    this.currentJsEditor = script.name == "onDataUpdate.js" ? this.jsEditor1 : this.jsEditor2;
    this.currentJsEditor?.writeValue(script.body);
    this.threedSimulationWidgetSettingsForm.get(script.name == "onDataUpdate.js" ? 'jsTextFunction2' : 'jsTextFunction').setValue(script.body);
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
          const newScript: ScriptModel = {
            name: fileName + ".js",
            body: "",
            deletable: true,
          };
          scriptsFormArray.value.push(newScript);
        }
      }

      this.cd.detectChanges();
    });
  }

  editScript() {
    if (!this.activeScript || !this.activeScript.deletable) return;

    const oldName = this.activeScript.name.replace(".js", "");
    this.addScript(oldName);
  }

  deleteScript() {
    if (!this.activeScript || !this.activeScript.deletable) return;

    const scriptsFormArray = this.threedSimulationWidgetSettingsForm.get("scripts") as FormArray;
    const scripts = scriptsFormArray.value;
    const i = scripts.findIndex(o => o.name == this.activeScript.name);
    if (i != -1) {
      scriptsFormArray.value.splice(i, 1);
      this.cd.detectChanges();
    }
  }

  @HostListener('window:resize')
  public detectResize(): void {
    this.simulationHelper.simulationScene?.resize();
    setTimeout(() => {
      this.simulationHelper.simulationScene?.resize();
    }, 1000);
  }
}