// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			username: string;
			password: string;
			latitude: number;
			longitude: number;
			useSystemCoordinates: boolean;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};