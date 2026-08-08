import React from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import SmsIcon from '@mui/icons-material/Sms';
import SendIcon from '@mui/icons-material/Send';
import KeyIcon from '@mui/icons-material/Key';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';
import { I18n } from '@iobroker/gui-components';

/**
 * State for the SmsMfaPanel component.
 */
interface SmsMfaPanelState extends ConfigGenericState {
    /** Whether the adapter process is alive (socket subscription). */
    alive: boolean;
    /**
     * Whether the adapter's internal iCloud service is currently in `MfaRequested` state.
     * Read via `getMfaStatus` sendTo — never from the `mfa.required` ioBroker state — so it
     * only becomes true once the adapter is fully ready to accept the code.
     */
    mfaRequested: boolean;
    /** The 6-digit code the user is typing. */
    code: string;
    /** True while the "Request SMS" sendTo call is in flight. */
    smsRequesting: boolean;
    /** True while the "Submit" sendTo call is in flight. */
    submitting: boolean;
    /** Non-null when there is a user-visible error message. */
    error: string | null;
    /** Non-null when there is a user-visible success/info message. */
    info: string | null;
    /** True when this account requires a hardware security key (FIDO2) instead of SMS/code. */
    securityKeyRequested: boolean;
    /** True when this host can perform security-key login (Linux + libfido2 present). */
    securityKeySupported: boolean;
    /** Reason why security-key login is unavailable on this host (when not supported). */
    securityKeyReason: string | null;
    /** Latest live status text of the security-key ceremony, reported by the adapter (English fallback). */
    securityKeyStatus: string | null;
    /** i18n key for the live status, so the admin can render it in the user's language. */
    securityKeyStatusKey: string | null;
    /** Optional value substituted into the status via %s (device path, error message). */
    securityKeyStatusDetail: string | null;
    /** True while the "Login with security key" sendTo call is in flight. */
    securityKeyStarting: boolean;
    /** True while the adapter's background security-key ceremony is running (the whole window). */
    securityKeyRunning: boolean;
}

/**
 * How often (ms) the component polls the adapter for its MFA status.
 */
const POLL_INTERVAL_MS = 3_000;

/**
 * Panel for handling SMS-based Multi-Factor Authentication (MFA) for the iCloud adapter.
 * This component allows users to request an SMS with a 6-digit code and submit it to authenticate.
 */
class SmsMfaPanel extends ConfigGeneric<ConfigGenericProps, SmsMfaPanelState> {
    /** Timer ID for the periodic MFA status polling. */
    private _pollTimer: number | null = null;
    /** Handler for the adapter alive state subscription. */
    private _aliveHandler: ioBroker.StateChangeHandler | null = null;
    /** True while a pollMfaStatus call is already in flight — prevents duplicate concurrent calls. */
    private _polling = false;
    /** Handler for the document visibilitychange event (pauses/resumes polling). */
    private _visibilityHandler: (() => void) | null = null;

    constructor(props: ConfigGenericProps) {
        super(props);
        Object.assign(this.state, {
            alive: false,
            mfaRequested: false,
            code: '',
            smsRequesting: false,
            submitting: false,
            error: null,
            info: null,
            securityKeyRequested: false,
            securityKeySupported: false,
            securityKeyReason: null,
            securityKeyStatus: null,
            securityKeyStatusKey: null,
            securityKeyStatusDetail: null,
            securityKeyStarting: false,
            securityKeyRunning: false,
        } satisfies Partial<SmsMfaPanelState>);
    }

    /**
     * Lifecycle method called after the component is mounted.
     * Subscribes to the adapter's alive state, registers the page-visibility listener,
     * and starts polling for MFA status.
     */
    async componentDidMount(): Promise<void> {
        await super.componentDidMount();
        this.subscribeAlive();
        this._visibilityHandler = (): void => {
            if (document.hidden) {
                this.stopPolling();
            } else {
                void this.pollMfaStatus();
            }
        };
        document.addEventListener('visibilitychange', this._visibilityHandler);
        void this.pollMfaStatus();
    }

    /**
     * Lifecycle method called before the component is unmounted.
     * Unsubscribes from the adapter's alive state, removes the visibility listener,
     * and stops the polling timer.
     */
    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.unsubscribeAlive();
        this.stopPolling();
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }
    }

    /**
     * Subscribes to the adapter alive state so the panel reacts immediately when the
     * adapter stops or starts.
     */
    private subscribeAlive(): void {
        const id = `system.adapter.icloud.${this.props.oContext.instance}.alive`;
        this._aliveHandler = (_id: string, state: ioBroker.State | null | undefined): void => {
            const nowAlive = state?.val === true;
            if (!nowAlive) {
                this.setState({ alive: false, mfaRequested: false });
            } else {
                void this.pollMfaStatus();
            }
        };
        void this.props.oContext.socket.subscribeState(id, this._aliveHandler);
    }

    /**
     * Unsubscribes from the adapter alive state.
     */
    private unsubscribeAlive(): void {
        if (this._aliveHandler) {
            const id = `system.adapter.icloud.${this.props.oContext.instance}.alive`;
            this.props.oContext.socket.unsubscribeState(id, this._aliveHandler);
            this._aliveHandler = null;
        }
    }

    /**
     * Stops the periodic status poll timer.
     */
    private stopPolling(): void {
        if (this._pollTimer !== null) {
            window.clearTimeout(this._pollTimer);
            this._pollTimer = null;
        }
    }

    /**
     * Queries the adapter for its current MFA status via `getMfaStatus` sendTo.
     * Because `sendTo` only succeeds when the adapter is running, a successful response
     * implicitly confirms the adapter is alive. Schedules the next poll when done.
     * Returns immediately if a poll is already in flight or the document is hidden.
     */
    private async pollMfaStatus(): Promise<void> {
        if (this._polling || document.hidden) {
            return;
        }
        this._polling = true;
        this.stopPolling();
        let mfaRequested = false;
        let alive = false;
        let securityKeyRequested = false;
        let securityKeySupported = false;
        let securityKeyReason: string | null = null;
        let securityKeyStatus: string | null = null;
        let securityKeyStatusKey: string | null = null;
        let securityKeyStatusDetail: string | null = null;
        let securityKeyRunning = false;
        try {
            const raw: unknown = await this.props.oContext.socket.sendTo(
                `icloud.${this.props.oContext.instance}`,
                'getMfaStatus',
                {},
            );
            const response = raw as
                | {
                      mfaRequested?: boolean;
                      securityKeyRequested?: boolean;
                      securityKeySupported?: boolean;
                      securityKeyReason?: string;
                      securityKeyStatus?: string;
                      securityKeyStatusKey?: string;
                      securityKeyStatusDetail?: string;
                      securityKeyRunning?: boolean;
                  }
                | undefined;
            alive = true;
            mfaRequested = response?.mfaRequested === true;
            securityKeyRequested = response?.securityKeyRequested === true;
            securityKeySupported = response?.securityKeySupported === true;
            securityKeyReason = response?.securityKeyReason ?? null;
            securityKeyStatus = response?.securityKeyStatus ?? null;
            securityKeyStatusKey = response?.securityKeyStatusKey || null;
            securityKeyStatusDetail = response?.securityKeyStatusDetail || null;
            securityKeyRunning = response?.securityKeyRunning === true;
        } catch {
            alive = false;
            mfaRequested = false;
        }

        const changed =
            alive !== this.state.alive ||
            mfaRequested !== this.state.mfaRequested ||
            securityKeyRequested !== this.state.securityKeyRequested ||
            securityKeySupported !== this.state.securityKeySupported ||
            securityKeyReason !== this.state.securityKeyReason ||
            securityKeyStatus !== this.state.securityKeyStatus ||
            securityKeyStatusKey !== this.state.securityKeyStatusKey ||
            securityKeyStatusDetail !== this.state.securityKeyStatusDetail ||
            securityKeyRunning !== this.state.securityKeyRunning;

        if (changed) {
            const update: Partial<SmsMfaPanelState> = {
                alive,
                mfaRequested,
                securityKeyRequested,
                securityKeySupported,
                securityKeyReason,
                securityKeyStatus,
                securityKeyStatusKey,
                securityKeyStatusDetail,
                securityKeyRunning,
            };
            // Clear transient UI state when MFA is no longer needed
            if (!mfaRequested) {
                update.code = '';
                update.error = null;
                update.info = null;
            }
            this.setState(update as SmsMfaPanelState);
        }

        this._polling = false;
        this._pollTimer = window.setTimeout(() => {
            this._pollTimer = null;
            void this.pollMfaStatus();
        }, POLL_INTERVAL_MS);
    }

    /**
     * Sends a `requestSmsMfa` command to the adapter, which triggers an SMS with the
     * 6-digit authentication code to be sent to the user's phone.
     */
    private async handleRequestSms(): Promise<void> {
        this.setState({ smsRequesting: true, error: null, info: null });
        try {
            const raw: unknown = await this.props.oContext.socket.sendTo(
                `icloud.${this.props.oContext.instance}`,
                'requestSmsMfa',
                {},
            );
            const response = raw as { success?: boolean; error?: string } | undefined;
            if (response?.success) {
                this.setState({ info: I18n.t('custom_mfa_sms_sent'), smsRequesting: false });
            } else {
                this.setState({
                    error: response?.error ?? I18n.t('custom_mfa_error_sms_failed'),
                    smsRequesting: false,
                });
            }
        } catch (err) {
            this.setState({
                error: (err as Error)?.message ?? I18n.t('custom_mfa_error_sms_failed'),
                smsRequesting: false,
            });
        }
    }

    /**
     * Submits the entered 6-digit code to the adapter via `submitMfa` sendTo.
     */
    private async handleSubmit(): Promise<void> {
        const { code } = this.state;
        if (!/^\d{6}$/.test(code)) {
            this.setState({ error: I18n.t('custom_mfa_error_invalid') });
            return;
        }
        this.setState({ submitting: true, error: null, info: null });
        try {
            const raw: unknown = await this.props.oContext.socket.sendTo(
                `icloud.${this.props.oContext.instance}`,
                'submitMfa',
                code,
            );
            const response = raw as { success?: boolean; error?: string } | undefined;
            if (response?.success) {
                this.setState({ info: I18n.t('custom_mfa_success'), submitting: false, code: '' });
            } else {
                this.setState({
                    error: response?.error ?? I18n.t('custom_mfa_error_submit_failed'),
                    submitting: false,
                });
            }
        } catch (err) {
            this.setState({
                error: (err as Error)?.message ?? I18n.t('custom_mfa_error_submit_failed'),
                submitting: false,
            });
        }
    }

    /**
     * Starts a security-key (FIDO2) authentication run via the `startSecurityKeyMfa` sendTo.
     * The adapter runs the ceremony in the background; live progress arrives via getMfaStatus polling.
     */
    private async handleStartSecurityKey(): Promise<void> {
        this.setState({ securityKeyStarting: true, error: null, info: null });
        try {
            const raw: unknown = await this.props.oContext.socket.sendTo(
                `icloud.${this.props.oContext.instance}`,
                'startSecurityKeyMfa',
                {},
            );
            const response = raw as { success?: boolean; error?: string } | undefined;
            if (response?.success) {
                this.setState({ securityKeyStarting: false });
            } else {
                this.setState({
                    error: response?.error ?? I18n.t('custom_mfa_sk_error_start'),
                    securityKeyStarting: false,
                });
            }
        } catch (err) {
            this.setState({
                error: (err as Error)?.message ?? I18n.t('custom_mfa_sk_error_start'),
                securityKeyStarting: false,
            });
        }
    }

    /**
     * Resolve the live security-key status to a localized string: prefer the i18n key reported by
     * the adapter (translated here, with the optional detail substituted into `%s`), and fall back
     * to the adapter's plain status text only when no key is present.
     */
    private securityKeyStatusLabel(): string | null {
        const { securityKeyStatusKey, securityKeyStatusDetail, securityKeyStatus } = this.state;
        if (securityKeyStatusKey) {
            return securityKeyStatusDetail
                ? I18n.t(securityKeyStatusKey, securityKeyStatusDetail)
                : I18n.t(securityKeyStatusKey);
        }
        return securityKeyStatus;
    }

    /**
     * Renders the security-key (FIDO2) variant of the MFA panel: either a "login with security key"
     * button + live status (when the host supports it) or a clear "not supported" hint.
     */
    private renderSecurityKey(): React.JSX.Element {
        const { securityKeySupported, securityKeyReason, securityKeyStarting, securityKeyRunning, error } = this.state;
        const securityKeyStatus = this.securityKeyStatusLabel();
        // A detection/sign run is in flight either while the start call is pending (securityKeyStarting)
        // or for the whole background ceremony reported by the adapter (securityKeyRunning).
        const running = securityKeyStarting || securityKeyRunning;

        return (
            <Box
                sx={{
                    mt: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'warning.main',
                    borderRadius: 1,
                    backgroundColor: 'action.hover',
                    width: '100%',
                }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', mb: 1.5 }}
                >
                    <KeyIcon
                        color="warning"
                        fontSize="small"
                    />
                    <Typography
                        variant="subtitle1"
                        color="warning.main"
                        sx={{ fontWeight: 'bold' }}
                    >
                        {I18n.t('custom_mfa_sk_title')}
                    </Typography>
                </Stack>

                <Typography
                    variant="body2"
                    sx={{ mb: 1.5 }}
                >
                    {I18n.t('custom_mfa_sk_description')}
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, whiteSpace: 'pre-line' }}
                >
                    {I18n.t('custom_mfa_sk_help')}
                </Typography>

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 1.5 }}
                        onClose={() => this.setState({ error: null })}
                    >
                        {error}
                    </Alert>
                )}

                {securityKeySupported ? (
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        sx={{ alignItems: { sm: 'center' } }}
                    >
                        <Button
                            variant="contained"
                            color={running ? 'info' : 'warning'}
                            startIcon={
                                running ? (
                                    <CircularProgress
                                        size={16}
                                        color="inherit"
                                    />
                                ) : (
                                    <KeyIcon />
                                )
                            }
                            onClick={() => void this.handleStartSecurityKey()}
                            disabled={running}
                            size="small"
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            {running ? I18n.t('custom_mfa_sk_running') : I18n.t('custom_mfa_sk_button')}
                        </Button>
                        {securityKeyStatus && <Typography variant="body2">{securityKeyStatus}</Typography>}
                    </Stack>
                ) : (
                    <Alert severity="warning">
                        {I18n.t('custom_mfa_sk_unsupported')} {securityKeyReason ?? ''}
                    </Alert>
                )}
            </Box>
        );
    }

    renderItem(): React.JSX.Element {
        const { alive, mfaRequested, code, smsRequesting, submitting, error, info, securityKeyRequested } = this.state;

        if (!alive || !mfaRequested) {
            return <></>;
        }

        // Security-key accounts can't use SMS/codes at all — show the FIDO2 panel instead.
        if (securityKeyRequested) {
            return this.renderSecurityKey();
        }

        const busy = smsRequesting || submitting;

        return (
            <Box
                sx={{
                    mt: 2,
                    p: 2,
                    border: '1px solid',
                    borderColor: 'warning.main',
                    borderRadius: 1,
                    backgroundColor: 'action.hover',
                    width: '100%',
                }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', mb: 1.5 }}
                >
                    <LockIcon
                        color="warning"
                        fontSize="small"
                    />
                    <Typography
                        variant="subtitle1"
                        color="warning.main"
                        sx={{ fontWeight: 'bold' }}
                    >
                        {I18n.t('custom_mfa_title')}
                    </Typography>
                </Stack>

                <Typography
                    variant="body2"
                    sx={{ mb: 2 }}
                >
                    {I18n.t('custom_mfa_description')}
                </Typography>

                {error && (
                    <Alert
                        severity="error"
                        sx={{ mb: 1.5 }}
                        onClose={() => this.setState({ error: null })}
                    >
                        {error}
                    </Alert>
                )}
                {info && (
                    <Alert
                        severity="success"
                        sx={{ mb: 1.5 }}
                        onClose={() => this.setState({ info: null })}
                    >
                        {info}
                    </Alert>
                )}

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ alignItems: { sm: 'center' } }}
                >
                    <Button
                        variant="outlined"
                        color="warning"
                        startIcon={
                            smsRequesting ? (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                />
                            ) : (
                                <SmsIcon />
                            )
                        }
                        onClick={() => void this.handleRequestSms()}
                        disabled={busy}
                        size="small"
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {I18n.t('custom_mfa_request_sms')}
                    </Button>

                    <TextField
                        label={I18n.t('custom_mfa_code_label')}
                        value={code}
                        onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                            this.setState({ code: v, error: null });
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && code.length === 6) {
                                void this.handleSubmit();
                            }
                        }}
                        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6, pattern: '[0-9]*' } }}
                        size="small"
                        disabled={busy}
                        sx={{ width: 140 }}
                        error={Boolean(error && code.length > 0 && code.length < 6)}
                    />

                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={
                            submitting ? (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                />
                            ) : (
                                <SendIcon />
                            )
                        }
                        onClick={() => void this.handleSubmit()}
                        disabled={busy || code.length !== 6}
                        size="small"
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {I18n.t('custom_mfa_submit')}
                    </Button>
                </Stack>
            </Box>
        );
    }
}

export default SmsMfaPanel;
