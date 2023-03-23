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

import { Component, forwardRef, Input, OnInit, ElementRef, ViewChild, AfterViewInit, HostListener, OnChanges, SimpleChanges, AfterContentChecked, Renderer2 } from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormGroup,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import {
  ThreedModelSettings,
  ThreedSceneSettings,
} from '@home/components/widget/threed-view-widget/threed-models';
import { MatDialog } from '@angular/material/dialog';
import { IAliasController } from '@app/core/public-api';
import { ThreedModelLoaderService, ThreedUniversalModelLoaderConfig } from '@core/services/threed-model-loader.service';
import { ThreedSceneEditor } from '../../../threed-view-widget/threed-scene-editor';

@Component({
  selector: 'tb-threed-scene-settings',
  templateUrl: './threed-scene-settings.component.html',
  styleUrls: ['./../widget-settings.scss', './threed-scene-settings.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedSceneSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedSceneSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedSceneSettingsComponent extends PageComponent implements OnInit, AfterViewInit, ControlValueAccessor, Validator, AfterContentChecked {

  @Input()
  disabled: boolean;

  @Input()
  threedModelSettingsFormGroup?: FormGroup;

  @Input()
  aliasController: IAliasController;

  @ViewChild('rendererContainer') rendererContainer?: ElementRef;

  private modelValue: ThreedSceneSettings;

  private propagateChange = null;

  public threedSceneSettingsFormGroup: FormGroup;

  private threedSceneEditor: ThreedSceneEditor;
  private isVisible: boolean = false;
  fullscreen: boolean = false;

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private threedModelLoader: ThreedModelLoaderService,
    private renderer2: Renderer2) {
    super(store);

    this.threedSceneEditor = new ThreedSceneEditor();
  }

  ngOnInit(): void {
    this.threedSceneSettingsFormGroup = this.fb.group({
      threedPositionVectorSettings: [null, []],
      threedRotationVectorSettings: [null, []],
      threedScaleVectorSettings: [null, []],
      threedDevicesSettings: [null, []],
    });

    /*
    this.threedSceneSettingsFormGroup.get('threedScaleVectorSettings').valueChanges.subscribe(() => {
      this.updateValidators(true);
    });*/

    this.threedSceneSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });

    this.threedSceneEditor.positionChanged.subscribe(v => this.threedSceneSettingsFormGroup.get("threedPositionVectorSettings").setValue(v));
    this.threedSceneEditor.rotationChanged.subscribe(v => this.threedSceneSettingsFormGroup.get("threedRotationVectorSettings").setValue(v));
    this.threedSceneEditor.scaleChanged.subscribe(v => this.threedSceneSettingsFormGroup.get("threedScaleVectorSettings").setValue(v));


    if (this.threedModelSettingsFormGroup) {
      let lastSettings: ThreedModelSettings = this.threedModelSettingsFormGroup.value;

      const config: ThreedUniversalModelLoaderConfig = {
        entityLoader: this.threedModelLoader.toEntityLoader(lastSettings),
        aliasController: this.aliasController
      }
      this.loadModel(config);

      this.threedModelSettingsFormGroup.valueChanges.subscribe((newSettings: ThreedModelSettings) => {
        if (lastSettings != newSettings) {
          lastSettings = newSettings;
          config.entityLoader = this.threedModelLoader.toEntityLoader(lastSettings);
          this.loadModel(config);
        }
      });
    }
  }

  private loadModel(config: ThreedUniversalModelLoaderConfig) {
    if (!config.entityLoader) return;

    this.threedModelLoader.loadModelAsGLTF(config).subscribe(res => {
      // TODO replaceModel(res);
      this.threedSceneEditor.replaceModel(res.model, res.entityId);
    });
  }

  ngAfterContentChecked(): void {
    if (this.isVisible == false && this.rendererContainer?.nativeElement.offsetParent != null) {
      console.log('isVisible switched from false to true (now is visible)');
      this.isVisible = true;
      this.detectResize();
    }
    else if (this.isVisible == true && this.rendererContainer?.nativeElement.offsetParent == null) {
      console.log('isVisible switched from true to false (now is not visible)');
      this.isVisible = false;
    }
  }

  ngAfterViewInit(): void {
    this.threedSceneEditor.attachToElement(this.rendererContainer);
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  validate(control: AbstractControl): ValidationErrors {
    return this.threedSceneSettingsFormGroup.valid ? null : {
      threedSceneSettings: {
        valid: false,
      },
    };
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedSceneSettingsFormGroup.disable({ emitEvent: false });
    } else {
      this.threedSceneSettingsFormGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedSceneSettings): void {
    this.modelValue = value;

    this.threedSceneEditor.updateValue(this.modelValue);
    this.threedSceneSettingsFormGroup.patchValue(
      this.modelValue, { emitEvent: false }
    );
    //this.updateValidators(false);
  }

  private updateModel() {
    const value = this.threedSceneSettingsFormGroup.value;
    this.modelValue = value;

    this.threedSceneEditor.updateValue(this.modelValue);

    this.propagateChange(this.modelValue);
  }

  /*
  private updateValidators(emitEvent?: boolean): void {

    //See .../settings/map/map-settings.component.ts

    //this.threedSceneSettingsFormGroup.get('threedScaleVectorSettings').updateValueAndValidity({emitEvent});
    //this.threedSceneSettingsFormGroup.get('threedPositionVectorSettings').updateValueAndValidity({emitEvent});
    //this.threedSceneSettingsFormGroup.get('threedRotationVectorSettings').updateValueAndValidity({emitEvent});
  }
  */

  public enterFullscreen() {
    this.rendererContainer.nativeElement.requestFullscreen();
    this.fullscreen = true;
  }

  public exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      this.onExitFullscreen();
    }
  }

  private onExitFullscreen() {
    this.renderer2.addClass(this.rendererContainer.nativeElement, "zero-size");
    this.threedSceneEditor?.resize();
    setTimeout(() => {
      this.renderer2.removeClass(this.rendererContainer.nativeElement, "zero-size");
      this.threedSceneEditor?.resize();
    }, 50);
    this.fullscreen = false;
  }

  public changeControlMode(mode: "translate" | "rotate" | "scale") {
    this.threedSceneEditor?.changeTransformControlMode(mode);
  }

  @HostListener('window:resize')
  public detectResize(): void {
    this.threedSceneEditor?.resize();
    setTimeout(() => {
      this.threedSceneEditor?.resize();
    }, 1000);
  }

  @HostListener('document:fullscreenchange', ['$event'])
  @HostListener('document:webkitfullscreenchange', ['$event'])
  @HostListener('document:mozfullscreenchange', ['$event'])
  @HostListener('document:MSFullscreenChange', ['$event'])
  onFullscreenChange(event: any) {
    if (!document.fullscreenElement) {
      // Leaving fullscreen mode
      this.onExitFullscreen();
    }
  }

  @HostListener('window:keydown', ['$event'])
  public keydown(event: KeyboardEvent): void {
    this.threedSceneEditor?.onKeyDown(event);
  }

  @HostListener('window:keyup', ['$event'])
  public keyup(event: KeyboardEvent): void {
    this.threedSceneEditor?.onKeyUp(event);
  }
}