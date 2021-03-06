import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
  selector: '[ngFocus]'
})
export class FocusDirective implements OnInit {
  constructor(private el: ElementRef) {
  }

  public ngOnInit(): void {
    this.el.nativeElement.focus();
  }
}
