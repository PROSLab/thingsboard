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

import { AfterViewInit, ChangeDetectorRef, Component, forwardRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, } from '@angular/forms';
import { Subscription } from 'rxjs';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { FlowDirective } from '@flowjs/ngx-flow';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UtilsService } from '@core/services/utils.service';
import { DialogService } from '@core/services/dialog.service';
import { TranslateService } from '@ngx-translate/core';
import { FileSizePipe } from '@shared/pipe/file-size.pipe';

@Component({
  selector: 'tb-threed-model-input',
  templateUrl: './threed-model-input.component.html',
  styleUrls: ['./threed-model-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedModelInputComponent),
      multi: true
    }
  ]
})
export class ThreedModelInputComponent extends PageComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {

  @Input()
  label: string;

  @Input()
  maxSizeByte: number;

  private requiredValue: boolean;

  get required(): boolean {
    return this.requiredValue;
  }

  @Input()
  set required(value: boolean) {
    const newVal = coerceBooleanProperty(value);
    if (this.requiredValue !== newVal) {
      this.requiredValue = newVal;
    }
  }

  @Input()
  disabled: boolean = false;

  @Input()
  showClearButton = true;

  @Input()
  showPreview = true;

  @Input()
  inputId = this.utils.guid();

  name: string;
  imageUrl: string;
  safeImageUrl: SafeUrl;

  @ViewChild('flow', { static: true })
  flow: FlowDirective;

  autoUploadSubscription: Subscription;

  private propagateChange = null;

  constructor(protected store: Store<AppState>,
    private utils: UtilsService,
    private sanitizer: DomSanitizer,
    private dialog: DialogService,
    private translate: TranslateService,
    private fileSize: FileSizePipe,
    private cd: ChangeDetectorRef) {
    super(store);
  }

  ngAfterViewInit() {
    this.autoUploadSubscription = this.flow.events$.subscribe(event => {
      if (event.type === 'fileAdded') {
        const file = (event.event[0] as flowjs.FlowFile).file;
        this.name = file.name;
        if (this.maxSizeByte && this.maxSizeByte < file.size) {
          this.dialog.alert(
            this.translate.instant('dashboard.cannot-upload-file'),
            this.translate.instant('dashboard.maximum-upload-file-size', { size: this.fileSize.transform(this.maxSizeByte) })
          ).subscribe(
            () => { }
          );
          return false;
        }
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          if (typeof reader.result === 'string' && reader.result.startsWith('data:application/octet-stream')) {
            this.imageUrl = reader.result;

            this.safeImageUrl = this.imageUrl;//this.sanitizer.bypassSecurityTrustUrl(this.imageUrl);
            this.updateModel();
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  ngOnDestroy() {
    this.autoUploadSubscription.unsubscribe();
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  writeValue(value: string, name?: string): void {
    this.imageUrl = value;
    this.name = name;
    if (this.imageUrl) {
      this.safeImageUrl = this.imageUrl;//this.sanitizer.bypassSecurityTrustUrl(this.imageUrl);
    } else {
      this.safeImageUrl = null;
    }
  }

  public refreshModelVisualization() {
    this.safeImageUrl = null;
    this.cd.detectChanges();
    this.safeImageUrl = this.imageUrl;
    this.cd.detectChanges();
  }

  private updateModel() {
    this.cd.markForCheck();
    this.propagateChange(this.imageUrl);
  }

  clearImage() {
    this.name = null;
    this.imageUrl = null;
    this.safeImageUrl = null;
    this.updateModel();
  }
}