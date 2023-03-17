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
  Validator
} from '@angular/forms';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { TranslateService } from '@ngx-translate/core';
import { IAliasController } from '@core/api/widget-api.models';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap, publishReplay, refCount, startWith, tap } from 'rxjs/operators';
import { DataKey } from '@shared/models/widget.models';
import { DataKeyType } from '@shared/models/telemetry/telemetry.models';
import { EntityService } from '@core/http/entity.service';
import { ThreedModelSettings } from '@home/components/widget/threed-view-widget/threed-models';

@Component({
  selector: 'tb-threed-model-settings',
  templateUrl: './threed-model-settings.component.html',
  styleUrls: ['./../widget-settings.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ThreedModelSettingsComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ThreedModelSettingsComponent),
      multi: true
    }
  ]
})
export class ThreedModelSettingsComponent extends PageComponent implements OnInit, ControlValueAccessor, Validator {

  @ViewChild('entityAliasInput') entityAliasInput: ElementRef;

  @ViewChild('keyInput') keyInput: ElementRef;

  @Input()
  disabled: boolean;

  @Input()
  aliasController: IAliasController;

  private modelValue: ThreedModelSettings;

  private propagateChange = null;

  public threedModelSettingsFormGroup: FormGroup;

  filteredEntityAliases: Observable<Array<string>>;
  aliasSearchText = '';

  filteredKeys: Observable<Array<string>>;
  keySearchText = '';

  private latestKeySearchResult: Array<string> = null;
  private keysFetchObservable$: Observable<Array<string>> = null;

  private entityAliasList: Array<string> = [];

  constructor(protected store: Store<AppState>,
              private translate: TranslateService,
              private entityService: EntityService,
              private fb: FormBuilder) {
    super(store);
  }

  ngOnInit(): void {
    this.threedModelSettingsFormGroup = this.fb.group({
      modelUrl: [null, []],
      modelEntityAlias: [null, []],
      modelUrlAttribute: [null, []]
    });
    this.threedModelSettingsFormGroup.valueChanges.subscribe(() => {
      this.updateModel();
    });

    this.filteredEntityAliases = this.threedModelSettingsFormGroup.get('modelEntityAlias').valueChanges
      .pipe(
        tap((value) => {
          if (this.modelValue?.modelEntityAlias !== value) {
            this.latestKeySearchResult = null;
            this.keysFetchObservable$ = null;
            this.threedModelSettingsFormGroup.get('modelUrlAttribute').setValue(this.threedModelSettingsFormGroup.get('modelUrlAttribute').value);
          }
        }),
        map(value => value ? value : ''),
        mergeMap(name => this.fetchEntityAliases(name) )
      );

    this.filteredKeys = this.threedModelSettingsFormGroup.get('modelUrlAttribute').valueChanges
      .pipe(
        map(value => value ? value : ''),
        mergeMap(name => this.fetchKeys(name) )
      );

    if (this.aliasController) {
      const entityAliases = this.aliasController.getEntityAliases();
      for (const aliasId of Object.keys(entityAliases)) {
        this.entityAliasList.push(entityAliases[aliasId].alias);
      }
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.threedModelSettingsFormGroup.disable({emitEvent: false});
    } else {
      this.threedModelSettingsFormGroup.enable({emitEvent: false});
    }
  }

  writeValue(value: ThreedModelSettings): void {
    this.modelValue = value;
    this.threedModelSettingsFormGroup.patchValue(
      value, {emitEvent: false}
    );
  }

  public validate(c: FormControl) {
    return this.threedModelSettingsFormGroup.valid ? null : {
      threedModelSettings: {
        valid: false,
      },
    };
  }

  private updateModel() {
    const value: ThreedModelSettings = this.threedModelSettingsFormGroup.value;
    this.modelValue = value;
    this.propagateChange(this.modelValue);
  }

  clearEntityAlias() {
    this.threedModelSettingsFormGroup.get('modelEntityAlias').patchValue(null, {emitEvent: true});
    setTimeout(() => {
      this.entityAliasInput.nativeElement.blur();
      this.entityAliasInput.nativeElement.focus();
    }, 0);
  }

  onEntityAliasFocus() {
    this.threedModelSettingsFormGroup.get('modelEntityAlias').updateValueAndValidity({onlySelf: true, emitEvent: true});
  }

  clearKey() {
    this.threedModelSettingsFormGroup.get('modelUrlAttribute').patchValue(null, {emitEvent: true});
    setTimeout(() => {
      this.keyInput.nativeElement.blur();
      this.keyInput.nativeElement.focus();
    }, 0);
  }

  onKeyFocus() {
    this.threedModelSettingsFormGroup.get('modelUrlAttribute').updateValueAndValidity({onlySelf: true, emitEvent: true});
  }

  private fetchEntityAliases(searchText?: string): Observable<Array<string>> {
    this.aliasSearchText = searchText;
    let result = this.entityAliasList;
    if (searchText && searchText.length) {
      result = this.entityAliasList.filter((entityAlias) => entityAlias.toLowerCase().includes(searchText.toLowerCase()));
    }
    return of(result);
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
      const entityAlias: string = this.threedModelSettingsFormGroup.get('modelEntityAlias').value;
      if (entityAlias && this.aliasController) {
        entityAliasId = this.aliasController.getEntityAliasId(entityAlias);
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
          {ignoreLoading: true, ignoreErrors: true}
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