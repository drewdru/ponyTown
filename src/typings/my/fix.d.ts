interface HTMLCanvasElement {
	getContext(contextId: "webgl2", contextAttributes?: WebGLContextAttributes): WebGLRenderingContext | null;
}

interface WebGLRenderingContext {
	readonly MAX_ELEMENT_INDEX: number;
}

interface Window {
	readonly Notification: any;
}

interface NodeModule {
	hot?: { accept(): void; };
}

interface Promise<T> {
	finally(handler: () => any): Promise<T>;
}

declare const requestIdleCallback: (callback: () => void) => number;
declare const cancelIdleCallback: (idle: number) => void;

declare const Zone: any;
declare const DEVELOPMENT: boolean;
declare const TOOLS: boolean;
declare const SERVER: boolean;
declare const BETA: boolean;
declare const TIMING: boolean;
declare const TESTS: boolean;

declare module '*.json';
declare module 'connect-mongo';

declare module 'passport-google-oauth20' { export const Strategy: any; }
declare module 'passport-twitter' { export const Strategy: any; }
declare module 'passport-facebook' { export const Strategy: any; }
declare module '@passport-next/passport-google-oauth2' { export const Strategy: any; }
declare module '@passport-next/passport-facebook' { export const Strategy: any; }
declare module 'passport-github2' { export const Strategy: any; }
declare module 'passport-vkontakte' { export const Strategy: any; }
declare module 'passport-yahoo-oauth' { export const Strategy: any; }
declare module 'passport-tumblr' { export const Strategy: any; }
declare module 'passport-deviantart' { export const Strategy: any; }
declare module 'passport-steam' { export const Strategy: any; }
declare module 'passport-patreon' { export const Strategy: any; }

declare module 'timsort' {
	export function sort<T>(array: T[], compare: (a: T, b: T) => number): void;
}

declare module 'color-convert' {
	export const hex: {
		lab(color: string): [number, number, number];
	};
}

declare module 'delta-e' {
	export interface LAB {
		L: number;
		A: number;
		B: number;
	}

	export function getDeltaE00(a: LAB, b: LAB): number;
}
