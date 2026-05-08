import {
  BACKUP_BLOCK_SIZE_BYTES,
  DATA_ENGINE_V1,
  DATA_ENGINE_V2,
  FRONTENDS,
  VOLUME_SOURCE_PROTOCOL,
  VOLUME_SOURCE_TYPE,
} from '@longhorn/types/volume';

type TranslateFn = (key: string) => string;

type ReplicaLike = {
  hostId?: string;
  hostID?: string;
  spec?: {
    nodeID?: string;
    nodeId?: string;
    volumeName?: string;
  };
  volumeName?: string;
};

type DataLocalityWarningInput = {
  dataLocality: string;
  state: string;
  attachedNode: string;
  replicaHosts: string[];
};

const BACKUP_BLOCK_SIZE_MIB_TO_BYTES: Record<number, string> = {
  2: BACKUP_BLOCK_SIZE_BYTES.TWO_MIB,
  16: BACKUP_BLOCK_SIZE_BYTES.SIXTEEN_MIB,
};

export const BACKUP_BLOCK_SIZE_VALUES = Object.values(BACKUP_BLOCK_SIZE_BYTES) as string[];

export function getVolumeStateQueryValue(state: string) {
  const normalized = String(state || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  return normalized.replace(/ ([a-z])/g, (_, characterAfterSpace: string) => characterAfterSpace.toUpperCase());
}

export function getVolumeSourceType(dataSource: string) {
  if (dataSource.startsWith(VOLUME_SOURCE_PROTOCOL.SNAPSHOT)) {
    return VOLUME_SOURCE_TYPE.SNAPSHOT;
  }

  if (dataSource.startsWith(VOLUME_SOURCE_PROTOCOL.VOLUME)) {
    return VOLUME_SOURCE_TYPE.VOLUME;
  }

  return '';
}

export function parseVolumeDataSource(dataSource: string) {
  const source = String(dataSource || '');
  const sourceType = getVolumeSourceType(source);

  if (!sourceType) {
    return {
      sourceType: '',
      volume: '',
      snapshot: '',
    };
  }

  if (sourceType === VOLUME_SOURCE_TYPE.SNAPSHOT) {
    const path = source.replace(VOLUME_SOURCE_PROTOCOL.SNAPSHOT, '');
    const [volume = '', snapshot = ''] = path.split('/');

    return {
      sourceType,
      volume,
      snapshot,
    };
  }

  return {
    sourceType,
    volume: source.replace(VOLUME_SOURCE_PROTOCOL.VOLUME, ''),
    snapshot: '',
  };
}

export function buildVolumeDataSource(sourceType: string, volumeName: string, snapshotName = '') {
  if (!sourceType || !volumeName) {
    return '';
  }

  if (sourceType === VOLUME_SOURCE_TYPE.SNAPSHOT) {
    return `${VOLUME_SOURCE_PROTOCOL.SNAPSHOT}${volumeName}/${snapshotName || ''}`;
  }

  if (sourceType === VOLUME_SOURCE_TYPE.VOLUME) {
    return `${VOLUME_SOURCE_PROTOCOL.VOLUME}${volumeName}`;
  }

  return '';
}

export function getFrontendOptions(t: TranslateFn) {
  return FRONTENDS.map((frontend) => ({
    label: t(frontend.labelKey),
    value: frontend.value,
    dataEngine: frontend.dataEngine,
  }));
}

export function getFrontendDisplayMap(t: TranslateFn): Record<string, string> {
  return getFrontendOptions(t).reduce(
    (frontendDisplayMap, frontend) => {
      frontendDisplayMap[frontend.value] = frontend.label;

      return frontendDisplayMap;
    },
    {} as Record<string, string>
  );
}

export function getAccessModeOptions(t: TranslateFn) {
  return [
    { label: t('longhorn.backupVolume.dialog.restoreBackup.options.accessMode.rwo'), value: 'rwo' },
    { label: t('longhorn.backupVolume.dialog.restoreBackup.options.accessMode.rwop'), value: 'rwop' },
    { label: t('longhorn.backupVolume.dialog.restoreBackup.options.accessMode.rwx'), value: 'rwx' },
  ];
}

export function getBackupBlockSizeOptions(t: TranslateFn) {
  return [
    {
      label: t('longhorn.backupVolume.dialog.restoreBackup.options.backupBlockSize.ignored'),
      value: BACKUP_BLOCK_SIZE_BYTES.IGNORED,
    },
    {
      label: t('longhorn.backupVolume.dialog.restoreBackup.options.backupBlockSize.twoMi'),
      value: BACKUP_BLOCK_SIZE_BYTES.TWO_MIB,
    },
    {
      label: t('longhorn.backupVolume.dialog.restoreBackup.options.backupBlockSize.sixteenMi'),
      value: BACKUP_BLOCK_SIZE_BYTES.SIXTEEN_MIB,
    },
  ];
}

export function parseBooleanSetting(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return defaultValue;
}

export function parseBackupBlockSizeSetting(value: unknown): string {
  const sizeInMiB = Number.parseInt(String(value ?? ''), 10);

  return BACKUP_BLOCK_SIZE_MIB_TO_BYTES[sizeInMiB] || BACKUP_BLOCK_SIZE_BYTES.IGNORED;
}

export function normalizeBackupBlockSize(value: unknown): string {
  const normalized = String(value ?? '').trim();

  if (BACKUP_BLOCK_SIZE_VALUES.includes(normalized)) {
    return normalized;
  }

  return '';
}

export function getInitialDataEngine(v1Enabled: boolean, v2Enabled: boolean): string {
  if (v1Enabled) {
    return DATA_ENGINE_V1;
  }

  if (v2Enabled) {
    return DATA_ENGINE_V2;
  }

  return DATA_ENGINE_V1;
}

export function getDefaultReplicaCount(
  replicaSettings: Record<string, unknown> | null | undefined,
  engine: string,
  fallback = 3
): number {
  const count = Number.parseInt(String(replicaSettings?.[engine] ?? ''), 10);

  return Number.isInteger(count) && count > 0 ? count : fallback;
}

export function getResourceName(resource: any): string {
  return resource?.name || resource?.metadata?.name || resource?.id || '';
}

export function mapToNameValueOptions(items: any[] | null | undefined): Array<{ label: string; value: string }> {
  return (items || [])
    .map((item) => getResourceName(item))
    .filter(Boolean)
    .map((name) => ({
      label: name,
      value: name,
    }));
}

export function collectNodeAndDiskTagOptions(
  nodes: Array<{ spec?: { tags?: string[]; disks?: Record<string, { tags?: string[] }> } }> | null | undefined
): {
  nodeTags: Array<{ label: string; value: string }>;
  diskTags: Array<{ label: string; value: string }>;
} {
  const nodeTagsSet = new Set<string>();
  const diskTagsSet = new Set<string>();

  (nodes || []).forEach((node) => {
    (node.spec?.tags || []).forEach((tag) => nodeTagsSet.add(tag));

    Object.values(node.spec?.disks || {}).forEach((disk) => {
      (disk.tags || []).forEach((tag) => diskTagsSet.add(tag));
    });
  });

  const toOptions = (tagSet: Set<string>) =>
    Array.from(tagSet).map((tag) => ({
      label: tag,
      value: tag,
    }));

  return {
    nodeTags: toOptions(nodeTagsSet),
    diskTags: toOptions(diskTagsSet),
  };
}

export function normalizeResourceName(value: unknown): string {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '';
  }

  const parts = raw.split('/').filter(Boolean);

  return String(parts[parts.length - 1] || raw).toLowerCase();
}

export function getReplicaHostIds(replicas: ReplicaLike[] | null | undefined): string[] {
  return (replicas || [])
    .map((replica) => replica.hostId || replica.hostID || replica.spec?.nodeID || replica.spec?.nodeId || '')
    .filter(Boolean);
}

export function filterReplicasByVolumeName(
  replicas: ReplicaLike[] | null | undefined,
  volumeNameCandidates: string[] | null | undefined
): ReplicaLike[] {
  const normalizedCandidates = new Set(
    (volumeNameCandidates || []).map((value) => normalizeResourceName(value)).filter(Boolean)
  );

  if (!normalizedCandidates.size) {
    return [];
  }

  return (replicas || []).filter((replica) => {
    const replicaVolumeName = replica.spec?.volumeName || replica.volumeName || '';

    return normalizedCandidates.has(normalizeResourceName(replicaVolumeName));
  });
}

export function shouldShowDataLocalityWarning(input: DataLocalityWarningInput): boolean {
  const dataLocality = String(input.dataLocality || '').toLowerCase();
  const state = String(input.state || '').toLowerCase();
  const attachedNode = String(input.attachedNode || '');
  const replicaHosts = input.replicaHosts || [];

  if (dataLocality !== 'best-effort') {
    return false;
  }

  if (state !== 'attached') {
    return false;
  }

  if (!attachedNode) {
    return false;
  }

  if (!replicaHosts.length) {
    return false;
  }

  return replicaHosts.every((host) => host !== attachedNode);
}
