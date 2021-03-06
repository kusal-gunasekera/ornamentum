import { Component } from '@angular/core';

import { Observable, of } from 'rxjs';

import data from '../../../shared/data/sample-data';

@Component({
  selector: 'app-data-table-demo',
  templateUrl: './data-table-demo.component.html'
})
export class DataTableDemoComponent {

  public dataSource: Observable<any>;

  constructor() {
    this.dataSource = of(data);
  }
}
