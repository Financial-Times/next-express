/**
 * @typedef {import("@typings/metrics")} Metrics
 */

let lastCheckOk = true;
let lastCheckOutput = 'All services\' metrics are set up in Next-metrics';
let panicGuide = 'Don\'t panic';

/** @type {Date} */
let lastCheckTime;

/**
 * @type {Metrics.InitHealthCheck}
 */
module.exports = {
	setAppName: (appName) => {
		return {
			getStatus: () => {
				return {
					id: 'all-services-registered',
					name: `Metrics: All services for ${appName} registered in next-metrics`,
					ok: lastCheckOk,
					checkOutput: lastCheckOutput,
					lastUpdated: lastCheckTime,
					panicGuide: panicGuide,
					severity: 3,
					businessImpact: 'We don\'t have any visibility with unregistered services.',
					technicalSummary: 'Set up services\' metrics in next-metrics/lib/metrics/services.js to send to Graphite.'
				};
			}
		};
	},
	updateCheck: (unregisteredServices) => {
		lastCheckTime = new Date();

		if (Object.keys(unregisteredServices).length > 0) {
			lastCheckOutput = Object.keys(unregisteredServices).join(', ') + ' services called but no metrics set up.';
			panicGuide = 'See next-metrics/lib/metrics/services.js and set metrics for the service, then release next-metrics and rebuild this app.';
			lastCheckOk = false;
		} else {
			lastCheckOutput = 'All services\' metrics are set up in Next-metrics';
			panicGuide = 'Don\'t panic';
			lastCheckOk = true;
		}
	}
};
