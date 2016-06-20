/*jshint node:true*/
"use strict";

require('isomorphic-fetch');

const denodeify = require('denodeify');
const express = require('express');
const raven = require('@financial-times/n-raven');
const flags = require('next-feature-flags-client');
const handlebars = require('@financial-times/n-handlebars');
const navigation = require('@financial-times/n-navigation');
const metrics = require('next-metrics');
const nLogger = require('@financial-times/n-logger').default;
const robots = require('./src/express/robots');
const normalizeName = require('./src/normalize-name');
const anon = require('./src/anon');
const serviceMetrics = require('./src/service-metrics');
const vary = require('./src/middleware/vary');
const cache = require('./src/middleware/cache');
const nUi = require('@financial-times/n-ui');
const verifyAssets = require('./src/lib/verify-assets');
const backendAuthentication = require('./src/middleware/backend-authentication');
const headCssMiddleware = require('./src/middleware/head-css');
const healthChecks = require('./src/lib/health-checks');

module.exports = function(options) {

	options = options || {};

	const defaults = {
		withFlags: false,
		withHandlebars: false,
		withNavigation: false,
		withAnonMiddleware: false,
		withBackendAuthentication: false,
		withRequestTracing: false,
		hasHeadCss: false,
		hasNUiBundle: false,
		healthChecks: []
	};


	Object.keys(defaults).forEach(function (prop) {
		if (typeof options[prop] === 'undefined') {
			options[prop] = defaults[prop];
		}
	});

	let packageJson = {};
	let name = options.name;
	let description = '';
	let directory = options.directory || process.cwd();

	if (!name) {
		try {
			packageJson = require(directory + '/package.json');
			name = packageJson.name;
			description = packageJson.description || '';
		} catch(e) {
			// Safely ignorable error
		}
	}

	if (!name) throw new Error('Please specify an application name');

	const app = express();

	app.locals.__name = name = normalizeName(name);
	app.locals.__environment = process.env.NODE_ENV || '';
	app.locals.__isProduction = app.locals.__environment.toUpperCase() === 'PRODUCTION';
	app.locals.__rootDirectory = directory;

	//Remove x-powered-by header
	app.set('x-powered-by', false);

	try {
		app.locals.__version = require(directory + '/public/__about.json').appVersion;
	} catch (e) {}

	// Only allow authorized upstream applications access
	if (options.withBackendAuthentication) {
		app.use(backendAuthentication(name));
	} else {
		nLogger.warn({ event: 'BACKEND_AUTHENTICATION_DISABLED', message: 'Backend authentication is disabled, this app is exposed directly to the internet' });
	}

	if (!app.locals.__isProduction) {
		app.use('/' + name, express.static(directory + '/public'));
	}

	app.get('/robots.txt', robots);
	app.get('/__brew-coffee', function(req, res) {
		res.sendStatus(418);
	});

	healthChecks(app, options, description);


	let handlebarsPromise = Promise.resolve();

	if (options.withHandlebars) {
		const helpers = options.helpers || {};
		helpers.hashedAsset = require('./src/handlebars/hashed-asset')(app.locals);

		handlebarsPromise = handlebars(app, {
			partialsDir: [
				directory + '/views/partials'
			],
			defaultLayout: false,
			// The most common use case, n-layout is not bundled with tis package
			layoutsDir: typeof options.layoutsDir !== 'undefined' ? options.layoutsDir : (directory + '/bower_components/n-layout/templates'),
			helpers: helpers,
			directory: directory
		});
	}

	app.use(cache);
	app.use(vary);



	metrics.init({ app: name, flushEvery: 40000 });
	app.use(function(req, res, next) {
		metrics.instrument(req, { as: 'express.http.req' });
		metrics.instrument(res, { as: 'express.http.res' });
		next();
	});

	serviceMetrics.init(options.serviceDependencies);


	app.get('/__about', function(req, res) {
		res.set({ 'Cache-Control': 'no-cache' });
		res.sendFile(directory + '/public/__about.json');
	});

	let flagsPromise = Promise.resolve();

	if (options.withFlags) {
		flagsPromise = flags.init();
		app.use(flags.middleware);
	}


	verifyAssets.verify(app.locals);

	if (options.hasNUiBundle) {
		if (!options.withFlags) {
			throw new Error('To use n-ui bundle please also enable flags by passing in `withFlags: true` as an option to n-express');
		}
		app.use(nUi.middleware);
	}

	// get head css
	const readFile = denodeify(require('fs').readFile);
	const headCssPromise = options.hasHeadCss ? readFile(directory + '/public/head.css', 'utf-8') : Promise.resolve();
	app.use(headCssMiddleware(headCssPromise));

	if (options.withAnonMiddleware) {
		app.use(anon.middleware);
	}

	if (options.withNavigation) {
		flagsPromise.then(navigation.init);
		app.use(navigation.middleware);
	}

	if (options.withHandlebars) {
		app.use(function (req, res, next) {
			res.locals.forceOptInDevice = req.get('FT-Force-Opt-In-Device') === 'true';
			res.vary('FT-Force-Opt-In-Device');
			next();
		});
	}

	const actualAppListen = app.listen;

	app.listen = function() {
		const args = [].slice.apply(arguments);
		app.use(raven.middleware);
		const port = args[0];
		const cb = args[1];
		args[1] = function () {
			// HACK: Use warn so that it gets into Splunk logs
			nLogger.warn({ event: 'EXPRESS_START', app: name, port: port, nodeVersion: process.version });
			return cb && cb.apply(this, arguments);
		};

		return Promise.all([flagsPromise, handlebarsPromise, headCssPromise])
			.then(function() {
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

module.exports.Router = express.Router;
module.exports.static = express.static;
module.exports.metrics = metrics;
module.exports.flags = flags;
module.exports.cacheMiddleware = cache.middleware;
