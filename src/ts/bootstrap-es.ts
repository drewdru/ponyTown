import './bootstrap-common';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './components/app/app.module';
import { host, local } from './client/data';

if (DEVELOPMENT || local || host === `${location.protocol}//${location.host}/`) {
	platformBrowserDynamic().bootstrapModule(AppModule, { preserveWhitespaces: true });
}
