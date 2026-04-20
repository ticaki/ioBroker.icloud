import React from 'react';
import {
    Box,
    Checkbox,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Tooltip,
    Typography,
    Paper,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';
import { I18n } from '@iobroker/adapter-react-v5';

interface DeviceInfo {
    id: string;
    name: string;
    model: string;
    batteryLevel: number;
    distanceKm: number | null;
    owner: string | null;
}

type SortColumn = 'active' | 'name' | 'owner' | 'distance';
type SortDir = 'asc' | 'desc';

interface FindMyDevicesState extends ConfigGenericState {
    alive: boolean;
    devices: DeviceInfo[];
    loading: boolean;
    refreshing: boolean;
    disabledDevices: string[];
    sortColumn: SortColumn | null;
    sortDir: SortDir | null;
}

const POLL_INITIAL_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 10_000;
const POLL_DURATION_MS = 60_000;

class FindMyDevices extends ConfigGeneric<ConfigGenericProps, FindMyDevicesState> {
    private _pollTimer: number | null = null;
    private _pollStartTime = 0;
    private _aliveHandler: ioBroker.StateChangeHandler | null = null;

    constructor(props: ConfigGenericProps) {
        super(props);
        Object.assign(this.state, {
            alive: false,
            devices: [],
            loading: true,
            refreshing: false,
            disabledDevices: (props.data?.findMyDisabledDevices as string[]) ?? [],
            sortColumn: null,
            sortDir: null,
        });
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.fetchDevices();
        this.startPolling();
        this.subscribeAlive();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.stopPolling();
        this.unsubscribeAlive();
    }

    componentDidUpdate(prevProps: ConfigGenericProps): void {
        const prev = prevProps.data?.findMyDisabledDevices as string[] | undefined;
        const curr = this.props.data?.findMyDisabledDevices as string[] | undefined;
        if (JSON.stringify(prev) !== JSON.stringify(curr)) {
            this.setState({ disabledDevices: curr ?? [] });
        }
    }

    private subscribeAlive(): void {
        const id = `system.adapter.icloud.${this.props.oContext.instance}.alive`;
        this._aliveHandler = (_id: string, state: ioBroker.State | null | undefined): void => {
            if (state?.val === true) {
                void this.fetchDevicesAndUpdate();
            }
        };
        void this.props.oContext.socket.subscribeState(id, this._aliveHandler);
    }

    private unsubscribeAlive(): void {
        if (this._aliveHandler) {
            const id = `system.adapter.icloud.${this.props.oContext.instance}.alive`;
            this.props.oContext.socket.unsubscribeState(id, this._aliveHandler);
            this._aliveHandler = null;
        }
    }

    private startPolling(): void {
        this._pollStartTime = Date.now();
        this.schedulePoll(POLL_INITIAL_DELAY_MS);
    }

    private schedulePoll(delayMs: number): void {
        this._pollTimer = window.setTimeout(() => {
            this._pollTimer = null;
            void this.fetchDevicesAndUpdate().then(() => {
                if (Date.now() - this._pollStartTime < POLL_DURATION_MS) {
                    this.schedulePoll(POLL_INTERVAL_MS);
                }
            });
        }, delayMs);
    }

    private stopPolling(): void {
        if (this._pollTimer !== null) {
            window.clearTimeout(this._pollTimer);
            this._pollTimer = null;
        }
    }

    private async fetchDevicesAndUpdate(): Promise<void> {
        let response: { alive: boolean; devices: DeviceInfo[] } | undefined;
        try {
            const raw: unknown = await this.props.oContext.socket.sendTo(
                `icloud.${this.props.oContext.instance}`,
                'getDevices',
                {},
            );
            response = raw as { alive: boolean; devices: DeviceInfo[] };
        } catch {
            return;
        }

        const newAlive = response?.alive ?? false;
        const newDevices = response?.devices ?? [];

        const aliveChanged = newAlive !== this.state.alive;
        const devicesChanged = JSON.stringify(newDevices) !== JSON.stringify(this.state.devices);
        if (aliveChanged || devicesChanged) {
            this.setState({ alive: newAlive, devices: newDevices });
        }
    }

    fetchDevices(): void {
        this.setState({ loading: true });
        const timeout = window.setTimeout(() => {
            this.setState({ alive: false, devices: [], loading: false });
        }, 10_000);
        void this.props.oContext.socket
            .sendTo(`icloud.${this.props.oContext.instance}`, 'getDevices', {})
            .then((response: { alive: boolean; devices: DeviceInfo[] }) => {
                window.clearTimeout(timeout);
                this.setState({
                    alive: response?.alive ?? false,
                    devices: response?.devices ?? [],
                    loading: false,
                });
            })
            .catch(() => {
                window.clearTimeout(timeout);
                this.setState({ alive: false, devices: [], loading: false });
            });
    }

    toggleDevice(deviceId: string, enabled: boolean): void {
        const disabled = [...this.state.disabledDevices];
        if (enabled) {
            const idx = disabled.indexOf(deviceId);
            if (idx >= 0) {
                disabled.splice(idx, 1);
            }
        } else {
            if (!disabled.includes(deviceId)) {
                disabled.push(deviceId);
            }
        }
        this.setState({ disabledDevices: disabled });
        this.props.onChange({ ...this.props.data, findMyDisabledDevices: disabled });
    }

    handleSort(column: SortColumn): void {
        this.setState(prev => {
            if (prev.sortColumn !== column) {
                return { sortColumn: column, sortDir: 'asc' };
            }
            if (prev.sortDir === 'asc') {
                return { sortColumn: column, sortDir: 'desc' };
            }
            return { sortColumn: null, sortDir: null };
        });
    }

    getSortedDevices(): DeviceInfo[] {
        const sorted = [...this.state.devices];
        const { sortColumn, sortDir } = this.state;
        if (!sortColumn || !sortDir) {
            return sorted;
        }
        const dir = sortDir === 'asc' ? 1 : -1;
        sorted.sort((a, b) => {
            switch (sortColumn) {
                case 'active': {
                    const aVal = this.state.disabledDevices.includes(a.id) ? 1 : 0;
                    const bVal = this.state.disabledDevices.includes(b.id) ? 1 : 0;
                    return (aVal - bVal) * dir;
                }
                case 'name':
                    return a.name.localeCompare(b.name) * dir;
                case 'owner': {
                    const aOwner = a.owner ?? I18n.t('custom_findmy_owner_me');
                    const bOwner = b.owner ?? I18n.t('custom_findmy_owner_me');
                    return aOwner.localeCompare(bOwner) * dir;
                }
                case 'distance': {
                    const aD = a.distanceKm ?? Infinity;
                    const bD = b.distanceKm ?? Infinity;
                    return (aD - bD) * dir;
                }
                default:
                    return 0;
            }
        });
        return sorted;
    }

    handleRefreshNow(): void {
        if (this.state.refreshing) {
            return;
        }
        this.setState({ refreshing: true });
        const stateId = `icloud.${this.props.oContext.instance}.findme.refresh`;
        void this.props.oContext.socket
            .setState(stateId, { val: true, ack: false })
            .then(() => {
                // Give the adapter a moment to start the refresh, then poll
                window.setTimeout(() => {
                    this.setState({ refreshing: false });
                    void this.fetchDevicesAndUpdate();
                }, 1000);
            })
            .catch(() => {
                this.setState({ refreshing: false });
            });
    }

    renderItem(): React.JSX.Element {
        if (this.state.loading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (!this.state.alive) {
            return (
                <Box sx={{ p: 2 }}>
                    <Typography color="warning.main">{I18n.t('custom_findmy_not_connected')}</Typography>
                </Box>
            );
        }

        if (this.state.devices.length === 0) {
            return (
                <Box sx={{ p: 2 }}>
                    <Typography color="text.secondary">{I18n.t('custom_findmy_no_devices')}</Typography>
                </Box>
            );
        }

        const { sortColumn, sortDir } = this.state;
        const devices = this.getSortedDevices();

        return (
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                    <Tooltip title={I18n.t('custom_findmy_refresh')}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => this.handleRefreshNow()}
                                disabled={this.state.refreshing}
                            >
                                {this.state.refreshing ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
                <TableContainer
                    component={Paper}
                    sx={{ maxHeight: 500 }}
                >
                    <Table
                        stickyHeader
                        size="small"
                    >
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <TableSortLabel
                                    active={sortColumn === 'active'}
                                    direction={sortColumn === 'active' ? (sortDir ?? 'asc') : 'asc'}
                                    onClick={() => this.handleSort('active')}
                                >
                                    {I18n.t('custom_findmy_active')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === 'name'}
                                    direction={sortColumn === 'name' ? (sortDir ?? 'asc') : 'asc'}
                                    onClick={() => this.handleSort('name')}
                                >
                                    {I18n.t('custom_findmy_device_name')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel
                                    active={sortColumn === 'owner'}
                                    direction={sortColumn === 'owner' ? (sortDir ?? 'asc') : 'asc'}
                                    onClick={() => this.handleSort('owner')}
                                >
                                    {I18n.t('custom_findmy_owner')}
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={sortColumn === 'distance'}
                                    direction={sortColumn === 'distance' ? (sortDir ?? 'asc') : 'asc'}
                                    onClick={() => this.handleSort('distance')}
                                >
                                    {I18n.t('custom_findmy_distance')}
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {devices.map(device => {
                            const isEnabled = !this.state.disabledDevices.includes(device.id);
                            return (
                                <TableRow
                                    key={device.id}
                                    hover
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={isEnabled}
                                            onChange={(_e, checked) => this.toggleDevice(device.id, checked)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            fontWeight="medium"
                                        >
                                            {device.name}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {device.model}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {device.owner ?? I18n.t('custom_findmy_owner_me')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2">
                                            {device.distanceKm != null ? `${device.distanceKm.toFixed(1)} km` : '—'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            </Box>
        );
    }
}

export default FindMyDevices;
