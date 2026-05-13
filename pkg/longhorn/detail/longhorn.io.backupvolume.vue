<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { BadgeState } from '@components/BadgeState';
import { useFetch } from '@shell/components/Resource/Detail/FetchLoader/composables';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import LabelValue from '@shell/components/LabelValue';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import Loading from '@shell/components/Loading';
import SortableTable from '@shell/components/SortableTable';
import ActionMenu from '@shell/components/ActionMenuShell.vue';
import LiveDate from '@shell/components/formatter/LiveDate';
import { useI18n } from '@shell/composables/useI18n';
import { _VIEW } from '@shell/config/query-params';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { EMPTY_DISPLAY, BADGE_COLOR } from '@longhorn/types/general';
import { getBadgeColor, resolveKubernetesStatus } from '@longhorn/utils/general';
import { getBackupUrl } from '@longhorn/utils/backup';
import { formatSi } from '@shell/utils/units';

const props = defineProps({
  mode: {
    type: String,
    default: _VIEW,
  },
  value: {
    type: Object,
    required: false,
    default: () => ({}),
  },
});

const allBackupsRaw = ref([]);
const allBackupVolumesRaw = ref([]);
const store = useStore();
const { t } = useI18n(store);
const COMPLETED_STATE = 'Completed';
const ACTION_RESTORE = 'restore';
const ACTION_DELETE = 'delete';
const ACTION_GET_URL = 'getUrl';

const kubernetesStatus = computed(() => props.value?.kubernetesStatus || {});
const hasBackingImageInfo = computed(() => {
  const backingImageName = props.value?.status?.backingImageName;
  const backingImageChecksum = props.value?.status?.backingImageChecksum;

  return !!String(backingImageName || '').trim() || !!String(backingImageChecksum || '').trim();
});

const backupHeaders = [
  {
    name: 'state',
    label: t('longhorn.backupVolume.table.header.state'),
    value: 'stateDisplay',
    sort: ['stateSort'],
  },
  {
    name: 'id',
    label: t('longhorn.backupVolume.table.header.id'),
    value: 'id',
    sort: ['id'],
  },
  {
    name: 'volumeName',
    label: t('longhorn.backupVolume.table.header.volume'),
    value: 'volumeName',
    sort: ['volumeName'],
    dashIfEmpty: true,
    width: 120,
  },
  {
    name: 'backupMode',
    label: t('longhorn.backupVolume.table.header.mode'),
    value: 'backupModeDisplay',
    sort: ['spec.backupMode'],
    dashIfEmpty: true,
  },
  {
    name: 'blockSize',
    label: t('longhorn.backupVolume.table.header.blockSize'),
    value: 'backupBlockSizeDisplay',
    sort: ['spec.backupBlockSize'],
  },
  {
    name: 'backupTargetName',
    label: t('longhorn.backupVolume.table.header.target'),
    value: 'backupTargetName',
    sort: ['backupTargetName'],
    dashIfEmpty: true,
    width: 120,
  },
  {
    name: 'snapshotName',
    label: t('longhorn.backupVolume.table.header.snapshotName'),
    value: 'snapshotName',
    dashIfEmpty: true,
  },
  {
    name: 'size',
    label: t('longhorn.backupVolume.table.header.size'),
    value: 'sizeDisplay',
  },
  {
    name: 'reUploadedDataSize',
    label: t('longhorn.backupVolume.table.header.reUploaded'),
    value: 'reUploadedDataSizeDisplay',
    sort: ['status.reUploadedDataSize'],
    width: 130,
  },
  {
    name: 'newlyUploadDataSize',
    label: t('longhorn.backupVolume.table.header.newlyUploaded'),
    value: 'newlyUploadDataSizeDisplay',
    sort: ['status.newlyUploadDataSize'],
    width: 130,
  },
  {
    name: 'pvPvc',
    label: t('longhorn.backupVolume.table.header.pvPvc'),
    value: 'kubernetesStatus',
    formatter: 'VolumePvPvc',
    align: 'center',
    width: 90,
  },
  {
    name: 'workloadPod',
    label: t('longhorn.backupVolume.table.header.workloadPod'),
    value: 'kubernetesStatus',
    formatter: 'VolumeNode',
    width: 150,
  },
  {
    name: 'snapshotCreated',
    label: t('longhorn.backupVolume.table.header.snapshotCreated'),
    value: 'snapshotCreated',
    formatter: 'LiveDate',
    sort: ['status.snapshotCreatedAt'],
    dashIfEmpty: true,
  },
  {
    name: 'operation',
    label: t('longhorn.backupVolume.table.header.operation'),
    width: 130,
  },
];

const workloadPodNames = computed(() => {
  const workloads = kubernetesStatus.value?.workloadsStatus;

  if (!Array.isArray(workloads) || !workloads.length) {
    return EMPTY_DISPLAY;
  }

  const names = workloads.map((item) => item?.podName || item?.name || '').filter((item) => !!item);

  return names.length ? names.join(', ') : EMPTY_DISPLAY;
});

const currentBackupVolumeName = computed(() => {
  return props.value?.metadata?.name || props.value?.name || '';
});

const currentVolumeName = computed(() => {
  const explicitVolumeName =
    props.value?.volumeName || props.value?.spec?.volumeName || props.value?.status?.volumeName || '';

  if (explicitVolumeName) {
    return explicitVolumeName;
  }

  // BackupVolume CR name may include a generated suffix like "<volumeName>-<8hex>".
  return currentBackupVolumeName.value.replace(/-[a-f0-9]{8}$/i, '');
});

const backupRows = computed(() => {
  const volumeName = currentVolumeName.value || currentBackupVolumeName.value;
  const backupTargetName = props.value?.backupTargetName || props.value?.metadata?.labels?.['backup-target'] || '';

  return (allBackupsRaw.value || [])
    .filter((backup) => {
      const backupVolumeName = getBackupVolumeName(backup);
      const backupTarget = getBackupTargetName(backup);

      return backupVolumeName === volumeName && (!backupTargetName || backupTarget === backupTargetName);
    })

    .map((backup) => {
      const stateInfo = buildStateInfo(backup);
      const url = getBackupUrl(backup);
      const isCompleted = isCompletedBackup(backup);
      const canOperateOnBackup = isCompleted && !stateInfo.hasError && !!url;

      return {
        id: backup?.metadata?.name || backup?.name || EMPTY_DISPLAY,
        volumeName: getBackupVolumeName(backup),
        backupTargetName: getBackupTargetName(backup),
        state: stateInfo.label || t('longhorn.replica.status.unknown'),
        stateDisplay: stateInfo.label || t('longhorn.replica.status.unknown'),
        stateColor: stateInfo.color || BADGE_COLOR.INFO,
        stateObj: {
          error: stateInfo.color === BADGE_COLOR.ERROR,
        },
        stateDescription: stateInfo.description,
        stateSort: backup?.status?.state || 'unknown',
        backupModeDisplay: backup?.spec?.backupMode || 'incremental',
        backupBlockSizeDisplay: formatBlockSize(backup),
        snapshotName: backup?.status?.snapshotName || backup?.spec?.snapshotName || '',
        sizeDisplay: formatCompletedSize(backup, backup?.status?.size || 0),
        reUploadedDataSizeDisplay: formatCompletedSize(backup, backup?.status?.reUploadedDataSize || 0),
        newlyUploadDataSizeDisplay: formatCompletedSize(backup, backup?.status?.newlyUploadDataSize || 0),
        url,
        hasError: stateInfo.hasError,
        kubernetesStatus: extractKubernetesStatus(backup),
        snapshotCreated: backup?.status?.snapshotCreatedAt || '',
        canGetUrl: canOperateOnBackup,
        canRestore: canOperateOnBackup,
        canDelete: !!backup?.links?.remove,
        // Store a reference to the original backup for actions
        _backup: backup,
      };
    });
});

const { pending: fetchPending } = useFetch(async () => {
  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    allBackupsRaw.value = [];
    allBackupVolumesRaw.value = [];

    return;
  }

  try {
    const [backups, backupVolumes] = await Promise.all([
      store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKUPS }),
      store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKUP_VOLUMES }),
    ]);

    allBackupsRaw.value = backups || [];
    allBackupVolumesRaw.value = backupVolumes || [];
  } catch {
    allBackupsRaw.value = [];
    allBackupVolumesRaw.value = [];
  }
});

function formatSize(size) {
  const num = Number(size);

  if (size === null || size === undefined || size === '') {
    return EMPTY_DISPLAY;
  }

  return formatSi(num, {
    suffix: 'iB',
    firstSpread: 1024,
    increment: 1024,
  });
}

function formatCompletedSize(backup, size) {
  if (!isCompletedBackup(backup)) {
    return EMPTY_DISPLAY;
  }

  // size may be an empty string when not yet available
  if (size === null || size === undefined || size === '') {
    return EMPTY_DISPLAY;
  }

  return formatSize(size);
}

function formatBlockSize(backup) {
  const blockSize = backup?.spec?.backupBlockSize ?? backup?.status?.blockSize;

  if (!isCompletedBackup(backup)) {
    return EMPTY_DISPLAY;
  }

  if (blockSize === null || blockSize === undefined || blockSize === '') {
    return EMPTY_DISPLAY;
  }

  if (String(blockSize) === '-1') {
    return t('longhorn.replica.status.err');
  }

  return formatSize(blockSize);
}

function extractKubernetesStatus(backup) {
  return resolveKubernetesStatus({
    statusLabels: backup?.status?.labels,
    specLabels: backup?.spec?.labels,
    metadataLabels: backup?.metadata?.labels,
  });
}

function buildStateInfo(backup) {
  const state = backup?.status?.state || '';
  const progress = backup?.status?.progress;
  // Prefer explicit state description, then fall back to known error fields.
  const stateDescription =
    backup?.status?.stateDescription || backup?.stateDescription || backup?.status?.message || backup?.message || '';
  const errorMessage = backup?.status?.messages?.error || backup?.messages?.error || backup?.status?.error || '';
  const description = stateDescription || errorMessage;
  const normalized = String(state).toLowerCase();
  const colorMap = {
    completed: BADGE_COLOR.SUCCESS,
    inprogress: BADGE_COLOR.WARNING,
    syncing: BADGE_COLOR.WARNING,
    pending: BADGE_COLOR.INFO,
    error: BADGE_COLOR.ERROR,
    failed: BADGE_COLOR.ERROR,
    unknown: BADGE_COLOR.DISABLED,
  };

  let label = state;

  if (['InProgress', 'Syncing'].includes(state) && progress !== undefined) {
    label = `${state} (${progress}%)`;
  }

  if (!label) {
    label = t('longhorn.replica.status.unknown');
  }

  return {
    label,
    color: getBadgeColor(normalized, colorMap, BADGE_COLOR.INFO),
    description,
    message: description,
    hasError: !!errorMessage,
  };
}

function restoreBackup(row) {
  if (!row?.canRestore) {
    return;
  }

  const backup = row._backup || {};
  const restoreBackupPayload = {
    ...backup,
    // Keep a top-level backup name to match longhorn-ui restore form default name behavior.
    name: backup?.name || backup?.id || backup?.metadata?.name || '',
    // Keep a top-level volumeName to match longhorn-ui restore form expectations.
    volumeName: getBackupVolumeName(backup),
    // Provide url/blockSize on top-level for restore form fallbacks.
    url: getBackupUrl(backup),
    blockSize: backup?.status?.blockSize ?? backup?.spec?.backupBlockSize,
  };

  store.dispatch('management/promptModal', {
    component: 'RestoreBackupModal',
    componentProps: {
      backup: restoreBackupPayload,
      backupVolumes: allBackupVolumesRaw.value,
    },
    modalWidth: '760px',
  });
}

function deleteBackup(row) {
  if (!row?.canDelete) {
    return;
  }

  store.dispatch('management/promptModal', {
    resources: [row._backup],
    action: 'delete',
  });
}

function operationActions(row) {
  return [
    {
      action: ACTION_GET_URL,
      label: t('longhorn.backupVolume.actions.getBackupUrl'),
      enabled: !!row?.canGetUrl,
    },
    {
      action: ACTION_RESTORE,
      label: t('longhorn.backupVolume.dialog.restoreBackup.actions.restore'),
      enabled: !!row?.canRestore,
    },
    {
      action: ACTION_DELETE,
      label: t('longhorn.backupVolume.actions.delete'),
      enabled: !!row?.canDelete,
    },
  ];
}

function onOperationAction(row, payload) {
  switch (payload?.action) {
    case ACTION_GET_URL:
      if (row?.canGetUrl && row?.url) {
        store.dispatch('management/promptModal', {
          component: 'BackupUrlDialog',
          componentProps: {
            url: row.url,
          },
          modalWidth: '760px',
        });
      }
      break;
    case ACTION_RESTORE:
      restoreBackup(row);
      break;
    case ACTION_DELETE:
      deleteBackup(row);
      break;
    default:
      break;
  }
}

function getBackupVolumeName(backup) {
  return backup?.status?.volumeName || backup?.spec?.volumeName || backup?.metadata?.labels?.['backup-volume'] || '';
}

function getBackupTargetName(backup) {
  return (
    backup?.spec?.backupTargetName ||
    backup?.status?.backupTargetName ||
    backup?.metadata?.labels?.['backup-target'] ||
    ''
  );
}

function isCompletedBackup(backup) {
  return backup?.status?.state === COMPLETED_STATE;
}

function displayValue(val) {
  if (Array.isArray(val)) {
    return val.length ? val.join(', ') : EMPTY_DISPLAY;
  }

  return val === null || val === undefined || String(val).trim() === '' ? EMPTY_DISPLAY : String(val);
}
</script>

<template>
  <div>
    <NameNsDescription
      :value="value"
      :mode="mode"
      :force-namespace="LONGHORN_NAMESPACE"
      :name-hidden="mode !== _VIEW"
      :description-hidden="true"
    />

    <Tabbed side-tabs class="mt-20" default-tab="basics" :resource="value">
      <Tab name="basics" :label="t('longhorn.backupVolume.tab.basics')" :weight="100">
        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Volume" :value="displayValue(value?.volumeName)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue name="Size" :value="formatSize(value?.size)" />
          </div>
          <div class="col span-6">
            <LabelValue name="Data Stored" :value="formatSize(value?.status?.dataStored)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue name="Last Backup Name" :value="displayValue(value?.status?.lastBackupName)" />
          </div>
          <div class="col span-6">
            <LabelValue name="Last Backup At">
              <template #value>
                <LiveDate v-if="value?.lastBackupAt" :value="value.lastBackupAt" />
                <span v-else>{{ EMPTY_DISPLAY }}</span>
              </template>
            </LabelValue>
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue name="Created At">
              <template #value>
                <LiveDate v-if="value?.status?.createdAt" :value="value.status.createdAt" />
                <span v-else>{{ EMPTY_DISPLAY }}</span>
              </template>
            </LabelValue>
          </div>
          <div class="col span-6">
            <LabelValue name="Last Synced At">
              <template #value>
                <LiveDate v-if="value?.status?.lastSyncedAt" :value="value.status.lastSyncedAt" />
                <span v-else>{{ EMPTY_DISPLAY }}</span>
              </template>
            </LabelValue>
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Storage Class Name" :value="displayValue(value?.status?.storageClassName)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue name="PV Name" :value="displayValue(kubernetesStatus?.pvName)" />
          </div>
          <div class="col span-6">
            <LabelValue name="PV Status" :value="displayValue(kubernetesStatus?.pvStatus)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue name="PVC Namespace" :value="displayValue(kubernetesStatus?.namespace)" />
          </div>
          <div class="col span-6">
            <LabelValue name="PVC Name" :value="displayValue(kubernetesStatus?.pvcName)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue name="Last PVC Ref At">
              <template #value>
                <LiveDate v-if="kubernetesStatus?.lastPVCRefAt" :value="kubernetesStatus.lastPVCRefAt" />
                <span v-else>{{ EMPTY_DISPLAY }}</span>
              </template>
            </LabelValue>
          </div>
          <div class="col span-6">
            <LabelValue name="Last Pod Ref At">
              <template #value>
                <LiveDate v-if="kubernetesStatus?.lastPodRefAt" :value="kubernetesStatus.lastPodRefAt" />
                <span v-else>{{ EMPTY_DISPLAY }}</span>
              </template>
            </LabelValue>
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Workload/Pod" :value="workloadPodNames" />
          </div>
        </div>
      </Tab>

      <Tab
        v-if="hasBackingImageInfo"
        name="backing-image"
        :label="t('longhorn.backupVolume.tab.backingImage')"
        :weight="95"
      >
        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Backing Image Name" :value="displayValue(value?.status?.backingImageName)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Backing Image Checksum">
              <template #value>
                <span class="checksum-text">{{ displayValue(value?.status?.backingImageChecksum) }}</span>
              </template>
            </LabelValue>
          </div>
        </div>
      </Tab>

      <Tab name="backups" :label="t('longhorn.backupVolume.tab.backups')" :weight="90">
        <Loading v-if="fetchPending" />
        <SortableTable
          v-else
          :headers="backupHeaders"
          :rows="backupRows"
          key-field="id"
          :search="false"
          :table-actions="false"
          :row-actions="false"
          default-sort-by="snapshotCreated"
          default-sort-order="desc"
        >
          <template #col:state="{ row }">
            <td>
              <BadgeState :label="row.state" :color="row.stateColor" />
            </td>
          </template>
          <template #col:operation="{ row }">
            <td>
              <ActionMenu
                :resource="row._backup"
                :custom-actions="operationActions(row)"
                @action-invoked="(payload) => onOperationAction(row, payload)"
              />
            </td>
          </template>
        </SortableTable>
      </Tab>
    </Tabbed>
  </div>
</template>

<style lang="scss" scoped>
.checksum-text {
  word-break: break-all;
  overflow-wrap: anywhere;
}
</style>
