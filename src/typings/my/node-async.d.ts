declare module "fs" {
	import * as Promise from "bluebird";

	export function writeFileAsync(filename: string, data: any): Promise<void>;
	export function writeFileAsync(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; } | string): Promise<void>;
	export function writeFileAsync(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; } | string): Promise<void>;
	export function appendFileAsync(filename: string, data: any, options: { encoding?: string; mode?: number; flag?: string; } | string): Promise<void>;
	export function appendFileAsync(filename: string, data: any, options: { encoding?: string; mode?: string; flag?: string; } | string): Promise<void>;
	export function appendFileAsync(filename: string, data: any): Promise<void>;
	export function readFileAsync(filename: string, encoding: string): Promise<string>;
	export function readFileAsync(filename: string, options: { encoding: string; flag?: string; }): Promise<string>;
	export function readFileAsync(filename: string, options: { flag?: string; }): Promise<Buffer>;
	export function readFileAsync(filename: string): Promise<Buffer>;
	export function readdirAsync(path: string): Promise<string[]>;
	export function unlinkAsync(path: string): Promise<void>;
	export function mkdirAsync(path: string): Promise<void>;
	export function mkdirAsync(path: string, mode: number): Promise<void>;
	export function mkdirAsync(path: string, mode: string): Promise<void>;
	export function renameAsync(oldPath: string, newPath: string): Promise<void>;
	export function statAsync(path: string): Promise<Stats>;
	export function rmdirAsync(path: string): Promise<void>;
}
