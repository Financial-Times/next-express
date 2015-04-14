/*jshint node:true*/
"use strict";

require('es6-promise').polyfill();
require('isomorphic-fetch');

var express = require('express');
var errorsHandler = require('express-errors-handler');
var flags = require('next-feature-flags-client');
var handlebars = require('ft-next-handlebars');
var barriers = require('next-barrier-component');
var metrics = require('next-metrics');

var robots = require('./src/express/robots');
var normalizeName = require('./src/normalize-name');

var serviceMatchers = {
	'capi-v1-article': /^https?:\/\/api\.ft\.com\/content\/items\/v1\/[\w\-]+/,
	'capi-v1-page': /^https?:\/\/api\.ft\.com\/site\/v1\/pages\/[\w\-]+/,
	'capi-v1-pages-list': /^https?:\/\/api\.ft\.com\/site\/v1\/pages/,
	'sapi': /^https?:\/\/api\.ft\.com\/content\/search\/v1/,
	'elastic-v1-article': /^https?:\/\/[\w\-]+\.foundcluster\.com:9243\/v1_api_v2\/item/,
	'elastic-v2-article': /^https?:\/\/[\w\-]+\.foundcluster\.com:9243\/v2_api_v1\/item/,
	'user-prefs': /^https?:\/\/ft-next-api-user-prefs-v002\.herokuapp\.com/,
	'flags': /^https?:\/\/ft-next-api-feature-flags\.herokuapp\.com\/__flags\.json/,
	// 'elastic-search':
	'capi-v2-article': /^https?:\/\/api\.ft\.com\/content\/[\w\-]+/,
	'capi-v2-enriched-article': /^https?:\/\/api\.ft\.com\/enrichedcontent\/[\w\-]+/,
	'capi-v2-lists': /^https?:\/\/api\.ft\.com\/lists\/[\w\-]+/,
	'capi-v2-thing': /^https?:\/\/api\.ft\.com\/things\/[\w\-]+/,
	'capi-v2-organisation': /^https?:\/\/api\.ft\.com\/organisations\/[\w\-]+/,
	'capi-v2-content-by-concept': /^https?:\/\/api\.ft\.com\/content\?isAnnotatedBy=http:\/\/api\.ft\.com\/things\/[\w\-]+/,
	// fastft
	'fastft': /https?:\/\/clamo\.ftdata\.co\.uk\/api/,
	// v1 to v2 mapping endpoints
	'v1-to-v2-mapping-people': /^https:\/\/next-v1tov2-mapping-dev\.herokuapp\.com\/concordance_mapping_v1tov2\/people\/[A-Za-z0-9=\-]+$/,
	'v1-to-v2-mapping-organisations': /^https:\/\/next-v1tov2-mapping-dev\.herokuapp\.com\/concordance_mapping_v1tov2\/organisations\/[A-Za-z0-9=\-]+$/,
	// ft.com (temporary for article comment hack)
	'ft.com': /^http:\/\/www\.ft\.com\/cms\/s\/380e7966-b07f-11e4-9b8e-00144feab7de\.html$/
};

module.exports = function(options) {
	options = options || {};
	var app = express();
	var name = options.name;
	var directory = options.directory || process.cwd();


	if (!name) {
		try {
			var packageJson = require(directory + '/package.json');
			name = packageJson.name;
		} catch(e) {
			// Safely ignorable error
		}
	}
	if (!name) throw new Error("Please specify an application name");
	app.locals.__name = name = normalizeName(name);
	app.locals.__environment = process.env.NODE_ENV || '';
	app.locals.__isProduction = app.locals.__environment.toUpperCase() === 'PRODUCTION';
	app.locals.__rootDirectory = directory;


	if (!app.locals.__isProduction) {
		app.use('/' + name, express.static(directory + '/public'));
	}

	app.get('/robots.txt', robots);
	var helpers = options.helpers || {};
	helpers.flagStatuses = require('./src/handlebars/flag-statuses');
	helpers.hashedAsset = require('./src/handlebars/hashed-asset');

	var handlebarsPromise = handlebars(app, {
		partialsDir: [
			directory + '/views/partials'
		],
		defaultLayout: false,
		layoutsDir: __dirname + '/layouts',
		helpers: helpers,
		directory: directory
	});

	metrics.init({ app: name, flushEvery: 40000 });
	app.use(function(req, res, next) {
		metrics.instrument(req, { as: 'express.http.req' });
		metrics.instrument(res, { as: 'express.http.res' });
		next();
	});
	if (options.serviceDependencies) {
		Object.keys(options.serviceDependencies).forEach(function (serv) {
			serviceMatchers[serv] = options.serviceDependencies[serv];
		});
	}
	metrics.fetch.instrument({
		serviceMatchers: serviceMatchers,
		onUninstrumented: function (url, opts) {
			errorsHandler.captureMessage('Service ' + url + ' called but no metrics set up. See next-express README for details');
		}
	});

	app.use(barriers.middleware);
	flags.setUrl('http://ft-next-api-feature-flags.herokuapp.com/__flags.json');
	var flagsPromise = flags.init();
	app.use(flags.middleware);

	var actualAppListen = app.listen;

	app.listen = function() {
		var args = arguments;
		app.use(errorsHandler.middleware);

		return Promise.all([flagsPromise, handlebarsPromise]).then(function() {
			metrics.count('express.start');
			actualAppListen.apply(app, args);
		})
			.catch(function(err) {

				// Crash app if flags or handlebars fail
				setTimeout(function() {
					throw err;
				}, 0);
			});
	};

	return app;
};
