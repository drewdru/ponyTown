import { Component } from '@angular/core';
import { TooltipConfig } from 'ngx-bootstrap/tooltip';
import { PopoverConfig } from 'ngx-bootstrap/popover';

export function tooltipConfig() {
	return Object.assign(new TooltipConfig(), { container: 'body' });
}

export function popoverConfig() {
	return Object.assign(new PopoverConfig(), { container: 'body' });
}

@Component({
	selector: 'pony-town-app',
	templateUrl: 'tools.pug',
	providers: [
		{ provide: TooltipConfig, useFactory: tooltipConfig },
		{ provide: PopoverConfig, useFactory: popoverConfig },
	]
})
export class ToolsApp {
}
