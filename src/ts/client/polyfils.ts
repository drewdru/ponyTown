/// <reference path="../../typings/my.d.ts" />

// Safari <= 8.4, Android
try {
	if (!('performance' in window && 'now' in performance)) {
		(window as any).performance = Date;
	}
} catch { }

try {
	if (!('getGamepads' in navigator)) {
		(window.navigator as any).getGamepads = () => [];
	}
} catch { }

try {
	if (!('requestAnimationFrame' in window)) {
		(window as any).requestAnimationFrame = (callback: any) => setTimeout(() => callback(performance.now()), 1000 / 60) as any;
	}
} catch { }

try {
	if (!('cancelAnimationFrame' in window)) {
		(window as any).cancelAnimationFrame = clearTimeout;
	}
} catch { }

// IE <= 10
try {
	if (!('devicePixelRatio' in window)) {
		(window as any).devicePixelRatio = 1;
	}
} catch { }
