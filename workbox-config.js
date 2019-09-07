const { hash } = require('./src/ts/generated/hash.json');
const ignore = /^\/((a(pi(\d?|-tools)|uth|dm(in)?)|(bl|m)ep)|tools|reload)\/|\.html|^\/sw\.js$/;

module.exports = {
	globDirectory: 'build/',
	globPatterns: [
		'**/*.{js,css,png,jpg,wasm}',
	],
	globIgnores: [
		'**/assets-admin/**',
		'**/bootstrap-es*',
		'**/bootstrap-tools*',
		'**/style-tools*',
		'**/style-inline*',
		'**/sw.min.js',
	],
	dontCacheBustURLsMatching: /-[a-f0-9]{10}\./,
	swDest: 'build/sw.js',
	navigateFallback: '/',
	navigateFallbackBlacklist: [ignore],
	maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
	// importWorkboxFrom: 'local',
	skipWaiting: true,
	clientsClaim: true,
	templatedURLs: {
		'/': hash,
	},
	directoryIndex: '/',
	runtimeCaching: [
		{
			urlPattern: ignore,
			handler: 'NetworkOnly',
		},
		{
			urlPattern: /^\/assets\/music/,
			handler: 'CacheOnly',
			options: {
				cacheName: 'music-cache',
				expiration: {
					maxAgeSeconds: 1000 * 3600 * 24 * 30, // 30 days
				},
			},
		},
	],
};
