/**
 * @typedef {import("@typings/n-express")} NExpress
 * @typedef {[key: keyof NExpress.CacheHeaders, val: string]} CacheHeader
 */

const cacheHeaders = {
	FT_NO_CACHE: 'max-age=0, no-cache, must-revalidate',
	FT_NO_CACHE_PRIVATE: 'max-age=0, no-cache, no-store, must-revalidate, private',
	FT_SHORT_CACHE: 'max-age=600, stale-while-revalidate=60, stale-if-error=86400',
	FT_HOUR_CACHE: 'max-age=3600, stale-while-revalidate=60, stale-if-error=86400',
	FT_DAY_CACHE: 'max-age=86400, stale-while-revalidate=60, stale-if-error=86400',
	FT_WEEK_CACHE: 'max-age=604800, stale-while-revalidate=60, stale-if-error=259200',
	FT_LONG_CACHE: 'max-age=86400, stale-while-revalidate=60, stale-if-error=259200'
};

/**
 * @type {NExpress.Callback}
 */
const cache = (_req, res, next) => {
	for (const header of Object.entries(cacheHeaders)) {
		const [key, val] = /** @type {CacheHeader} */ (header);
		res[key] = val;
	}
	next();
};

module.exports = {
	cache,
	cacheHeaders
};
