const metrics = require('next-metrics');
const unRegisteredServicesHealthCheck = require('./unregistered-services-healthCheck');

/** @type {Record<string, any>} */
let unregisteredServices = {};

module.exports = {
	init: () => {
		setInterval(() => {
			unRegisteredServicesHealthCheck.updateCheck(unregisteredServices);
		}, 1 * 60 * 1000);

		metrics.fetch.instrument({
			onUninstrumented: function (/** @type {string} */ url) {
				if (typeof url === 'string') {
					unregisteredServices[url.split('?')[0]] = true;
				}
			},
		});
	},
};
