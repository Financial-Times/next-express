/**
 * @typedef {import("@typings/metrics")} Metrics
 */

const metrics = require('next-metrics');

/**
 * @param {string} appName
 * @returns {Metrics.Healthcheck}
 */
module.exports = (appName) => {
	return {
		getStatus: () => {
			return {
				id: 'next-metrics-configuration-valid',
				name: `Metrics: next-metrics configuration valid for ${appName}`,
				ok: metrics.hasValidConfiguration,
				checkOutput: metrics.hasValidConfiguration ? `next-metrics configuration is valid for ${appName}` : `next-metrics configuration is NOT valid for ${appName}`,
				lastUpdated: new Date(),
				severity: 2,
				panicGuide: `Check ${appName} application logs and that ${appName} is configured as described in the next-metrics README: https://github.com/Financial-Times/next-metrics`,
				businessImpact: `Severely reduced visibility of any ${appName} production issues`,
				technicalSummary: `The configuration for ${appName} needs to be fixed so that next-metrics can send metrics`,
			};
		}
	};
};
