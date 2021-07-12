/**
 * @param {string|string[]} val
 * @param {Set<string>} set
 * @returns {string}
 */
const extendVary = (val, set) => {
	val = Array.isArray(val) ? val : val.split(',');
	val.forEach(header => {
		set.add(header.trim().toLowerCase());
	});
	return Array.from(set).join(', ');
};

/**
 * @type {import("@typings/n-express").Callback}
 */
module.exports = (_req, res, next) => {
	const resSet = res.set;

	/** @type {Set<string>} */
	const varyOn = new Set([]);

	res.set('vary', Array.from(varyOn).join(', '));

	res.vary = function (name) {
		return res.set('vary', name);
	};

	res.set = function (name, val) {

		if (arguments.length === 2 && typeof name === 'string') {
			if (name.toLowerCase() === 'vary' && val) {
				val = extendVary(val, varyOn);
			}
			return resSet.call(res, name, val);
		} else if (typeof name === 'object') {
			Object.keys(name).forEach(key => {
				if (key.toLowerCase() === 'vary') {
					name[key] === extendVary(name[key], varyOn);
				}
			});
			return resSet.call(res, name);
		}
		return resSet.call(res, name, val);
	};

	res.unvary = function () {
		Array.from(arguments).forEach(name => varyOn.delete(name.toLowerCase()));
		const list = Array.from(varyOn);
		if (list.length) {
			res.set('vary', list.join(', '));
		} else {
			res.removeHeader('vary');
		}
	};

	res.unvaryAll = function (/** @type {string} */ preset) {
		if (preset === 'wrapper') {
			// TODO need to port this to n-ui ,and rename as n-ui.
			// Not sure if it's ever used
			res.unVary('ft-anonymous-user', 'ft-edition');
		} else {
			varyOn.clear();
			res.removeHeader('vary');
		}
	};

	// backwards compatible uber-camel-cased names
	res.unVary = res.unvary;
	res.unVaryAll = res.unvaryAll;

	next();
};
