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

import { Component, ElementRef, forwardRef, Input, OnInit, ViewChild } from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  Validator,
  Validators
} from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import { IAliasController } from '@core/api/widget-api.models';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap, publishReplay, refCount, tap } from 'rxjs/operators';
import { DataKey } from '@shared/models/widget.models';
import { DataKeyType } from '@shared/models/telemetry/telemetry.models';
import { EntityService } from '@core/http/entity.service';

export interface ThreedEntityKeySettings {
  entityAttribute: string;
}

@Component({
  selector: 'tb-threed-entity-key-settings',
  templateUrl: './threed-entity-key-settings.component.html',
  styleUrls: ['./../../widget-settings.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedEntityKeySettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedEntityKeySettingsComponent),
      multi: true
    }
  ]
})
export class ThreedEntityKeySettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @ViewChild('keyInput') keyInput: ElementRef;

  @Input()
  disabled: boolean;

  @Input()
  aliasController: IAliasController;

  @Input()
  entityAlias?: string;

  @Input()
  entityAliasId?: string;

  private modelValue: ThreedEntityKeySettings;

  private propagateChange = null;

  public threedEntityKeySettingsFormGroup: FormGroup;

  filteredKeys: Observable<Array<string>>;
  keySearchText = '';

  private latestKeySearchResult: Array<string> = null;
  private keysFetchObservable$: Observable<Array<string>> = null;

  constructor(protected store: Store<AppState>,
    private translate: TranslateService,
    private entityService: EntityService,
    private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.threedEntityKeySettingsFormGroup = this.fb.group({
      entityAttribute: [null, [Validators.required]]
    });
    this.threedEntityKeySettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });

    this.filteredKeys = this.threedEntityKeySettingsFormGroup.get('entityAttribute').valueChanges
      .pipe(
        map(value => value ? value : ''),
        mergeMap(name => this.fetchKeys(name))
      );

  }

  public invalidateInput() {
    this.latestKeySearchResult = null;
    this.keysFetchObservable$ = null;
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedEntityKeySettingsFormGroup.disable({ emitEvent: false });
    } else {
      this.threedEntityKeySettingsFormGroup.enable({ emitEvent: false });
    }
  }

  writeValue(value: ThreedEntityKeySettings): void {
    this.modelValue = value;
    this.threedEntityKeySettingsFormGroup.patchValue(
      value, { emitEvent: false }
    );
  }

  public validate(c: FormControl) {
    return this.threedEntityKeySettingsFormGroup.valid ? null : {
      threedEntityKeySettings: {
        valid: false,
      },
    };
  }

  private updateModel() {
    const value: ThreedEntityKeySettings = this.threedEntityKeySettingsFormGroup.value;
    this.modelValue = value;
    this.propagateChange(this.modelValue);
  }

  public updateEntityAlias(entityAlias: string) {
    this.entityAlias = entityAlias;
    this.onKeyFocus();
  }

  public updateEntityAliasId(entityAliasId: string) {
    this.entityAliasId = entityAliasId;
    this.onKeyFocus();
  }

  clearKey() {
    this.threedEntityKeySettingsFormGroup.get('entityAttribute').patchValue(null, { emitEvent: true });
    setTimeout(() => {
      this.keyInput.nativeElement.blur();
      this.keyInput.nativeElement.focus();
    }, 0);
  }

  onKeyFocus() {
    this.threedEntityKeySettingsFormGroup.get('entityAttribute').updateValueAndValidity({ onlySelf: true, emitEvent: true });
  }

  private fetchKeys(searchText?: string): Observable<Array<string>> {
    if (this.keySearchText !== searchText || this.latestKeySearchResult === null) {
      this.keySearchText = searchText;
      const dataKeyFilter = this.createKeyFilter(this.keySearchText);
      return this.getKeys().pipe(
        map(name => name.filter(dataKeyFilter)),
        tap(res => this.latestKeySearchResult = res)
      );
    }
    return of(this.latestKeySearchResult);
  }

  private getKeys() {
    if (this.keysFetchObservable$ === null) {
      let fetchObservable: Observable<Array<DataKey>>;
      let entityAliasId: string;
      if (this.entityAliasId) {
        entityAliasId = this.entityAliasId;
      } else if (this.entityAlias && this.aliasController) {
        entityAliasId = this.aliasController.getEntityAliasId(this.entityAlias);
      }
      if (entityAliasId) {
        const dataKeyTypes = [DataKeyType.attribute];
        fetchObservable = this.fetchEntityKeys(entityAliasId, dataKeyTypes);
      } else {
        fetchObservable = of([]);
      }
      this.keysFetchObservable$ = fetchObservable.pipe(
        map((dataKeys) => dataKeys.map((dataKey) => dataKey.name)),
        publishReplay(1),
        refCount()
      );
    }
    return this.keysFetchObservable$;
  }

  private fetchEntityKeys(entityAliasId: string, dataKeyTypes: Array<DataKeyType>): Observable<Array<DataKey>> {
    return this.aliasController.getAliasInfo(entityAliasId).pipe(
      mergeMap((aliasInfo) => {
        return this.entityService.getEntityKeysByEntityFilter(
          aliasInfo.entityFilter,
          dataKeyTypes,
          { ignoreLoading: true, ignoreErrors: true }
        ).pipe(
          catchError(() => of([]))
        );
      }),
      catchError(() => of([] as Array<DataKey>))
    );
  }

  private createKeyFilter(query: string): (key: string) => boolean {
    const lowercaseQuery = query.toLowerCase();
    return key => key.toLowerCase().startsWith(lowercaseQuery);
  }
}