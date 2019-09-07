const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const WrapperPlugin = require('wrapper-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { AngularCompilerPlugin } = require('@ngtools/webpack');
const common = require('./webpack.common.js');
const config = require('./config.json');

const analytics = config.analytics ? `
	(function(i, s, o, g, r, a, m) {i['GoogleAnalyticsObject']=r; i[r]=i[r]||function() {
	(i[r].q=i[r].q||[]).push(arguments) }, i[r].l=1*new Date(); a=s.createElement(o),
	m=s.getElementsByTagName(o)[0]; a.async=1; a.src=g; m.parentNode.insertBefore(a, m)
	}) (window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');
	ga('create', '${config.analytics.trackingID}', 'auto');
	ga('send', 'pageview');
` : ``;

const compilerOptions = require('./tsconfig-aot.json').compilerOptions;
const compilerOptionsES = require('./tsconfig-aot-es.json').compilerOptions;

const scripts = [
	['bootstrap', 'app/app.module#AppModule', 'assets', compilerOptions, 'tsconfig-aot.json', 5, false],
	// ['bootstrap-es', 'app/app.module#AppModule', 'assets', compilerOptionsES, 'tsconfig-aot-es.json', 7, false],
	['bootstrap-admin', 'admin/admin.module#AdminAppModule', 'assets-admin', compilerOptions, 'tsconfig-aot.json', 5, true],
	['bootstrap-tools', 'tools/tools.module#ToolsAppModule', 'assets', compilerOptions, 'tsconfig-aot.json', 5, true],
];

function getScripts(args) {
	const { analyze, main, admin } = args;

	if (analyze || main) {
		return [scripts[0]];
	} else if (admin) {
		return [scripts[2]];
	} else {
		return scripts;
	}
}

module.exports = (args = {}) =>
	getScripts(args)
		.map(([script, entry, outDir, compilerOptions, tsConfigPath, ecma, TOOLS]) => merge(common, {
			mode: 'production',
			performance: {
				maxEntrypointSize: 10000000,
				maxAssetSize: 10000000,
			},
			entry: {
				[script]: `./ts/${script}`,
			},
			output: Object.assign({}, common.output, {
				filename: '[name]-[chunkhash:10].js',
				path: path.resolve(__dirname, 'build', outDir, 'scripts'),
			}),
			devtool: script === 'bootstrap' ? 'source-map' : false,
			node: { Buffer: false },
			module: {
				rules: [
					{
						test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
						use: [
							{ loader: '@ngtools/webpack', options: { sourcemap: true, compilerOptions } },
						],
					},
				],
			},
			optimization: {
				minimizer: [
					new UglifyJSPlugin({
						sourceMap: true,
						uglifyOptions: {
							ecma,
							mangle: !args.debug,
							output: { comments: false },
							compress: ecma !== 5 ? { inline: 1 } : {},
						},
					}),
				],
			},
			plugins: [
				new AngularCompilerPlugin({ tsConfigPath, entryModule: `src/ts/components/${entry}` }),
				(script === 'bootstrap' && !args.analyze) ? new WrapperPlugin({ test: /\.js$/, header: analytics }) : undefined,
				args.analyze ? new BundleAnalyzerPlugin({ analyzerMode: 'static' }) : undefined,
				new webpack.DefinePlugin({ DEVELOPMENT: false, TOOLS, SERVER: false, BETA: !!args.beta, TIMING: !!args.timing, TESTS: false }),
				new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
			].filter(x => x),
		}));
