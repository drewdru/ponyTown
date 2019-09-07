import 'focus-visible';
import 'core-js/es';
import 'core-js/stable/promise/finally';
import 'core-js/proposals/reflect-metadata';
import 'zone.js/dist/zone';
import 'zone.js/dist/long-stack-trace-zone';
import 'canvas-toBlob';
import './client/polyfils';
import { enableProdMode } from '@angular/core';

if (document.body.getAttribute('data-debug') !== 'true' || localStorage.production) {
	enableProdMode();
}

if (typeof module !== 'undefined' && module.hot) {
	module.hot.accept();
}
