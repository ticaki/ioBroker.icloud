// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface LocationPoint {
			index: string;
			latitude: number;
			longitude: number;
			name: string;
		}
		interface AdapterConfig {
			username: string;
			password: string;
			locationPoints: LocationPoint[];
			findMyEnabled: boolean;
			findMyInterval: number;
			calendarEnabled: boolean;
			calendarEventCount: number;
			calendarInterval: number;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};