import React from 'react';
import {
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    Link,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    ArrowBack as ArrowBackIcon,
    CloudUpload as CloudUploadIcon,
    CreateNewFolder as CreateNewFolderIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Error as ErrorIcon,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Refresh as RefreshIcon,
    Save as SaveIcon,
    Storage as StorageIcon,
    Sync as SyncIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';
import { I18n } from '@iobroker/adapter-react-v5';

// ── Types ────────────────────────────────────────────────────────────────────

interface DriveSyncEntry {
    id: string;
    enabled: boolean;
    type: 'backitup' | 'directory';
    localPath: string;
    icloudFolder: string;
    maxSizeMB: number;
    maxFiles: number;
    conflictResolution: 'ask' | 'overwrite-remote' | 'skip' | 'keep-both';
}

interface DriveSyncConflict {
    entryId: string;
    fileName: string;
    localModified: number;
    remoteModified: number;
    localSize: number;
    remoteSize: number;
}

interface DriveSyncStatus {
    entries: Array<{
        id: string;
        lastSync: number;
        lastError: string;
        filesSynced: number;
        totalSizeMB: number;
        remoteFileCount?: number;
        remoteTotalSizeMB?: number;
    }>;
    conflicts: DriveSyncConflict[];
}

interface BackitupInstance {
    instance: string;
    cifsEnabled: boolean;
    cifsConnType: string;
    cifsPath: string;
}

interface BackitupInfo {
    installed: boolean;
    instances: BackitupInstance[];
}

interface DriveFolderItem {
    name: string;
    type: 'FILE' | 'FOLDER';
    drivewsid: string;
}

// ── State ────────────────────────────────────────────────────────────────────

interface DriveSyncState extends ConfigGenericState {
    alive: boolean;
    loading: boolean;
    entries: DriveSyncEntry[];
    backitupInfo: BackitupInfo | null;
    syncStatus: DriveSyncStatus | null;
    // folder browser
    browseDialogOpen: boolean;
    browseEntryId: string;
    browsePath: string[];
    browseItems: DriveFolderItem[];
    browseLoading: boolean;
    // local folder browser
    localBrowseDialogOpen: boolean;
    localBrowseCurrentPath: string;
    localBrowseItems: { name: string; path: string }[];
    localBrowseLoading: boolean;
    // create folder
    createFolderName: string;
    createFolderOpen: boolean;
    // edit entry
    editDialogOpen: boolean;
    editEntry: DriveSyncEntry | null;
    editIsNew: boolean;
    // conflict resolution
    conflictDialogOpen: boolean;
    conflictEntry: DriveSyncConflict | null;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

function newEntry(type: 'backitup' | 'directory', localPath = ''): DriveSyncEntry {
    return {
        id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        enabled: true,
        type,
        localPath,
        icloudFolder: '',
        maxSizeMB: type === 'backitup' ? 500 : 0,
        maxFiles: type === 'backitup' ? 10 : 0,
        conflictResolution: 'ask',
    };
}

// ── Component ────────────────────────────────────────────────────────────────

class DriveSync extends ConfigGeneric<ConfigGenericProps, DriveSyncState> {
    private _aliveHandler: ioBroker.StateChangeHandler | null = null;

    constructor(props: ConfigGenericProps) {
        super(props);
        let entries: DriveSyncEntry[] = [];
        try {
            const raw = props.data?.driveSyncConfig;
            if (typeof raw === 'string' && raw) {
                entries = JSON.parse(raw) as DriveSyncEntry[];
            }
        } catch {
            // ignore parse errors
        }
        Object.assign(this.state, {
            alive: false,
            loading: true,
            entries,
            backitupInfo: null,
            syncStatus: null,
            browseDialogOpen: false,
            browseEntryId: '',
            browsePath: [],
            browseItems: [],
            browseLoading: false,
            localBrowseDialogOpen: false,
            localBrowseCurrentPath: '/',
            localBrowseItems: [],
            localBrowseLoading: false,
            createFolderName: '',
            createFolderOpen: false,
            editDialogOpen: false,
            editEntry: null,
            editIsNew: false,
            conflictDialogOpen: false,
            conflictEntry: null,
        });
    }

    componentDidMount(): void {
        super.componentDidMount();
        this.subscribeAlive();
        void this.loadInitialData();
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.unsubscribeAlive();
    }

    componentDidUpdate(prevProps: ConfigGenericProps): void {
        const prev = prevProps.data?.driveSyncConfig as string | undefined;
        const curr = this.props.data?.driveSyncConfig as string | undefined;
        if (prev !== curr) {
            try {
                const entries = curr ? (JSON.parse(curr) as DriveSyncEntry[]) : [];
                this.setState({ entries });
            } catch {
                // ignore
            }
        }
    }

    // ── Alive subscription ───────────────────────────────────────────────

    private subscribeAlive(): void {
        const id = `system.adapter.icloud.${this.props.oContext.instance}.alive`;
        this._aliveHandler = (_id: string, state: ioBroker.State | null | undefined): void => {
            const isAlive = !!state?.val;
            if (isAlive !== this.state.alive) {
                this.setState({ alive: isAlive });
                if (isAlive) {
                    void this.loadInitialData();
                }
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

    // ── Data loading ─────────────────────────────────────────────────────

    private async loadInitialData(): Promise<void> {
        this.setState({ loading: true });
        try {
            const [backitupInfo, syncStatus] = await Promise.all([
                this.sendCommand<BackitupInfo>('driveSyncGetBackitupInfo', {}),
                this.sendCommand<DriveSyncStatus>('driveSyncGetStatus', {}),
            ]);
            this.setState({
                alive: true,
                loading: false,
                backitupInfo: backitupInfo ?? null,
                syncStatus: syncStatus ?? null,
            });
        } catch {
            this.setState({ loading: false });
        }
    }

    private async sendCommand<T>(command: string, data: Record<string, unknown>): Promise<T | null> {
        try {
            const result = await this.props.oContext.socket.sendTo(
                `icloud.${this.props.oContext.instance}`,
                command,
                data,
            );
            if (result?.success) {
                return result as unknown as T;
            }
            return null;
        } catch {
            return null;
        }
    }

    // ── Config persistence ───────────────────────────────────────────────

    private saveEntries(entries: DriveSyncEntry[]): void {
        this.setState({ entries });
        this.props.onChange({ ...this.props.data, driveSyncConfig: JSON.stringify(entries) });
    }

    // ── Entry CRUD ───────────────────────────────────────────────────────

    private openAddEntry(type: 'backitup' | 'directory'): void {
        let localPath = '';
        if (type === 'backitup') {
            const usable = (this.state.backitupInfo?.instances ?? []).filter(
                i => i.cifsEnabled && i.cifsConnType === 'Copy',
            );
            if (usable.length === 1) {
                localPath = usable[0].cifsPath;
            }
        }
        const entry = newEntry(type, localPath);
        this.setState({ editDialogOpen: true, editEntry: entry, editIsNew: true });
    }

    private openEditEntry(entry: DriveSyncEntry): void {
        this.setState({ editDialogOpen: true, editEntry: { ...entry }, editIsNew: false });
    }

    private saveEditEntry(): void {
        const { editEntry, editIsNew, entries } = this.state;
        if (!editEntry || !editEntry.icloudFolder) {
            return;
        }
        let updated: DriveSyncEntry[];
        if (editIsNew) {
            updated = [...entries, editEntry];
        } else {
            updated = entries.map(e => (e.id === editEntry.id ? editEntry : e));
        }
        this.saveEntries(updated);
        this.setState({ editDialogOpen: false, editEntry: null });
    }

    private deleteEntry(id: string): void {
        this.saveEntries(this.state.entries.filter(e => e.id !== id));
    }

    private toggleEntry(id: string): void {
        this.saveEntries(this.state.entries.map(e => (e.id === id ? { ...e, enabled: !e.enabled } : e)));
    }

    private openLocalFolderBrowser(): void {
        const { editEntry } = this.state;
        const startPath = editEntry?.localPath && editEntry.localPath.startsWith('/') ? editEntry.localPath : '/';
        this.setState({
            localBrowseDialogOpen: true,
            localBrowseCurrentPath: startPath,
            localBrowseItems: [],
        });
        void this.browseLocalFolder(startPath);
    }

    private async browseLocalFolder(folderPath: string): Promise<void> {
        this.setState({ localBrowseLoading: true });
        try {
            const result = await this.props.oContext.socket.sendTo(
                `icloud.${this.props.oContext.instance}`,
                'listLocalFolder',
                { path: folderPath },
            );
            if (result?.success) {
                this.setState({
                    localBrowseCurrentPath: result.path as string,
                    localBrowseItems: (result.entries as { name: string; path: string }[]) ?? [],
                    localBrowseLoading: false,
                });
            } else {
                this.setState({ localBrowseItems: [], localBrowseLoading: false });
            }
        } catch {
            this.setState({ localBrowseItems: [], localBrowseLoading: false });
        }
    }

    private selectLocalFolder(): void {
        const { localBrowseCurrentPath, editEntry } = this.state;
        if (editEntry) {
            this.setState({
                editEntry: { ...editEntry, localPath: localBrowseCurrentPath },
                localBrowseDialogOpen: false,
            });
        }
    }

    private openFolderBrowser(entryId: string): void {
        this.setState({
            browseDialogOpen: true,
            browseEntryId: entryId,
            browsePath: [],
            browseItems: [],
        });
        void this.browseDriveFolder('');
    }

    private async browseDriveFolder(path: string): Promise<void> {
        this.setState({ browseLoading: true });
        try {
            const result = await this.props.oContext.socket.sendTo(
                `icloud.${this.props.oContext.instance}`,
                'driveListFolder',
                { path: path || undefined },
            );
            if (result?.success && result.items) {
                const folders = (result.items as DriveFolderItem[]).filter(i => i.type === 'FOLDER');
                this.setState({ browseItems: folders, browseLoading: false });
            } else {
                this.setState({ browseItems: [], browseLoading: false });
            }
        } catch {
            this.setState({ browseItems: [], browseLoading: false });
        }
    }

    private navigateToFolder(folderName: string): void {
        const newPath = [...this.state.browsePath, folderName];
        this.setState({ browsePath: newPath });
        void this.browseDriveFolder(newPath.join('/'));
    }

    private navigateUp(): void {
        const newPath = this.state.browsePath.slice(0, -1);
        this.setState({ browsePath: newPath });
        void this.browseDriveFolder(newPath.join('/'));
    }

    private navigateToBreadcrumb(index: number): void {
        const newPath = this.state.browsePath.slice(0, index + 1);
        this.setState({ browsePath: newPath });
        void this.browseDriveFolder(newPath.join('/'));
    }

    private selectCurrentFolder(): void {
        const selectedPath = this.state.browsePath.join('/') || '/';
        const { editEntry } = this.state;
        if (editEntry) {
            this.setState({
                editEntry: { ...editEntry, icloudFolder: selectedPath },
                browseDialogOpen: false,
            });
        }
    }

    private async createFolderInBrowser(): Promise<void> {
        const { createFolderName, browsePath } = this.state;
        if (!createFolderName.trim()) {
            return;
        }
        const parentPath = browsePath.join('/') || undefined;
        try {
            await this.props.oContext.socket.sendTo(`icloud.${this.props.oContext.instance}`, 'driveCreateFolder', {
                name: createFolderName.trim(),
                parentPath,
            });
            // Navigate into the newly created folder
            const newPath = [...browsePath, createFolderName.trim()];
            this.setState({ createFolderOpen: false, createFolderName: '', browsePath: newPath });
            void this.browseDriveFolder(newPath.join('/'));
        } catch {
            // ignore
        }
    }

    // ── Conflict resolution ──────────────────────────────────────────────

    private openConflictDialog(conflict: DriveSyncConflict): void {
        this.setState({ conflictDialogOpen: true, conflictEntry: conflict });
    }

    private async resolveConflict(action: 'overwrite-remote' | 'keep-both' | 'skip'): Promise<void> {
        const { conflictEntry } = this.state;
        if (!conflictEntry) {
            return;
        }
        await this.sendCommand('driveSyncResolveConflict', {
            entryId: conflictEntry.entryId,
            fileName: conflictEntry.fileName,
            action,
        });
        this.setState({ conflictDialogOpen: false, conflictEntry: null });
        // Refresh status
        const syncStatus = await this.sendCommand<DriveSyncStatus>('driveSyncGetStatus', {});
        if (syncStatus) {
            this.setState({ syncStatus });
        }
    }

    // ── Rendering ────────────────────────────────────────────────────────

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
                    <Alert severity="warning">{I18n.t('custom_drivesync_not_connected')}</Alert>
                </Box>
            );
        }

        const { entries, backitupInfo, syncStatus } = this.state;
        const conflicts = syncStatus?.conflicts ?? [];
        const instances = backitupInfo?.instances ?? [];
        const usableInstances = instances.filter(i => i.cifsEnabled && i.cifsConnType === 'Copy');
        const hasBackitup = usableInstances.length > 0;
        const hasBackitupEntry = entries.some(e => e.type === 'backitup');

        return (
            <Box sx={{ p: 1 }}>
                {/* Conflict banner */}
                {conflicts.length > 0 && (
                    <Alert
                        severity="error"
                        icon={<ErrorIcon />}
                        sx={{ mb: 2 }}
                    >
                        <Typography variant="body2">
                            {I18n.t('custom_drivesync_conflicts_found').replace('%s', String(conflicts.length))}
                        </Typography>
                        {conflicts.map((c, i) => (
                            <Chip
                                key={i}
                                label={c.fileName}
                                color="error"
                                variant="outlined"
                                size="small"
                                onClick={() => this.openConflictDialog(c)}
                                sx={{ mr: 0.5, mt: 0.5, cursor: 'pointer' }}
                            />
                        ))}
                    </Alert>
                )}

                {/* BackItUp info */}
                {backitupInfo && !backitupInfo.installed && (
                    <Alert
                        severity="info"
                        sx={{ mb: 2 }}
                    >
                        {I18n.t('custom_drivesync_backitup_not_installed')}
                    </Alert>
                )}
                {backitupInfo && backitupInfo.installed && usableInstances.length === 0 && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 2 }}
                    >
                        {I18n.t('custom_drivesync_backitup_no_usable')}
                    </Alert>
                )}

                {/* Action buttons */}
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ mb: 2 }}
                >
                    {hasBackitup && !hasBackitupEntry && (
                        <Button
                            variant="contained"
                            startIcon={<StorageIcon />}
                            onClick={() => this.openAddEntry('backitup')}
                        >
                            {I18n.t('custom_drivesync_add_backup')}
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => this.openAddEntry('directory')}
                    >
                        {I18n.t('custom_drivesync_add_directory')}
                    </Button>
                </Stack>

                {/* Entries list */}
                {entries.length === 0 ? (
                    <Alert severity="info">{I18n.t('custom_drivesync_no_entries')}</Alert>
                ) : (
                    <Stack spacing={1}>
                        {entries.map(entry => this.renderEntry(entry, syncStatus, conflicts, usableInstances))}
                    </Stack>
                )}

                {/* Dialogs */}
                {this.renderEditDialog()}
                {this.renderLocalBrowseDialog()}
                {this.renderBrowseDialog()}
                {this.renderConflictDialog()}
            </Box>
        );
    }

    private renderEntry(
        entry: DriveSyncEntry,
        syncStatus: DriveSyncStatus | null,
        conflicts: DriveSyncConflict[],
        usableInstances: BackitupInstance[],
    ): React.JSX.Element {
        const status = syncStatus?.entries?.find(s => s.id === entry.id);
        const entryConflicts = conflicts.filter(c => c.entryId === entry.id);
        const hasConflict = entryConflicts.length > 0;
        const hasError = !!status?.lastError;
        const matchedInstances =
            entry.type === 'backitup' ? usableInstances.filter(i => i.cifsPath === entry.localPath) : [];

        return (
            <Card
                key={entry.id}
                variant="outlined"
                sx={{
                    opacity: entry.enabled ? 1 : 0.5,
                    borderColor: hasConflict ? 'error.main' : hasError ? 'warning.main' : undefined,
                }}
            >
                <CardContent sx={{ pb: '8px !important', pt: 1 }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                    >
                        {entry.type === 'backitup' ? <StorageIcon color="primary" /> : <FolderIcon color="action" />}
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2">
                                {entry.type === 'backitup'
                                    ? I18n.t('custom_drivesync_type_backup')
                                    : I18n.t('custom_drivesync_type_directory')}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                {entry.localPath} → {entry.icloudFolder}
                            </Typography>
                            {entry.type === 'backitup' &&
                                (matchedInstances.length > 0 ? (
                                    <Stack
                                        direction="row"
                                        spacing={0.5}
                                        sx={{ mt: 0.25, flexWrap: 'wrap' }}
                                    >
                                        {matchedInstances.map(i => (
                                            <Chip
                                                key={i.instance}
                                                label={i.instance}
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography
                                        variant="caption"
                                        color="error.main"
                                    >
                                        {I18n.t('custom_drivesync_backitup_no_match')}
                                    </Typography>
                                ))}
                        </Box>
                        {hasConflict && (
                            <Tooltip title={I18n.t('custom_drivesync_has_conflict')}>
                                <ErrorIcon color="error" />
                            </Tooltip>
                        )}
                        {hasError && !hasConflict && (
                            <Tooltip title={status?.lastError ?? ''}>
                                <WarningIcon color="warning" />
                            </Tooltip>
                        )}
                        {entry.type === 'backitup' && (
                            <Chip
                                size="small"
                                label={`${entry.maxFiles > 0 ? `${entry.maxFiles} files` : '∞'} / ${entry.maxSizeMB > 0 ? `${entry.maxSizeMB} MB` : '∞'}`}
                            />
                        )}
                        <Tooltip
                            title={
                                entry.enabled ? I18n.t('custom_drivesync_disable') : I18n.t('custom_drivesync_enable')
                            }
                        >
                            <IconButton
                                size="small"
                                onClick={() => this.toggleEntry(entry.id)}
                            >
                                <SyncIcon color={entry.enabled ? 'primary' : 'disabled'} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={I18n.t('custom_drivesync_edit')}>
                            <IconButton
                                size="small"
                                onClick={() => this.openEditEntry(entry)}
                            >
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={I18n.t('custom_drivesync_delete')}>
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => this.deleteEntry(entry.id)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    {status && status.lastSync > 0 && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            {I18n.t('custom_drivesync_last_sync')}: {new Date(status.lastSync).toLocaleString()}
                            {status.remoteFileCount != null && (
                                <>
                                    {' — '}
                                    {I18n.t('custom_drivesync_remote_files')}: {status.remoteFileCount}{' '}
                                    {I18n.t('custom_drivesync_files')}, {(status.remoteTotalSizeMB ?? 0).toFixed(1)} MB
                                </>
                            )}
                        </Typography>
                    )}
                </CardContent>
            </Card>
        );
    }

    // ── Edit dialog ──────────────────────────────────────────────────────

    private renderEditDialog(): React.JSX.Element | null {
        const { editDialogOpen, editEntry, editIsNew, backitupInfo } = this.state;
        if (!editDialogOpen || !editEntry) {
            return null;
        }

        const isBackitup = editEntry.type === 'backitup';
        const usableInstances = isBackitup
            ? (backitupInfo?.instances ?? []).filter(i => i.cifsEnabled && i.cifsConnType === 'Copy')
            : [];
        const matchedInstance = usableInstances.find(i => i.cifsPath === editEntry.localPath);
        const title = editIsNew
            ? isBackitup
                ? I18n.t('custom_drivesync_add_backup')
                : I18n.t('custom_drivesync_add_directory')
            : I18n.t('custom_drivesync_edit_entry');

        return (
            <Dialog
                open
                onClose={() => this.setState({ editDialogOpen: false })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <Stack
                        spacing={2}
                        sx={{ mt: 1 }}
                    >
                        {/* BackItUp instance selector */}
                        {isBackitup && (
                            <FormControl
                                fullWidth
                                size="small"
                                error={!matchedInstance}
                            >
                                <InputLabel>{I18n.t('custom_drivesync_backitup_select')}</InputLabel>
                                <Select
                                    value={matchedInstance?.instance ?? ''}
                                    label={I18n.t('custom_drivesync_backitup_select')}
                                    onChange={e => {
                                        const inst = usableInstances.find(i => i.instance === e.target.value);
                                        if (inst) {
                                            this.setState({
                                                editEntry: { ...editEntry, localPath: inst.cifsPath },
                                            });
                                        }
                                    }}
                                >
                                    {usableInstances.map(inst => (
                                        <MenuItem
                                            key={inst.instance}
                                            value={inst.instance}
                                        >
                                            {inst.instance} — {inst.cifsPath || '?'}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {!matchedInstance && (
                                    <Typography
                                        variant="caption"
                                        color="error.main"
                                        sx={{ mt: 0.5 }}
                                    >
                                        {usableInstances.length === 0
                                            ? I18n.t('custom_drivesync_backitup_no_usable')
                                            : I18n.t('custom_drivesync_backitup_no_match')}
                                    </Typography>
                                )}
                            </FormControl>
                        )}

                        {/* Local path */}
                        {isBackitup ? (
                            <TextField
                                label={I18n.t('custom_drivesync_local_path')}
                                value={editEntry.localPath}
                                onChange={e =>
                                    this.setState({
                                        editEntry: { ...editEntry, localPath: e.target.value },
                                    })
                                }
                                fullWidth
                                slotProps={{ input: { readOnly: true } }}
                                helperText={I18n.t('custom_drivesync_backitup_path_hint')}
                            />
                        ) : (
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="flex-end"
                            >
                                <TextField
                                    label={I18n.t('custom_drivesync_local_path')}
                                    value={editEntry.localPath}
                                    onChange={e =>
                                        this.setState({
                                            editEntry: { ...editEntry, localPath: e.target.value },
                                        })
                                    }
                                    fullWidth
                                    helperText={I18n.t('custom_drivesync_local_path_hint')}
                                />
                                <Button
                                    variant="outlined"
                                    onClick={() => this.openLocalFolderBrowser()}
                                    startIcon={<FolderOpenIcon />}
                                    sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
                                >
                                    {I18n.t('custom_drivesync_browse')}
                                </Button>
                            </Stack>
                        )}

                        {/* iCloud folder */}
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="flex-end"
                        >
                            <TextField
                                label={I18n.t('custom_drivesync_icloud_folder')}
                                value={editEntry.icloudFolder}
                                onChange={e =>
                                    this.setState({
                                        editEntry: { ...editEntry, icloudFolder: e.target.value },
                                    })
                                }
                                fullWidth
                                helperText={I18n.t('custom_drivesync_icloud_folder_hint')}
                            />
                            <Button
                                variant="outlined"
                                onClick={() => this.openFolderBrowser(editEntry.id)}
                                startIcon={<FolderOpenIcon />}
                                sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
                            >
                                {I18n.t('custom_drivesync_browse')}
                            </Button>
                        </Stack>

                        {/* Backup-specific limits */}
                        <Collapse in={isBackitup}>
                            <Stack spacing={2}>
                                <Divider />
                                <Typography variant="subtitle2">{I18n.t('custom_drivesync_limits_header')}</Typography>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                >
                                    <TextField
                                        label={I18n.t('custom_drivesync_max_files')}
                                        type="number"
                                        value={editEntry.maxFiles}
                                        onChange={e =>
                                            this.setState({
                                                editEntry: {
                                                    ...editEntry,
                                                    maxFiles: Math.max(0, parseInt(e.target.value) || 0),
                                                },
                                            })
                                        }
                                        fullWidth
                                        helperText={I18n.t('custom_drivesync_max_files_hint')}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                    />
                                    <TextField
                                        label={I18n.t('custom_drivesync_max_size')}
                                        type="number"
                                        value={editEntry.maxSizeMB}
                                        onChange={e =>
                                            this.setState({
                                                editEntry: {
                                                    ...editEntry,
                                                    maxSizeMB: Math.max(0, parseInt(e.target.value) || 0),
                                                },
                                            })
                                        }
                                        fullWidth
                                        helperText={I18n.t('custom_drivesync_max_size_hint')}
                                        slotProps={{ htmlInput: { min: 0 } }}
                                    />
                                </Stack>
                            </Stack>
                        </Collapse>

                        {/* Conflict resolution */}
                        <FormControl fullWidth>
                            <InputLabel>{I18n.t('custom_drivesync_conflict_resolution')}</InputLabel>
                            <Select
                                value={editEntry.conflictResolution}
                                label={I18n.t('custom_drivesync_conflict_resolution')}
                                onChange={e =>
                                    this.setState({
                                        editEntry: {
                                            ...editEntry,
                                            conflictResolution: e.target.value as DriveSyncEntry['conflictResolution'],
                                        },
                                    })
                                }
                            >
                                <MenuItem value="ask">{I18n.t('custom_drivesync_conflict_ask')}</MenuItem>
                                <MenuItem value="overwrite-remote">
                                    {I18n.t('custom_drivesync_conflict_overwrite_remote')}
                                </MenuItem>
                                <MenuItem value="skip">{I18n.t('custom_drivesync_conflict_skip')}</MenuItem>
                                <MenuItem value="keep-both">{I18n.t('custom_drivesync_conflict_keep_both')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.setState({ editDialogOpen: false })}>
                        {I18n.t('custom_drivesync_cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => this.saveEditEntry()}
                        disabled={!editEntry.icloudFolder || (!isBackitup && !editEntry.localPath)}
                        startIcon={<SaveIcon />}
                    >
                        {I18n.t('custom_drivesync_save')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    // ── Local Browse dialog ──────────────────────────────────────────────

    private renderLocalBrowseDialog(): React.JSX.Element | null {
        const { localBrowseDialogOpen, localBrowseCurrentPath, localBrowseItems, localBrowseLoading } = this.state;
        if (!localBrowseDialogOpen) {
            return null;
        }

        const pathParts = localBrowseCurrentPath.split('/').filter(Boolean);

        return (
            <Dialog
                open
                onClose={() => this.setState({ localBrowseDialogOpen: false })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                    >
                        <FolderIcon />
                        <Typography variant="h6">{I18n.t('custom_drivesync_select_local_folder')}</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    {/* Breadcrumb */}
                    <Breadcrumbs sx={{ mb: 1 }}>
                        <Link
                            component="button"
                            underline="hover"
                            onClick={() => void this.browseLocalFolder('/')}
                        >
                            /
                        </Link>
                        {pathParts.map((part, idx) => {
                            const fullPath = `/${pathParts.slice(0, idx + 1).join('/')}`;
                            const isLast = idx === pathParts.length - 1;
                            return isLast ? (
                                <Typography
                                    key={idx}
                                    color="text.primary"
                                >
                                    {part}
                                </Typography>
                            ) : (
                                <Link
                                    key={idx}
                                    component="button"
                                    underline="hover"
                                    onClick={() => void this.browseLocalFolder(fullPath)}
                                >
                                    {part}
                                </Link>
                            );
                        })}
                    </Breadcrumbs>
                    {/* Go up */}
                    {localBrowseCurrentPath !== '/' && (
                        <ListItemButton
                            onClick={() => {
                                const parent =
                                    localBrowseCurrentPath.substring(0, localBrowseCurrentPath.lastIndexOf('/')) || '/';
                                void this.browseLocalFolder(parent);
                            }}
                            dense
                        >
                            <ListItemIcon>
                                <ArrowBackIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary=".." />
                        </ListItemButton>
                    )}
                    {localBrowseLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : localBrowseItems.length === 0 ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ p: 1 }}
                        >
                            {I18n.t('custom_drivesync_no_folders')}
                        </Typography>
                    ) : (
                        <List
                            dense
                            sx={{ maxHeight: 300, overflow: 'auto' }}
                        >
                            {localBrowseItems.map(item => (
                                <ListItemButton
                                    key={item.path}
                                    onClick={() => void this.browseLocalFolder(item.path)}
                                >
                                    <ListItemIcon>
                                        <FolderIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={item.name} />
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.setState({ localBrowseDialogOpen: false })}>
                        {I18n.t('custom_drivesync_cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<FolderOpenIcon />}
                        onClick={() => this.selectLocalFolder()}
                    >
                        {I18n.t('custom_drivesync_select_this_folder')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    // ── Browse dialog ────────────────────────────────────────────────────

    private renderBrowseDialog(): React.JSX.Element | null {
        const { browseDialogOpen, browsePath, browseItems, browseLoading, createFolderOpen, createFolderName } =
            this.state;
        if (!browseDialogOpen) {
            return null;
        }

        return (
            <Dialog
                open
                onClose={() => this.setState({ browseDialogOpen: false })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                    >
                        <CloudUploadIcon />
                        <Typography variant="h6">{I18n.t('custom_drivesync_select_folder')}</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers>
                    {/* Breadcrumb navigation */}
                    <Breadcrumbs sx={{ mb: 1 }}>
                        <Link
                            component="button"
                            underline="hover"
                            onClick={() => {
                                this.setState({ browsePath: [] });
                                void this.browseDriveFolder('');
                            }}
                        >
                            iCloud Drive
                        </Link>
                        {browsePath.map((segment, i) => (
                            <Link
                                key={i}
                                component="button"
                                underline="hover"
                                onClick={() => this.navigateToBreadcrumb(i)}
                            >
                                {segment}
                            </Link>
                        ))}
                    </Breadcrumbs>

                    {browseLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : (
                        <List
                            dense
                            sx={{ maxHeight: 300, overflow: 'auto' }}
                        >
                            {browsePath.length > 0 && (
                                <ListItemButton onClick={() => this.navigateUp()}>
                                    <ListItemIcon>
                                        <ArrowBackIcon />
                                    </ListItemIcon>
                                    <ListItemText primary=".." />
                                </ListItemButton>
                            )}
                            {browseItems.map(item => (
                                <ListItemButton
                                    key={item.drivewsid}
                                    onClick={() => this.navigateToFolder(item.name)}
                                >
                                    <ListItemIcon>
                                        <FolderIcon />
                                    </ListItemIcon>
                                    <ListItemText primary={item.name} />
                                </ListItemButton>
                            ))}
                            {browseItems.length === 0 && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ p: 2, textAlign: 'center' }}
                                >
                                    {I18n.t('custom_drivesync_no_folders')}
                                </Typography>
                            )}
                        </List>
                    )}

                    {/* Create folder inline */}
                    <Collapse in={createFolderOpen}>
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 1 }}
                        >
                            <TextField
                                size="small"
                                label={I18n.t('custom_drivesync_new_folder_name')}
                                value={createFolderName}
                                onChange={e => this.setState({ createFolderName: e.target.value })}
                                fullWidth
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        void this.createFolderInBrowser();
                                    }
                                }}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={() => void this.createFolderInBrowser()}
                                disabled={!createFolderName.trim()}
                            >
                                {I18n.t('custom_drivesync_create')}
                            </Button>
                        </Stack>
                    </Collapse>
                </DialogContent>
                <DialogActions>
                    <Button
                        startIcon={<CreateNewFolderIcon />}
                        onClick={() => this.setState({ createFolderOpen: !createFolderOpen, createFolderName: '' })}
                    >
                        {I18n.t('custom_drivesync_new_folder')}
                    </Button>
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={() => void this.browseDriveFolder(browsePath.join('/'))}
                    >
                        {I18n.t('custom_drivesync_refresh')}
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button onClick={() => this.setState({ browseDialogOpen: false })}>
                        {I18n.t('custom_drivesync_cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => this.selectCurrentFolder()}
                    >
                        {I18n.t('custom_drivesync_select_this_folder')}
                        {browsePath.length > 0 ? `: ${browsePath[browsePath.length - 1]}` : ': /'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    // ── Conflict resolution dialog ───────────────────────────────────────

    private renderConflictDialog(): React.JSX.Element | null {
        const { conflictDialogOpen, conflictEntry } = this.state;
        if (!conflictDialogOpen || !conflictEntry) {
            return null;
        }

        return (
            <Dialog
                open
                onClose={() => this.setState({ conflictDialogOpen: false })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                    >
                        <WarningIcon color="warning" />
                        <Typography variant="h6">{I18n.t('custom_drivesync_conflict_title')}</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Alert
                        severity="warning"
                        sx={{ mb: 2 }}
                    >
                        {I18n.t('custom_drivesync_conflict_description')}
                    </Alert>
                    <Typography
                        variant="subtitle2"
                        gutterBottom
                    >
                        {conflictEntry.fileName}
                    </Typography>
                    <Stack spacing={1}>
                        <Card variant="outlined">
                            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {I18n.t('custom_drivesync_local_version')}
                                </Typography>
                                <Typography variant="body2">
                                    {I18n.t('custom_drivesync_modified')}:{' '}
                                    {new Date(conflictEntry.localModified).toLocaleString()}
                                </Typography>
                                <Typography variant="body2">
                                    {I18n.t('custom_drivesync_size')}:{' '}
                                    {(conflictEntry.localSize / 1024 / 1024).toFixed(2)} MB
                                </Typography>
                            </CardContent>
                        </Card>
                        <Card variant="outlined">
                            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {I18n.t('custom_drivesync_remote_version')}
                                </Typography>
                                <Typography variant="body2">
                                    {I18n.t('custom_drivesync_modified')}:{' '}
                                    {new Date(conflictEntry.remoteModified).toLocaleString()}
                                </Typography>
                                <Typography variant="body2">
                                    {I18n.t('custom_drivesync_size')}:{' '}
                                    {(conflictEntry.remoteSize / 1024 / 1024).toFixed(2)} MB
                                </Typography>
                            </CardContent>
                        </Card>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => this.setState({ conflictDialogOpen: false })}>
                        {I18n.t('custom_drivesync_cancel')}
                    </Button>
                    <Button
                        color="warning"
                        onClick={() => void this.resolveConflict('skip')}
                    >
                        {I18n.t('custom_drivesync_conflict_skip')}
                    </Button>
                    <Button
                        color="info"
                        onClick={() => void this.resolveConflict('keep-both')}
                    >
                        {I18n.t('custom_drivesync_conflict_keep_both')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => void this.resolveConflict('overwrite-remote')}
                    >
                        {I18n.t('custom_drivesync_conflict_upload_local')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default DriveSync;
