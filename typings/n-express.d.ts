import Express, { Application, NextFunction } from 'express';
import { cacheHeaders } from '../src/middleware/cache';

export type CacheHeaders = typeof cacheHeaders;

interface Request extends Express.Request {}

interface Response extends Express.Response, CacheHeaders {
	unvary: (...args: string[]) => void;
	unvaryAll: () => void;

	// Backwards-compatible uber-camel-cased names
	unVary: unvary;
	unVaryAll: unvaryAll;
}

interface NextFunction extends NextFunction {}

export type Callback = (
	req: Request,
	res: Response,
	next: NextFunction
) => void;

export interface AppMeta {
	name: string;
	directory: string;
	systemCode: string;
	graphiteName: string;
}
export interface AppOptions extends AppMeta {
	healthChecksAppName: string;
	healthChecks: Metrics.Healthcheck[];
	errorRateHealthcheck: AppError;
	demo?: boolean;
	logVary?: boolean;
	withAb?: boolean;
	withAnonMiddleware?: boolean;
	withConsent?: boolean;
	withBackendAuthentication?: boolean;
	withFlags?: boolean;
	withServiceMetrics?: boolean;
}

export interface AppError {
	severity?: number;
	threshold?: number;
	samplePeriod?: string;
}

export interface AppContainer {
	app: Express.Application;
	meta: guessAppDetails.Options & {
		description: string;
	};
	addInitPromise: (...items: Promise<any>[]) => number;
}

export as namespace NExpress;
