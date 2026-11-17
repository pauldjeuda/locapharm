import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

@Component({
  selector: "lp-material-icon",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="lp-icon"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label()"
      [attr.aria-hidden]="label() ? null : 'true'"
    >
      <use [attr.href]="symbolHref()"></use>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1em;
        height: 1em;
        flex: 0 0 auto;
      }
      .lp-icon {
        width: 100%;
        height: 100%;
        fill: currentColor;
      }
    `,
  ],
})
export class MaterialIconComponent {
  readonly name = input.required<string>();
  readonly filled = input(false);
  readonly label = input<string | null>(null);
  readonly symbolHref = computed(() => {
    const suffix = this.filled() ? "-fill" : "";
    return `assets/material-symbols.svg#icon-${this.name()}${suffix}`;
  });
}
