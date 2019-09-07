"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const pug_1 = require("pug");
const ag_sockets_1 = require("ag-sockets");
const oauth_1 = require("../oauth");
const config_1 = require("../config");
const logger_1 = require("../logger");
const paths_1 = require("../paths");
const binaryUtils_1 = require("../../common/binaryUtils");
function getFiles(urlBase, dir, sub) {
    try {
        return fs.readdirSync(path.join(dir, sub))
            .filter(file => /\.(js|css|png)$/.test(file))
            .map(file => ({
            name: file.replace(/-[a-f0-9]{10}\.(js|css|png)$/, '.$1'),
            path: path.join(dir, sub, file),
            url: `${urlBase}/${sub}/${file}`,
        }));
    }
    catch (_a) {
        return [];
    }
}
function createIndex(assetsPath, adminAssetsPath) {
    function toOAuthProvider({ id, name, color, auth, connectOnly }) {
        return { id, name, color, disabled: auth ? undefined : true, connectOnly };
    }
    const revServer = new Map();
    [
        ...getFiles('assets', assetsPath, 'styles'),
        ...getFiles('assets', assetsPath, 'scripts'),
        ...getFiles('assets', assetsPath, 'images'),
        ...getFiles('assets-admin', adminAssetsPath, 'styles'),
        ...getFiles('assets-admin', adminAssetsPath, 'scripts'),
    ].forEach(file => revServer.set(file.name, file));
    function revUrlGetter(dir) {
        return (name) => {
            const file = revServer.get(name);
            return file && file.url || `assets/${dir}/${name}`;
        };
    }
    function getRevPath(name) {
        return (revServer.get(name) && revServer.get(name).path) || path.join(assetsPath, name);
    }
    const getRevScriptURL = revUrlGetter('scripts');
    const getRevStyleURL = revUrlGetter('styles');
    const getRevImageURL = revUrlGetter('images');
    const template = pug_1.compileFile(paths_1.pathTo('views', 'index.pug'));
    const inlineStyle = fs.readFileSync(getRevPath('style-inline.css'), 'utf8');
    const loadingImage = fs.readFileSync(getRevPath('logo-gray.png'));
    const oauthProviders = oauth_1.providers.map(toOAuthProvider);
    function encodeSocketOptions(options) {
        if (options) {
            const data = binaryUtils_1.writeBinary(writer => ag_sockets_1.writeObject(writer, options));
            const buffer = Buffer.from(data);
            return buffer.toString('base64');
        }
        else {
            return '';
        }
    }
    function renderPage({ isPublic, style, script, scriptES, production, noindex, base, socketOptions, token, local }) {
        return template({
            doctype: 'html',
            host: config_1.config.host,
            title: config_1.config.title,
            twitterLink: config_1.config.twitterLink,
            supporterLink: config_1.config.supporterLink,
            email: config_1.config.contactEmail,
            logo: `${config_1.config.host}${getRevImageURL('logo-120.png')}`,
            loadingImage: `data:image/png;base64,${loadingImage.toString('base64')}`,
            version: config_1.version,
            description: config_1.description,
            base,
            token,
            sw: config_1.config.sw ? 'true' : undefined,
            noindex: noindex || config_1.config.noindex,
            production,
            local: local ? 'true' : undefined,
            socketOptions: encodeSocketOptions(socketOptions),
            inlineStyle,
            style,
            script,
            scriptES,
            oauthProviders,
            facebookAppId: config_1.config.facebookAppId,
            isPublic: isPublic ? 'true' : undefined,
        });
    }
    function admin(production, base, assetsBase, scriptName, socket) {
        const socketOptions = socket.options();
        const style = `${assetsBase}/${getRevStyleURL('style-admin.css')}`;
        const script = `${assetsBase}/${getRevScriptURL(scriptName)}`;
        const scriptES = script;
        return (req, res) => {
            try {
                const token = socket.token({ account: req.user });
                res.send(renderPage({ production, base, style, script, scriptES, noindex: true, socketOptions, token }));
            }
            catch (e) {
                logger_1.logger.error(e);
                res.sendStatus(500);
            }
        };
    }
    function user(production, base, styleName, scriptName, scriptESName, socketOptions, noindex, local, isPublic) {
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
exports.createIndex = createIndex;
//# sourceMappingURL=index.js.map