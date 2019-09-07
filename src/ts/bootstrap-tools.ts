import './bootstrap-common';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { ToolsAppModule } from './components/tools/tools.module';

platformBrowserDynamic().bootstrapModule(ToolsAppModule, { preserveWhitespaces: true });
