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

import { Component, Inject, Renderer2, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'tb-threed-dynamic-menu-dialog',
  templateUrl: './threed-dynamic-menu-dialog.component.html',
  styleUrls: ['./../widget-settings.scss']
})
export class ThreedDynamicMenuDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('container', { static: true }) container: ElementRef;

  constructor(
    private renderer: Renderer2,
    public dialogRef: MatDialogRef<ThreedDynamicMenuDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      html: string,
      css: string,
      js: { fnc: Function, args: any[] }
    }) { }

  ngOnInit() {
    this.addStyle(this.data?.css);
  }

  ngAfterViewInit(): void {
    this.container.nativeElement.innerHTML = this.data.html;
    this.data.js.fnc(...this.data.js.args);
    //this.addScript(this.data?.js);
  }

  addStyle(css?: string) {
    if (!css) return;

    const style = this.renderer.createElement('style');
    style.type = 'text/css';
    style.appendChild(this.renderer.createText(css));
    this.renderer.appendChild(document.head, style);
  }

  addScript(js?: string) {
    if (!js) return;

    const script = this.renderer.createElement('script');
    script.type = 'text/javascript';
    script.appendChild(this.renderer.createText(js));
    this.renderer.appendChild(document.head, script);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}