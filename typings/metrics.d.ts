export interface HealthcheckStatus {
	id: string;
	name: string;
	ok: boolean;
	checkOutput: string;
	lastUpdated: Date;
	severity: number;
	panicGuide: string;
	businessImpact: string;
	technicalSummary: string;
}

export type Healthcheck = {
	getStatus: () => HealthcheckStatus;
};

export interface InitHealthCheck {
	setAppName: (appName: string) => Metrics.Healthcheck;
	updateCheck: (unregisteredServices: Record<string, any>) => void;
}

export as namespace Metrics;
