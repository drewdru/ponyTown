import * as fs from 'fs';
import * as path from 'path';
import { compileFile } from 'pug';
import { RequestHandler } from 'express';
import { ClientOptions, Server, writeObject } from 'ag-sockets';
import { OAuthProvider } from '../../common/interfaces';
import { providers, OAuthProviderInfo } from '../oauth';
import { config, version, description } from '../config';
import { TokenData } from '../serverInterfaces';
import { logger } from '../logger';
import { pathTo } from '../paths';
import { writeBinary } from '../../common/binaryUtils';

interface RevFile {
	name: string;
	path: string;
	url: string;
}

interface PageOptions {
	isPublic?: boolean;
	production: boolean;
	base: string;
	assets?: string;
	style: string;
	script: string;
	scriptES: string;
	token?: string;
	noindex?: boolean;
	socketOptions?: ClientOptions;
	webpack?: boolean;
	local?: boolean;
}

function getFiles(urlBase: string, dir: string, sub: string): RevFile[] {
	try {
		return fs.readdirSync(path.join(dir, sub))
			.filter(file => /\.(js|css|png)$/.test(file))
			.map(file => ({
				name: file.replace(/-[a-f0-9]{10}\.(js|css|png)$/, '.$1'),
				path: path.join(dir, sub, file),
				url: `${urlBase}/${sub}/${file}`,
			}));
	} catch {
		return [];
	}
}

export function createIndex(assetsPath: string, adminAssetsPath: string) {
	function toOAuthProvider({ id, name, color, auth, connectOnly }: OAuthProviderInfo): OAuthProvider {
		return { id, name, color, disabled: auth ? undefined : true, connectOnly };
	}

	const revServer = new Map<string, RevFile>();

	[
		...getFiles('assets', assetsPath, 'styles'),
		...getFiles('assets', assetsPath, 'scripts'),
		...getFiles('assets', assetsPath, 'images'),
		...getFiles('assets-admin', adminAssetsPath, 'styles'),
		...getFiles('assets-admin', adminAssetsPath, 'scripts'),
	].forEach(file => revServer.set(file.name, file));

	function revUrlGetter(dir: string) {
		return (name: string) => {
			const file = revServer.get(name);
			return file && file.url || `assets/${dir}/${name}`;
		};
	}

	function getRevPath(name: string) {
		return (revServer.get(name) && revServer.get(name)!.path) || path.join(assetsPath, name);
	}

	const getRevScriptURL = revUrlGetter('scripts');
	const getRevStyleURL = revUrlGetter('styles');
	const getRevImageURL = revUrlGetter('images');

	const template = compileFile(pathTo('views', 'index.pug'));
	const inlineStyle = fs.readFileSync(getRevPath('style-inline.css'), 'utf8');
	const loadingImage = fs.readFileSync(getRevPath('logo-gray.png'));
	const oauthProviders = providers.map(toOAuthProvider);

	function encodeSocketOptions(options: ClientOptions | undefined): string {
		if (options) {
			const data = writeBinary(writer => writeObject(writer, options));
			const buffer = Buffer.from(data);
			return buffer.toString('base64');
		} else {
			return '';
		}
	}

	function renderPage(
		{ isPublic, style, script, scriptES, production, noindex, base, socketOptions, token, local }: PageOptions
	) {
		return template({
			doctype: 'html',
			host: config.host,
			title: config.title,
			twitterLink: config.twitterLink,
			supporterLink: config.supporterLink,
			email: config.contactEmail,
			logo: `${config.host}${getRevImageURL('logo-120.png')}`,
			loadingImage: `data:image/png;base64,${loadingImage.toString('base64')}`,
			version,
			description,
			base,
			token,
			sw: config.sw ? 'true' : undefined,
			noindex: noindex || config.noindex,
			production,
			local: local ? 'true' : undefined,
			socketOptions: encodeSocketOptions(socketOptions),
			inlineStyle,
			style,
			script,
			scriptES,
			oauthProviders,
			facebookAppId: config.facebookAppId,
			isPublic: isPublic ? 'true' : undefined,
		});
	}

	function admin(
		production: boolean, base: string, assetsBase: string, scriptName: string, socket: Server
	): RequestHandler {
		const socketOptions = socket.options();
		const style = `${assetsBase}/${getRevStyleURL('style-admin.css')}`;
		const script = `${assetsBase}/${getRevScriptURL(scriptName)}`;
		const scriptES = script;

		return (req, res) => {
			try {
				const token = socket.token({ account: req.user } as TokenData);
				res.send(renderPage({ production, base, style, script, scriptES, noindex: true, socketOptions, token }));
			} catch (e) {
				logger.error(e);
				res.sendStatus(500);
			}
		};
	}

	function user(
		production: boolean, base: string, styleName: string, scriptName: string, scriptESName: string,
		socketOptions: ClientOptions | undefined, noindex: boolean, local: boolean, isPublic: boolean,
	) {
		const style = `/${getRevStyleURL(styleName)}`;
		const script = `/${getRevScriptURL(scriptName)}`;
		const scriptES = `/${getRevScriptURL(scriptESName)}`;
		const sprites1 = DEVELOPMENT ? `/assets/images/pony.png` : `/${getRevImageURL('pony.png')}`;
		const sprites2 = DEVELOPMENT ? `/assets/images/pony2.png` : `/${getRevImageURL('pony2.png')}`;

		const page = renderPage({ isPublic, production, base, style, script, scriptES, socketOptions, noindex, local });

		const preload = [
			`<${script}>; rel=preload; as=script`,
			`<${style}>; rel=preload; as=style`,
			`<${sprites1}>; rel=preload; as=fetch; crossorigin`,
			`<${sprites2}>; rel=preload; as=fetch; crossorigin`,
		];

		return { page, preload };
	}

	return { admin, user, getRevScript: getRevScriptURL, getRevStyle: getRevStyleURL };
}
