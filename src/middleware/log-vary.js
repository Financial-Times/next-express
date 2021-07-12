const nLogger = require('@financial-times/n-logger').default;
const sendRate = 0.05;

/**
 * @type {import("@typings/n-express").Callback}
 */
module.exports = (req, res, next) => {

	// Throttle sending of events until we know this is the correct implmentation
	if (Math.random() < sendRate) {
		res.on('finish', function () {

			/** @type {Record<string, string | undefined>} */
			let toLog = {
				event: 'RESPONSE_VARY',
				path: req.path
			};
			const vary = res.get('vary').replace(/ /g, '').split(',');

			if (!vary) {
				return;
			}

			vary.map(header => {
				toLog[header] = req.get(header);
			});
			nLogger.warn(toLog);
		});
	}
	next();
};
