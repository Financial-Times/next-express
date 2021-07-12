/**
 * @typedef {import("express")} Express
 * @typedef {import("@typings/n-express")} NExpress
 */

const nLogger = require('@financial-times/n-logger').default;
const metrics = require('next-metrics');

/**
 * @param {Express.Application} app
 * @param {string} appName
 * @returns {void}
 */
module.exports = (app, appName) => {
	/** @type {string[]} */
	const backendKeys = [];

	if (process.env.FT_NEXT_BACKEND_KEY) {
		backendKeys.push(process.env.FT_NEXT_BACKEND_KEY);
	}
	if (process.env.FT_NEXT_BACKEND_KEY_OLD) {
		backendKeys.push(process.env.FT_NEXT_BACKEND_KEY_OLD);
	}

	if (!backendKeys.length) {
		const missingEnvVarsMessage = [
			'Backend authentication is disabled due to missing environment variables -',
			'If backend authentication isn\'t required then disable this middleware by setting the n-express \'withBackendAuthentication\' option to false.',
			'To enable backend authentication add the missing environment variables.',
			'For more info on backend authentication see https://github.com/Financial-Times/n-express#optional',
		];

		nLogger.warn({
			event: 'BACKEND_AUTHENTICATION_MISSING_ENV_VARS',
			message: missingEnvVarsMessage.join(' ')
		});

		return;
	}

	// @ts-ignore
	app.use(/** @type { NExpress.Callback } */ (req, res, next) => {
		// TODO - change how all this works in order to use __assets/app/{appname}
		// allow static assets, healthchecks, etc., through
		if (req.path.indexOf('/' + appName) === 0 || req.path.indexOf('/__') === 0) {
			next();
		} else if (backendKeys.find(() => req.get('FT-Next-Backend-Key'))) {
			metrics.count('express.backend_authentication.backend_key');
			res.set('FT-Backend-Authentication', 'true');
			next();
		} else if (backendKeys.find(() => req.get('FT-Next-Backend-Key-Old'))) {
			metrics.count('express.backend_authentication.old_backend_key');
			res.set('FT-Backend-Authentication', 'true');
			next();
		} else {
			metrics.count('express.backend_authentication.fail');
			res.set('FT-Backend-Authentication', 'false');
			/* istanbul ignore else */
			if (process.env.NODE_ENV === 'production') {
				// NOTE - setting the status text is very important as it's used by the CDN
				// to trigger stale-if-error if we mess up the key synchronisation again
				res.status(401).send('Invalid Backend Key');
			} else {
				next();
			}
		}
	});
};
