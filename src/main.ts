/*
 * Created with @iobroker/create-adapter v3.1.2
 */

import * as utils from '@iobroker/adapter-core';
import iCloudService, { LogLevel } from '../icloud-lib/build/index';

/** Haversine distance in km between two WGS84 coordinate pairs. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

class Icloud extends utils.Adapter {
	private icloud: iCloudService | null = null;
	private findMyRefreshTimer: ioBroker.Timeout | null | undefined = null;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'icloud',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	private async createObjects(): Promise<void> {
		// info channel is already created via instanceObjects in io-package.json

		// account channel
		await this.extendObject('account', {
			type: 'channel',
			common: { name: 'Account Information' },
			native: {},
		});
		await this.extendObject('account.fullName', {
			type: 'state',
			common: { name: 'Full Name', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});
		await this.extendObject('account.firstName', {
			type: 'state',
			common: { name: 'First Name', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});
		await this.extendObject('account.lastName', {
			type: 'state',
			common: { name: 'Last Name', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});
		await this.extendObject('account.appleId', {
			type: 'state',
			common: { name: 'Apple ID', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});
		await this.extendObject('account.countryCode', {
			type: 'state',
			common: { name: 'Country Code', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});

		// mfa channel
		await this.extendObject('mfa', {
			type: 'channel',
			common: { name: 'Multi-Factor Authentication' },
			native: {},
		});
		await this.extendObject('mfa.code', {
			type: 'state',
			common: {
				name: 'MFA Code (enter 6-digit code here)',
				type: 'string',
				role: 'text',
				read: true,
				write: true,
				def: '',
			},
			native: {},
		});
		await this.extendObject('mfa.required', {
			type: 'state',
			common: {
				name: 'MFA Required',
				type: 'boolean',
				role: 'indicator',
				read: true,
				write: false,
				def: false,
			},
			native: {},
		});
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		this.log.debug('onReady called');
		this.setState('info.connection', false, true);

		const username = this.config.username?.trim();
		const password = this.config.password;

		if (!username) {
			this.log.error('Configuration error: username (Apple ID) is empty');
			return;
		}
		if (!password) {
			this.log.error('Configuration error: password is empty');
			return;
		}
		if (!username.includes('@')) {
			this.log.warn(`Username "${username}" does not look like a valid Apple ID (expected an email address)`);
		}

		this.log.debug(`Config OK — username: ${username}, password: ${'*'.repeat(password.length)}`);

		await this.createObjects();
		this.log.debug('Objects created/verified');

		this.subscribeStates('mfa.code');
		this.log.debug('Subscribed to mfa.code');

		await this.connectToiCloud();
	}

	private async connectToiCloud(): Promise<void> {
		const dataDirectory = utils.getAbsoluteInstanceDataDir(this);
		this.log.debug(`Using data directory: ${dataDirectory}`);

		this.icloud = new iCloudService({
			username: this.config.username.trim(),
			password: this.config.password,
			saveCredentials: false,
			trustDevice: true,
			dataDirectory,
			authMethod: 'srp',
			logger: (level, ...args) => {
				const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
				if (level === LogLevel.Debug) this.log.debug(`[icloud.js] ${msg}`);
				else if (level === LogLevel.Info) this.log.info(`[icloud.js] ${msg}`);
				else if (level === LogLevel.Warning) this.log.warn(`[icloud.js] ${msg}`);
				else if (level === LogLevel.Error) this.log.error(`[icloud.js] ${msg}`);
			},
		});

		this.icloud.on('Started', () => {
			this.log.debug('iCloud auth started — credentials submitted, waiting for response');
		});

		this.icloud.on('MfaRequested', () => {
			this.log.info('MFA required — enter the 6-digit Apple code into state mfa.code');
			this.log.debug(`iCloud status is now: ${this.icloud?.status ?? 'unknown'}`);
			this.setState('mfa.required', true, true);
			this.setState('info.connection', false, true);
		});

		this.icloud.on('Authenticated', () => {
			this.log.debug('MFA accepted — waiting for trust token and iCloud cookies');
		});

		this.icloud.on('Trusted', () => {
			this.log.debug('Device trusted — fetching iCloud account data');
		});

		this.icloud.on('Ready', () => {
			this.log.debug(`iCloud status is now: ${this.icloud?.status ?? 'unknown'}`);
			this.onICloudReady().catch((err: unknown) => {
				this.log.error(`Error during post-login data fetch: ${(err as Error)?.message ?? String(err)}`);
			});
		});

		this.icloud.on('Error', (err: unknown) => {
			const msg = (err as Error)?.message ?? String(err);
			this.log.error(`iCloud authentication error: ${msg}`);
			this.log.debug(`iCloud error details: ${err instanceof Error ? err.stack : JSON.stringify(err)}`);
			this.setState('info.connection', false, true);
		});

		// Suppress unhandled rejection from awaitReady — errors are handled via the 'Error' event above
		this.icloud.awaitReady.catch(() => { /* handled via Error event */ });

		this.log.debug('Calling icloud.authenticate()');
		try {
			await this.icloud.authenticate();
			this.log.debug(`authenticate() returned — status: ${this.icloud.status}`);
		} catch (err) {
			const msg = (err as Error)?.message ?? String(err);
			if (msg.startsWith('RATE_LIMITED')) {
                const retryMinutes = 61; // Apple seems to use a 1-hour rate limit, but we add a buffer to be safe
				const retryTime = new Date(new Date().getTime() + retryMinutes * 60 * 1000);
				this.log.warn(`Apple Rate-Limit erkannt — nächster Versuch in ${retryTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} `);
				this.setTimeout(() => {
					this.log.info('Rate-Limit Wartezeit abgelaufen — starte erneuten Login-Versuch');
					this.connectToiCloud().catch(() => { /* Error-Event wird ausgelöst */ });
				}, retryMinutes * 60 * 1000);
			} else {
				this.log.error(`Failed to start iCloud authentication: ${msg}`);
				this.log.debug(`authenticate() exception stack: ${err instanceof Error ? err.stack : String(err)}`);
			}
			// Do not let the adapter crash — nodemon restarts would hammer Apple's servers
		}
	}

	/**
	 * Called after the iCloud session reaches Ready state.
	 * All post-login data fetching happens here — info.connection is set true only
	 * after account info, available services and FindMy devices have been collected.
	 */
	private async onICloudReady(): Promise<void> {
		const info = this.icloud!.accountInfo;
		if (!info?.dsInfo) {
			this.log.warn('iCloud Ready but accountInfo/dsInfo is unavailable');
			this.setState('info.connection', true, true);
			this.setState('mfa.required', false, true);
			return;
		}

		// ── Account info ──────────────────────────────────────────────────────
		const ds = info.dsInfo;
		this.log.info(`Logged in as: ${ds.fullName ?? '(no name)'} (${ds.appleId ?? '(no appleId)'})`);
		this.log.info(`Country: ${ds.countryCode ?? '?'}, Locale: ${ds.locale ?? '?'}`);
		this.log.debug(`Full dsInfo: ${JSON.stringify(ds)}`);

		const setChecked = (id: string, val: string | undefined): void => {
			if (val == null) { this.log.warn(`Skipping state "${id}" — value is ${val}`); return; }
			this.setState(id, val, true);
		};
		setChecked('account.fullName',   ds.fullName);
		setChecked('account.firstName',  ds.firstName);
		setChecked('account.lastName',   ds.lastName);
		setChecked('account.appleId',    ds.appleId);
		setChecked('account.countryCode',ds.countryCode);

		// ── Available webservices ─────────────────────────────────────────────
		const webservices = (info as any).webservices as Record<string, { status: string; url: string }> | undefined;
		const activeServices = webservices
			? Object.entries(webservices).filter(([, v]) => v?.status === 'active').map(([k]) => k).sort()
			: [];
		if (webservices) {
			const inactive = Object.entries(webservices)
				.filter(([, v]) => v?.status !== 'active')
				.map(([k, v]) => `${k}(${v?.status ?? '?'})`).sort();
			this.log.info(`Available iCloud services (${activeServices.length}): ${activeServices.join(', ')}`);
			if (inactive.length) this.log.debug(`Inactive iCloud services: ${inactive.join(', ')}`);
		}

		// ── Family members ────────────────────────────────────────────────────
		const family: any[] = (info as any).iCloudInfo?.familyMembers ?? [];
		if (family.length)
			this.log.info(`Family members (${family.length}): ${family.map((m: any) => m.fullName ?? m.appleId ?? '?').join(', ')}`);

		// ── Home coordinates (from config or system.config) ───────────────────
		const homeLat = this.config.useSystemCoordinates ? undefined : Number(this.config.latitude)  || undefined;
		const homeLon = this.config.useSystemCoordinates ? undefined : Number(this.config.longitude) || undefined;
		const homeCoords = await this.resolveHomeCoords(homeLat, homeLon);

		// ── FindMy devices ────────────────────────────────────────────────────
		if (activeServices.includes('findme')) {
			await this.refreshFindMyDevices(homeCoords);
			this.scheduleFindMyRefresh(homeCoords);
		}

		// ── Done: mark connection as established ──────────────────────────────
		this.log.info('iCloud connection established successfully');
		this.setState('info.connection', true, true);
		this.setState('mfa.required', false, true);
	}

	/**
	 * Resolve effective home coordinates: use explicitly configured values,
	 * fall back to system.config latitude/longitude, or return undefined.
	 */
	private async resolveHomeCoords(
		cfgLat: number | undefined,
		cfgLon: number | undefined,
	): Promise<{ lat: number; lon: number } | undefined> {
		if (cfgLat !== undefined && cfgLon !== undefined && !isNaN(cfgLat) && !isNaN(cfgLon)) {
			this.log.debug(`Home coordinates from config: ${cfgLat}, ${cfgLon}`);
			return { lat: cfgLat, lon: cfgLon };
		}
		try {
			const sysCfg = await this.getForeignObjectAsync('system.config');
			const lat = Number((sysCfg?.common as any)?.latitude);
			const lon = Number((sysCfg?.common as any)?.longitude);
			if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
				this.log.debug(`Home coordinates from system.config: ${lat}, ${lon}`);
				return { lat, lon };
			}
		} catch (_) { /* ignore */ }
		this.log.debug('No home coordinates configured — distance will not be shown');
		return undefined;
	}

	/** Fetch FindMy devices and log them with optional distance from home. */
	private async refreshFindMyDevices(homeCoords: { lat: number; lon: number } | undefined): Promise<void> {
		if (!this.icloud) return;
		try {
			const findMe = this.icloud.getService('findme') as any;
			await findMe.refresh();
			const devices: Map<string, any> = findMe.devices;
			this.log.info(`FindMy: ${devices.size} device(s)`);
			for (const [, dev] of devices) {
				const d = dev.deviceInfo ?? dev;
				const loc = d.location;
				let locStr = 'no location';
				let distStr = '';
				if (loc) {
					locStr = `${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)} (${loc.positionType ?? '?'})`;
					if (homeCoords) {
						const km = haversineKm(homeCoords.lat, homeCoords.lon, loc.latitude, loc.longitude);
						distStr = `, ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} from home`;
					}
				}
				const bat = d.batteryLevel != null ? `${Math.round(d.batteryLevel * 100)}% (${d.batteryStatus ?? '?'})` : '?';
				this.log.info(
					`  • ${d.name ?? '?'} [${d.deviceDisplayName ?? d.modelDisplayName ?? d.deviceClass ?? '?'}]` +
					` — status: ${d.deviceStatus ?? '?'}, battery: ${bat}, location: ${locStr}${distStr}`
				);
			}
		} catch (err) {
			this.log.warn(`FindMy refresh failed: ${(err as Error)?.message ?? String(err)}`);
		}
	}

	/**
	 * Schedule a self-rescheduling FindMy refresh every 15 minutes.
	 * Uses setTimeout (not setInterval) so the next run only starts after the
	 * current one completes — no overlapping requests.
	 */
	private scheduleFindMyRefresh(homeCoords: { lat: number; lon: number } | undefined): void {
		if (this.findMyRefreshTimer) {
			this.clearTimeout(this.findMyRefreshTimer);
			this.findMyRefreshTimer = null;
		}
		const INTERVAL_MS = 3 * 60 * 1000;
		const schedule = (): void => {
			this.findMyRefreshTimer = this.setTimeout(async () => {
				this.findMyRefreshTimer = null as any;
				if (!this.icloud) return;
				this.log.debug('FindMy scheduled refresh starting...');
				await this.refreshFindMyDevices(homeCoords);
				schedule(); // reschedule only after completion
			}, INTERVAL_MS);
		};
		schedule();
		this.log.debug('FindMy refresh scheduled every 15 min');
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback - Callback function
	 */
	private onUnload(callback: () => void): void {
		try {
			if (this.findMyRefreshTimer) {
				this.clearTimeout(this.findMyRefreshTimer);
				this.findMyRefreshTimer = null;
			}
			if (this.icloud) {
				this.icloud.removeAllListeners();
				this.icloud = null;
			}
			callback();
		} catch {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 *
	 * @param id - State ID
	 * @param state - State object
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (!state) {
			this.log.debug(`State deleted: ${id}`);
			return;
		}
		if (state.ack) {
			this.log.debug(`State update (ack=true, ignoring): ${id} = ${state.val}`);
			return;
		}

		this.log.debug(`Command received: ${id} = "${state.val}"`);

		if (id === `${this.namespace}.mfa.code`) {
			const raw = String(state.val ?? '').trim();
			this.log.debug(`MFA code value received: "${raw}" (length: ${raw.length})`);

			if (raw.length === 0) {
				this.log.debug('Empty MFA code — ignoring');
				return;
			}
			if (!/^\d{6}$/.test(raw)) {
				this.log.warn(`Invalid MFA code: "${raw}" — must be exactly 6 digits, got ${raw.length} characters`);
				return;
			}
			if (!this.icloud) {
				this.log.warn('MFA code received but iCloud service is not initialized');
				return;
			}
			const status = this.icloud.status;
			if (status !== 'MfaRequested') {
				this.log.warn(`MFA code received but iCloud status is "${status}" (expected "MfaRequested") — submitting anyway`);
			}
			this.log.info(`Submitting MFA code (iCloud status: ${status})`);
			this.icloud.provideMfaCode(raw).catch((err: unknown) => {
				this.log.error(`Failed to submit MFA code: ${(err as Error)?.message ?? String(err)}`);
			});
		}
	}

	/**
	 * Is called if a message is sent to this instance.
	 *
	 * @param obj - Message object
	 */
	private onMessage(obj: ioBroker.Message): void {
		if (typeof obj !== 'object' || !obj.message) return;
		this.log.debug(`Message received: command="${obj.command}", message="${JSON.stringify(obj.message)}"`);

		if (obj.command === 'submitMfa') {
			const code = String(obj.message).trim();
			if (code.length === 6 && this.icloud) {
				this.icloud
					.provideMfaCode(code)
					.then(() => {
						if (obj.callback) this.sendTo(obj.from, obj.command, { success: true }, obj.callback);
					})
					.catch((err: unknown) => {
						if (obj.callback)
							this.sendTo(
								obj.from,
								obj.command,
								{ success: false, error: (err as Error)?.message },
								obj.callback,
							);
					});
			} else {
				if (obj.callback)
					this.sendTo(obj.from, obj.command, { success: false, error: 'Invalid code' }, obj.callback);
			}
		}
	}
}
if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Icloud(options);
} else {
	// otherwise start the instance directly
	(() => new Icloud())();
}
