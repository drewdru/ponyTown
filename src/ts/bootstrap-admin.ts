import './bootstrap-common';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AdminAppModule } from './components/admin/admin.module';

platformBrowserDynamic().bootstrapModule(AdminAppModule, { preserveWhitespaces: true });
