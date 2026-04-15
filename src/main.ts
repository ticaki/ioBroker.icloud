/*
 * Created with @iobroker/create-adapter v3.1.2
 */

import * as utils from '@iobroker/adapter-core';
import iCloudService, { LogLevel } from '../icloud-lib/build/index';

class Icloud extends utils.Adapter {
	private icloud: iCloudService | null = null;

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
		await this.setObjectNotExistsAsync('account', {
			type: 'channel',
			common: { name: 'Account Information' },
			native: {},
		});
		await this.setObjectNotExistsAsync('account.fullName', {
			type: 'state',
			common: { name: 'Full Name', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('account.firstName', {
			type: 'state',
			common: { name: 'First Name', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('account.lastName', {
			type: 'state',
			common: { name: 'Last Name', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('account.appleId', {
			type: 'state',
			common: { name: 'Apple ID', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});
		await this.setObjectNotExistsAsync('account.countryCode', {
			type: 'state',
			common: { name: 'Country Code', type: 'string', role: 'text', read: true, write: false, def: '' },
			native: {},
		});

		// mfa channel
		await this.setObjectNotExistsAsync('mfa', {
			type: 'channel',
			common: { name: 'Multi-Factor Authentication' },
			native: {},
		});
		await this.setObjectNotExistsAsync('mfa.code', {
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
		await this.setObjectNotExistsAsync('mfa.required', {
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
			authMethod: 'legacy',
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
			this.log.info('iCloud connection established successfully');
			this.log.debug(`iCloud status is now: ${this.icloud?.status ?? 'unknown'}`);
			this.setState('info.connection', true, true);
			this.setState('mfa.required', false, true);

			const info = this.icloud!.accountInfo;
			if (!info) {
				this.log.warn('iCloud reported Ready but accountInfo is undefined');
				return;
			}
			if (!info.dsInfo) {
				this.log.warn('accountInfo.dsInfo is undefined — account data unavailable');
				return;
			}

			const ds = info.dsInfo;
			this.log.info(`Logged in as: ${ds.fullName ?? '(no name)'} (${ds.appleId ?? '(no appleId)'})`);
			this.log.info(`Country: ${ds.countryCode ?? '?'}, Locale: ${ds.locale ?? '?'}`);
			this.log.debug(`Full dsInfo: ${JSON.stringify(ds)}`);

			const setChecked = (id: string, val: string | undefined): void => {
				if (val === undefined || val === null) {
					this.log.warn(`Skipping state "${id}" — value is ${val}`);
					return;
				}
				this.setState(id, val, true);
			};

			setChecked('account.fullName', ds.fullName);
			setChecked('account.firstName', ds.firstName);
			setChecked('account.lastName', ds.lastName);
			setChecked('account.appleId', ds.appleId);
			setChecked('account.countryCode', ds.countryCode);
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
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback - Callback function
	 */
	private onUnload(callback: () => void): void {
		try {
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
