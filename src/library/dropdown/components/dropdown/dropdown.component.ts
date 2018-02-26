import {
  Component,
  EventEmitter,
  forwardRef,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';

import get from 'lodash.get';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { DropdownMenuPosition } from '../../models/dropdown-menu-position.enum';
import { DropdownTranslations } from '../../models/dropdown-translations.model';
import { DropdownItem } from '../../models/dropdown-item.model';
import { DropdownItemGroup } from '../../models/dropdown-Item-group.model';
import { DropdownRequestParams } from '../../models/dropdown-request-params.model';
import { DropdownDataBindCallback } from '../../models/dropdown-data-bind-callback.model';
import { DropdownQueryResult } from '../../models/dropdown-query-result.model';

import { PopoverComponentLoaderFactoryService, ComponentLoader } from '../../../utility';
import { DropdownConfigService } from '../../services/dropdown-config.service';
import { DropdownDataStateService } from '../../services/dropdown-data-state.service';
import { DropdownEventStateService } from '../../services/dropdown-event-state.service';
import { DropdownResourceService } from '../../services/dropdown-resource.service';

import { DropdownViewComponent } from '../dropdown-view/dropdown-view.component';

/**
 * Component class to represent search dropdown.
 * @implements OnInit, OnDestroy, ControlValueAccessor
 * @class SearchDropdownComponent
 */
@Component({
  selector: 'ng-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  providers: [
    DropdownConfigService,
    DropdownDataStateService,
    DropdownEventStateService,
    DropdownResourceService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownComponent),
      multi: true
    }
  ]
})
export class DropdownComponent implements OnInit, OnDestroy, ControlValueAccessor {
  private componentLoader: ComponentLoader<DropdownViewComponent>;

  private dataFilterStream = new Subject();
  private dataFilterSubscription: Subscription;

  private onSelectChangeSubscription: Subscription;

  // Outputs : Event Handlers
  /**
   * On dropdown initialize.
   * @type {EventEmitter<DropdownComponent>}
   */
  @Output()
  public init: EventEmitter<DropdownComponent>;

  /**
   * On select change handler.
   * @type {EventEmitter<DropdownItem[] | DropdownItem>}
   */
  @Output()
  public selectChange: EventEmitter<any[] | any>;


  @Output()
  public dataBound: EventEmitter<void>;

  @Output()
  public allOptionSelectChange: EventEmitter<boolean>;

  // Input - Event handlers

  public set onDataBind(value: DropdownDataBindCallback) {
    this.dataStateService.onDataBind = value;
  }

  // Inputs

  @Input()
  public set dataSource(source: Observable<any[]>) {
    this.initDataSource(source);
  }

  /**
   * Search dropdown display text key translations.
   * @type {DropdownTranslations}
   */
  @Input()
  public set translations(value: DropdownTranslations) {
    this.config.translations = value;
  }

  @Input()
  public relativeParentElement: HTMLElement;

  /**
   * Represents the name of the attribute used for selection tracking.
   * @type {string}
   */
  @Input()
  public set selectTrackBy(value: string) {
    this.config.selectTrackBy = value;
  }

  /**
   * Represents the name of the attribute used to show the selected item's display text.
   * @type {string}
   */
  @Input()
  public set displayTrackBy(value: string) {
    this.config.displayTrackBy = value;
  }

  /**
   * Represent field name to group data by.
   * Group data only if provided.
   * @type {string}
   */
  @Input()
  public set groupByField(value: string) {
    this.config.groupByField = value;
  }

  /**
   * Represents the name of the attribute used to disable the selection of dropdown item.
   * @type {string}
   */
  @Input()
  public set disabledTrackBy(value: string) {
    this.config.disabledTrackBy = value;
  }

  /**
   * Set previously selected dropdown items.
   * @param {any[]} value The selected dropdown item list.
   */
  @Input()
  public set selectedOptions(value: any[]) {
    this.dataStateService.selectedOptions = value || [];
    this.eventStateService.selectChangeStream.emit(value);
  }

  /**
   * Set previously selected dropdown item.
   * @param {any} value The selected dropdown item.
   */
  @Input()
  public set selectedOption(value: any) {
    this.dataStateService.selectedOption = value;
    this.eventStateService.selectChangeStream.emit(value);
  }

  /**
   * Represents the limit of the items that can be shown in the dropdown at a single time.
   * @type {number}
   */
  @Input()
  public set limit(value: number) {
    this.config.limit = value;
  }

  /**
   * Number of items to display when selected.
   * Used to limit itm count shown when more items are selected.
   * @type {number}
   */
  @Input()
  public set wrapDisplaySelectLimit(value: number) {
    this.config.wrapDisplaySelectLimit = value;
  }

  /**
   * Enable/Disable dropdown data loading on scrolling.
   * @type {boolean}
   */
  @Input()
  public set loadOnScroll(value: boolean) {
    this.config.loadOnScroll = value;
  }

  /**
   * Sets the point which needs to trigger additional data loading functionality when scrolling.
   * @type {number}
   */
  @Input()
  public set loadViewDistance(value: number) {
    this.config.loadViewDistance = value;
  }

  /**
   * Filter option for dropdown search.
   * @type {string}
   */
  @Input()
  public set filterText(value: string) {
    this.dataStateService.filterText = value;
  }

  /**
   * Enable/Disable dropdown items multi select option.
   * @type {boolean}
   */
  @Input()
  public set multiSelectable(value: boolean) {
    this.config.multiSelectable = value;
  }

  /**
   * Enable/Disable dropdown items filtering.
   * @type {boolean}
   */
  @Input()
  public set filterable(value: boolean) {
    this.config.filterable = value;
  }

  /**
   * Enable/Disable show select all option.
   * @type {boolean}
   */
  @Input()
  public set showSelectAll(value: boolean) {
    this.config.showSelectAll = value;
  }

  /**
   * Enable/Disable load data in the on initStream event.
   * @type {boolean}
   */
  @Input()
  public set loadDataOnInit(value: boolean) {
    this.config.loadDataOnInit = value;
  }

  /**
   * Enable/Disable show selected items remove icon.
   * @type {boolean}
   */
  @Input()
  public set showSelectedOptionRemoveButton(value: boolean) {
    this.config.showSelectedOptionRemoveButton = value;
  }

  /**
   * Show all select options clear button if true.
   */
  @Input()
  public set showClearSelectionButton(value: boolean) {
    this.config.showClearSelectionButton = value;
  }

  /**
   * Dropdown menu width.
   * @type {number}
   */
  @Input()
  public set menuWidth(value: number) {
    this.config.menuWidth = value;
  }

  /**
   * Dropdown menu height.
   * @type {number}
   */
  @Input()
  public set menuHeight(value: number) {
    this.config.menuHeight = value;
  }

  /**
   * Menu open position.
   * @type {DropdownMenuPosition}
   */
  @Input()
  public set menuPosition(value: DropdownMenuPosition) {
    this.config.menuPosition = value;
  }

  /**
   * Filter de-bounce enabled state.
   * @default false
   * @type {boolean}
   */
  @Input()
  public set filterDebounce(value: boolean) {
    this.config.filterDebounce = value;
  }


  /**
   * Filter de-bounce time milliseconds.
   * @default 500
   * @type {number}
   */
  @Input()
  public set filterDebounceTime(value: number) {
    this.config.filterDebounceTime = value;
  }

  @Input()
  public set closeMenuOnSelect(value: boolean) {
    this.config.closeMenuOnSelect = value;
  }

  @Input()
  public set showOptionSelectCheckbox(value: boolean) {
    this.config.showOptionSelectCheckbox = value;
  }

  @Input()
  public set triggerSelectChangeOncePerSelectAll(value: boolean) {
    this.config.triggerSelectChangeOncePerSelectAll = value;
  }

  @Input()
  public set triggerSelectChangeOnInit(value: boolean) {
    this.config.triggerSelectChangeOnInit = value;
  }

  constructor(private componentLoaderFactory: PopoverComponentLoaderFactoryService,
              private injector: Injector,
              private eventStateService: DropdownEventStateService,
              private dropdownResourceService: DropdownResourceService<any>,
              public dataStateService: DropdownDataStateService,
              public config: DropdownConfigService) {
    this.componentLoader = this.componentLoaderFactory.createLoader();

    this.dataBound = this.eventStateService.dataBoundStream;
    this.selectChange = this.eventStateService.selectChangeStream;
    this.init = this.eventStateService.initStream;
    this.allOptionSelectChange = this.eventStateService.allOptionSelectChangeStream;
  }

  public getDisplayText(item: any): string {
    return get(item, this.config.displayTrackBy);
  }

  private initDataSource(source: Observable<any>): void {
    this.dropdownResourceService.setDataSource(source);

    this.dataStateService.onDataBind = (params: DropdownRequestParams): Observable<DropdownQueryResult<any>> => {
      if (params.hardReload) {
        this.dropdownResourceService.setDataSource(source);
      }

      return this.dropdownResourceService.query(params);
    };
  }

  public positionRight(): number {
    return this.config.menuPosition === DropdownMenuPosition.BOTTOM_RIGHT || this.config.menuPosition === DropdownMenuPosition.TOP_RIGHT ? 0 : undefined;
  }

  public positionBottom(): number {
    return this.config.menuPosition === DropdownMenuPosition.TOP_RIGHT || this.config.menuPosition === DropdownMenuPosition.TOP_LEFT ? 0 : undefined;
  }

  /**
   * Performs dropdown toggle event.
   * @param {HTMLElement} element Dropdown button element.
   */
  public toggleDropdown(element: HTMLElement): void {
    const floatLeft = this.config.menuPosition === DropdownMenuPosition.BOTTOM_RIGHT || this.config.menuPosition === DropdownMenuPosition.TOP_RIGHT
      ? element.offsetWidth : 0;
    const floatTop = this.config.menuPosition === DropdownMenuPosition.BOTTOM_RIGHT || this.config.menuPosition === DropdownMenuPosition.BOTTOM_LEFT
      ? element.offsetHeight : 0;

    this.componentLoader
      .withFloatLeft(floatLeft)
      .withFloatTop(floatTop)
      .withRelativeParentElement(this.relativeParentElement)
      .withContext({
        props: {
          dropdown: this,
        }
      })
      .toggle(DropdownViewComponent, element, this.injector);
  }

  /**
   * Triggers drop down close event.
   */
  public closeDropdown(): void {
    this.componentLoader.hide();
  }

  /**
   * Performs data loading when scrolling by checking the scroll position.
   * This will trigger only when loadOnScroll is true.
   * @param event
   */
  public checkScrollPosition(event: any) {
    const scrollTop = event.target.scrollTop;
    const scrollHeight = event.target.scrollHeight;
    const scrollElementHeight = event.target.clientHeight;

    const roundingPixel = 1;
    const gutterPixel = 1;

    if (scrollTop >= scrollHeight - (1 + this.config.loadViewDistance) * scrollElementHeight - roundingPixel - gutterPixel
      && this.dataStateService.currentItemCount < this.dataStateService.totalOptionCount) { // todo: validate item count with current
      this.dataStateService.offset = this.dataStateService.offset + this.config.limit;
      this.eventStateService.dataFetchStream.emit(false);
    }
  }

  public onSelectOptionRemove(event: Event, option: DropdownItem): void {
    event.stopPropagation();
    option.selected = false;
    this.optionSelectChange(option);
  }

  public get showAllSelectedOptionLabels(): boolean {
    if (this.config.wrapDisplaySelectLimit !== undefined) {
      return this.dataStateService.selectedOptions.length > this.config.wrapDisplaySelectLimit;
    }

    return false;
  }

  /**
   * Get selected items message.
   * @return {string} Selected items message.
   */
  public get selectedItemsMessage(): string {
    return `(${this.dataStateService.selectedOptions.length}) ${this.config.translations.selectedItemWrapPlaceholder}`;
  }

  /**
   * ngOnDestroy handler.
   * Lifecycle hook that is called when component is destroyed.
   */
  public ngOnDestroy(): void {
    if (this.dataFilterSubscription) {
      this.dataFilterSubscription.unsubscribe();
    }

    if (this.onSelectChangeSubscription) {
      this.onSelectChangeSubscription.unsubscribe();
    }

    this.componentLoader.dispose();
  }

  public get hasSelectedItems(): boolean {
    return this.config.multiSelectable ? !!this.dataStateService.selectedOptions.length : !!this.dataStateService.selectedOption;
  }

  /**
   * Clear selected items.
   */
  public clearSelectedOptions(): void {
    this.allOptionsSelectedStateChange(false);
  }

  public toggleAllOptionSelectedState(): void {
    this.dataStateService.allOptionsSelected = !this.dataStateService.allOptionsSelected;
    this.allOptionsSelectedStateChange(this.dataStateService.allOptionsSelected);
  }

  public get allOptionsSelected(): boolean {
    return this.dataStateService.allOptionsSelected;
  }

  private allOptionsSelectedStateChange(selectedState: boolean): void {
    if (this.config.groupByField) {
      this.dataStateService.dropdownItemGroups.forEach(group => {
        group.items.forEach(item => {
          item.selected = selectedState;
          this.optionSelectChange(item, this.config.triggerSelectChangeOncePerSelectAll, false);
        });
      });
    } else {
      this.dataStateService.dropdownItems.forEach(item => {
        item.selected = selectedState;
        this.optionSelectChange(item, this.config.triggerSelectChangeOncePerSelectAll, false);
      });
    }

    if (this.config.triggerSelectChangeOncePerSelectAll) {
      this.eventStateService.selectChangeStream.emit(this.dataStateService.selectedOptions);
    }

    this.eventStateService.allOptionSelectChangeStream.emit(selectedState);
  }

  public toggleOptionSelectedState(option: DropdownItem): void {
    option.selected = !option.selected;
    this.optionSelectChange(option);
  }

  public optionSelectChange(option: DropdownItem, triggerSelectChange: boolean = true, triggerSelectAllStateUpdate: boolean = true): void {
    const id = get(option.item, this.config.selectTrackBy);
    if (this.config.multiSelectable) {
      const selectedIndex = this.dataStateService.selectedOptions.findIndex((item: any) => {
        return get(item, this.config.selectTrackBy) === id;
      });

      if (option.selected && selectedIndex < 0) {
        this.dataStateService.selectedOptions.push(option.item);
      } else if (!option.selected && selectedIndex > -1) {
        this.dataStateService.selectedOptions.splice(selectedIndex, 1);
      }

      if (triggerSelectChange) {
        this.eventStateService.selectChangeStream.emit(this.dataStateService.selectedOptions);
      }

      if (triggerSelectAllStateUpdate) {
        this.setAllOptionsSelectedState();
      }
    } else {
      if (option.selected) {
        this.dataStateService.selectedOption = option.item;
      } else {
        this.dataStateService.selectedOption = undefined;
      }

      // deselect all options except current.
      if (this.config.groupByField) {
        this.dataStateService.dropdownItemGroups.forEach(group => {
          group.items.forEach(item => {
            if (item !== option) {
              item.selected = false;
            }
          });
        });
      } else {
        this.dataStateService.dropdownItems.forEach(item => {
          if (item !== option) {
            item.selected = false;
          }
        });
      }

      if (triggerSelectChange) {
        this.eventStateService.selectChangeStream.emit(this.dataStateService.selectedOption);
      }
    }

    if (this.config.closeMenuOnSelect && option.selected) {
      this.closeDropdown();
    }
  }

  /**
   * Set disabled state.
   * ControlValueAccessor implementation.
   * @param {boolean} isDisabled True if disabled.
   */
  public setDisabledState?(isDisabled: boolean): void {
    this.dataStateService.disabled = isDisabled;
  }

  /**
   * Called when value selected value gets updated.
   * ControlValueAccessor implementation.
   * @param value Selected value.
   */
  public writeValue(value: any): void {
    if (this.config.multiSelectable) {
      this.selectedOptions = value;
    } else {
      this.selectedOption = value;
    }
  }

  /**
   * Register on change event.
   * ControlValueAccessor implementation.
   * @param {(value: (DropdownItem[] | DropdownItem)) => void} onSelectChange On select change callback function.
   */
  public registerOnChange(onSelectChange: (value: any[] | any) => void): void {
    this.onSelectChangeSubscription = this.selectChange.subscribe((value) => {
      onSelectChange(value);
    });
  }

  /**
   * Register on touched event.
   * ControlValueAccessor implementation.
   * @param fn Function reference.
   */
  public registerOnTouched(fn: any): void {
    // TODO: Implement touch event handler
  }

  public clearFilter(): void {
    this.dataStateService.offset = 0;
    this.dataStateService.filterText = '';
    this.eventStateService.dataFetchStream.emit(false);
  }

  public filterKeyUp(): void {
    if (this.config.filterDebounce) {
      this.dataFilterStream.next(this.dataStateService.filterText);
    } else {
      this.dataStateService.offset = 0;
      this.eventStateService.dataFetchStream.emit(false);
    }
  }

  private initFilterDebounceEvent(): void {
    this.dataFilterSubscription = this.dataFilterStream
      .debounceTime(this.config.filterDebounceTime)
      .subscribe(() => {
        this.dataStateService.offset = 0;
        this.eventStateService.dataFetchStream.emit(false);
      });
  }

  public ngOnInit(): void {
    this.initDataFetchEvent();
    this.initFilterDebounceEvent();

    if (this.config.loadDataOnInit) {
      this.eventStateService.dataFetchStream.emit(false);
    }

    if (this.config.triggerSelectChangeOnInit) {
      const options = this.config.multiSelectable ? this.dataStateService.selectedOptions : this.dataStateService.selectedOption;
      this.eventStateService.selectChangeStream.emit(options);
    }

    this.eventStateService.initStream.emit(this);
  }

  private getSelectedState(id: any): boolean {
    if (this.config.multiSelectable) {
      return this.dataStateService.selectedOptions.some((item: any) => {
        return get(item, this.config.selectTrackBy) === id;
      });
    }

    return get(this.dataStateService.selectedOption, this.config.selectTrackBy) === id;
  }

  private extractDropdownItem(item: any): DropdownItem {
    const id = get(item, this.config.selectTrackBy);

    return {
      id: id,
      text: get(item, this.config.displayTrackBy),
      disabled: get(item, this.config.disabledTrackBy),
      selected: this.getSelectedState(id),
      item: item
    };
  }

  private setDropdownOptions(queryResult: DropdownQueryResult<any>) {
    if (this.config.groupByField) {
      this.dataStateService.dropdownItemGroups = queryResult.items.reduce((accumulator: DropdownItemGroup[], item: any) => {
        const groupFieldValue = get(item, this.config.groupByField);
        const currentGroup = accumulator.find((group: DropdownItemGroup) => group.groupName === groupFieldValue);

        if (currentGroup) {
          currentGroup.items.push(this.extractDropdownItem(item));
        } else {
          accumulator.push({
            groupName: groupFieldValue,
            items: [this.extractDropdownItem(item)]
          });
        }

        return accumulator;
      }, this.dataStateService.offset > 0 ? this.dataStateService.dropdownItemGroups : []);
    } else {
      this.dataStateService.dropdownItems = queryResult.items.reduce((accumulator: DropdownItem[], item: any) => {
        accumulator.push(this.extractDropdownItem(item));
        return accumulator;
      }, this.dataStateService.offset > 0 ? this.dataStateService.dropdownItems : []);
    }

    this.dataStateService.totalOptionCount = queryResult.count;
    this.dataStateService.currentItemCount = queryResult.items.length;
    this.setAllOptionsSelectedState();
  }

  private onAfterDataBind(queryResult: DropdownQueryResult<any>): void {
    this.setDropdownOptions(queryResult);
    this.dataStateService.dataLoading = false;
    this.eventStateService.dataBoundStream.emit();
  }

  private mapToDataBindRequest(hardReload: boolean): Observable<DropdownQueryResult<any>> {
    this.dataStateService.dataLoading = true;

    if (hardReload) {
      this.dataStateService.offset = 0;
      this.dataStateService.filterText = '';
    }

    const requestParams: DropdownRequestParams = {
      hardReload: hardReload
    };

    if (this.config.loadOnScroll) {
      requestParams.limit = this.config.limit;
      requestParams.offset = this.dataStateService.offset;
    }

    if (this.config.filterable) {
      requestParams.filter = {
        key: this.config.displayTrackBy,
        value: this.dataStateService.filterText
      };
    }

    return this.dataStateService.onDataBind(requestParams);
  }

  // Do not emit dataFetchStream true unless it is required to hard reload the dropdown options.
  private initDataFetchEvent(): void {
    this.eventStateService.dataFetchStream
      .debounceTime(20)
      .switchMap((hardReload: boolean) => this.mapToDataBindRequest(hardReload))
      .subscribe((queryResult: DropdownQueryResult<any>) => {
        this.onAfterDataBind(queryResult);
      });
  }

  // Can be used to explicitly trigger data bind event.
  public dataBind(hardReload: boolean = false): void {
    this.eventStateService.dataFetchStream.emit(hardReload);
  }

  private setAllOptionsSelectedState(): void {
    if (!this.config.multiSelectable || !this.config.showSelectAll) {
      return;
    }

    if (this.dataStateService.currentItemCount === 0) {
      this.dataStateService.allOptionsSelected = false;
      return;
    }

    if (this.config.groupByField) {
      this.dataStateService.allOptionsSelected = this.dataStateService.dropdownItemGroups
        .every(group => group.items.every(item => item.selected));
    } else {
      this.dataStateService.allOptionsSelected = this.dataStateService.dropdownItems
        .every(item => item.selected);
    }
  }
}
