// This file extends the AdapterConfig type from "@iobroker/types"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface LocationPoint {
			index: string | number;
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
			findMyDisabledDevices: string[];
			geocodingProvider: 'none' | 'local' | 'traccar' | 'nominatim' | 'opencage';
			geocodingUrl: string;
			geocodingApiKey: string;
			geocodingCacheSize: 'small' | 'medium' | 'large';
			calendarEnabled: boolean;
			calendarEventCount: number;
			calendarInterval: number;
			remindersEnabled: boolean;
			remindersItemCount: number;
			remindersInterval: number;
			remindersFilter: 'due' | 'all';
			remindersShowCompleted: boolean;
			driveEnabled: boolean;
			driveSyncEnabled: boolean;
			driveSyncConfig: string;
			driveSyncInterval: number;
			photosEnabled: boolean;
			photosInterval: number;
			contactsEnabled: boolean;
			contactsInterval: number;
			contactsWriteStates: boolean;
			notesEnabled: boolean;
			notesInterval: number;
			accountStorageEnabled: boolean;
			accountStorageInterval: number;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};