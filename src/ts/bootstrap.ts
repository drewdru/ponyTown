import './bootstrap-common';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './components/app/app.module';
import { host, local } from './client/data';

if (DEVELOPMENT || local || host === `${location.protocol}//${location.host}/`) {
	if (window.opener && window.opener.postMessage && window.URL) {
		const path = location.href.replace(host, '');
		window.opener.postMessage({ type: 'loaded-page', path }, '*');
	}

	platformBrowserDynamic().bootstrapModule(AppModule, { preserveWhitespaces: true });
}
