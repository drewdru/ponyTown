const webpack = require('webpack');
const path = require('path');

module.exports = {
	context: path.join(__dirname, 'src'),
	output: {
		path: path.resolve(__dirname, 'build', 'assets', 'scripts'),
		filename: '[name].js',
		publicPath: '/assets/scripts/',
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				use: ['angular2-template-loader'],
				exclude: [/node_modules/],
			},
			{
				test: /\.css$/,
				use: ['raw-loader'],
			},
			{
				test: /\.html$/,
				use: ['raw-loader'],
			},
			{
				test: /\.pug$/,
				use: [
					'raw-loader',
					{
						loader: 'pug-html-loader',
						query: { doctype: 'html', plugins: require('pug-plugin-ng') },
					},
				],
			},
			{
				test: /\.scss$/,
				use: [
					'raw-loader',
					{
						loader: 'postcss-loader',
						options: {
							ident: 'postcss',
							plugins: loader => [
								require('autoprefixer')('last 2 versions'),
								require('cssnano')({ discardComments: { removeAll: true } }),
							],
						},
					},
					{
						loader: 'sass-loader',
						options: { includePaths: ['src/styles'] },
					},
				],
			},
			{
				// Mark files inside `@angular/core` as using SystemJS style dynamic imports.
				// Removing this will cause deprecation warnings to appear.
				test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
				parser: { system: true }, // enable SystemJS
			},
		],
	},
	plugins: [
		new webpack.ContextReplacementPlugin(
			/\@angular(\\|\/)core(\\|\/)fesm5/,
			path.resolve(__dirname, 'src', 'ts'),
			{}
		),
	],
};
