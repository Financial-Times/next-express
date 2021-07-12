/**
 * @typedef {import("@typings/n-express")} NExpress
 * @typedef {import("@typings/metrics")} Metrics
 */

const nHealth = require('n-health');

const DEFAULT_SEVERITY = 3;
const DEFAULT_SAMPLE_PERIOD = '10min';
const DEFAULT_THRESHOLD = 4;

/**
 * @param {string} appName
 * @param {NExpress.AppError} opts
 * @returns {Metrics.Healthcheck}
 */
module.exports = (appName, opts) => {
	opts = opts || {};
	const severity = opts.severity || DEFAULT_SEVERITY;
	const threshold = opts.threshold || DEFAULT_THRESHOLD;
	const samplePeriod = opts.samplePeriod || DEFAULT_SAMPLE_PERIOD;

	let region = process.env.REGION ? '_' + process.env.REGION : '';

	return nHealth.runCheck({
		id: 'error-rate',
		name: `Error rate: greater than ${threshold}% of requests for ${appName}`,
		type: 'graphiteThreshold',
		metric: `asPercent(summarize(sumSeries(next.heroku.${appName}.web_*${region}.express.*.res.status.{500,503,504}.count), '${samplePeriod}', 'sum', true), summarize(sumSeries(next.heroku.${appName}.web_*${region}.express.*.res.status.*.count), '${samplePeriod}', 'sum', true))`,
		threshold,
		samplePeriod,
		severity,
		businessImpact: 'Users may see application error pages.',
		technicalSummary: `The proportion of error responses for ${appName} is greater than 4% of all responses. This is a default n-express check.`,
		panicGuide: 'Consult errors in sentry, application logs in splunk and run the application locally to identify errors'
	});
};
