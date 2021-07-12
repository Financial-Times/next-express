const fs = require('fs');
const path = require('path');
const robots = fs.readFileSync(path.join(__dirname, '../assets/robots.txt'), { encoding: 'utf8' });

/**
 * @type {import("@typings/n-express").Callback}
 */
module.exports = (_req, res) => {
	res.set({
		'Content-Type': 'text/plain',
		'Cache-Control': 'max-age:3600, public'
	});
	res.send(robots);
};
