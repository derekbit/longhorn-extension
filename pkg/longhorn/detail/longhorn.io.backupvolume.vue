<script setup>
import { computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useFetch } from '@shell/components/Resource/Detail/FetchLoader/composables';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import LabelValue from '@shell/components/LabelValue';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import Loading from '@shell/components/Loading';
import SortableTable from '@shell/components/SortableTable';
import ActionMenu from '@shell/components/ActionMenuShell.vue';
import { BadgeState } from '@components/BadgeState';
import { _VIEW } from '@shell/config/query-params';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { EMPTY_DISPLAY } from '@longhorn/types/display';
import { resolveKubernetesStatus } from '@longhorn/utils/json';
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
const store = useStore();
const COMPLETED_STATE = 'Completed';
const ACTION_RESTORE = 'restore';
const ACTION_DELETE = 'delete';

const kubernetesStatus = computed(() => props.value?.kubernetesStatus || {});

const backupHeaders = [
  {
    name: 'state',
    label: 'State',
    value: 'stateInfo',
    sort: ['status.state'],
  },
  {
    name: 'id',
    label: 'ID',
    value: 'id',
    sort: ['id'],
  },
  {
    name: 'backupMode',
    label: 'Backup Mode',
    value: 'backupModeDisplay',
    sort: ['spec.backupMode'],
    dashIfEmpty: true,
  },
  {
    name: 'blockSize',
    label: 'Backup Block Size',
    value: 'backupBlockSizeDisplay',
    sort: ['spec.backupBlockSize'],
  },
  {
    name: 'snapshotName',
    label: 'Snapshot Name',
    value: 'snapshotName',
    dashIfEmpty: true,
  },
  {
    name: 'size',
    label: 'Size',
    value: 'sizeDisplay',
  },
  {
    name: 'reUploadedDataSize',
    label: 'Re-Uploaded Data Size',
    value: 'reUploadedDataSizeDisplay',
    sort: ['status.reUploadedDataSize'],
    width: 190,
  },
  {
    name: 'newlyUploadDataSize',
    label: 'Newly Uploaded Data Size',
    value: 'newlyUploadDataSizeDisplay',
    sort: ['status.newlyUploadDataSize'],
    width: 190,
  },
  {
    name: 'snapshotCreated',
    label: 'Snapshot Created',
    value: 'snapshotCreated',
    formatter: 'LiveDate',
    sort: ['status.snapshotCreatedAt'],
    dashIfEmpty: true,
  },
  {
    name: 'url',
    label: 'Backup URL',
    value: 'url',
    dashIfEmpty: true,
    width: 320,
  },
  {
    name: 'created',
    label: 'Created',
    value: 'createdTS',
    formatter: 'LiveDate',
    sort: ['metadata.creationTimestamp:desc'],
  },
  {
    name: 'operation',
    label: 'Operation',
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
    .map((backup) => ({
      ...backup,
      id: backup?.metadata?.name || backup?.name || EMPTY_DISPLAY,
      stateInfo: buildStateInfo(backup),
      backupModeDisplay: backup?.spec?.backupMode || 'incremental',
      backupBlockSizeDisplay: formatBlockSize(backup),
      snapshotName: backup?.status?.snapshotName || backup?.spec?.snapshotName || '',
      sizeDisplay: formatCompletedSize(backup, backup?.status?.size || 0),
      reUploadedDataSizeDisplay: formatCompletedSize(backup, backup?.status?.reUploadedDataSize || 0),
      newlyUploadDataSizeDisplay: formatCompletedSize(backup, backup?.status?.newlyUploadDataSize || 0),
      url: getBackupUrl(backup),
      kubernetesStatus: extractKubernetesStatus(backup),
      snapshotCreated: backup?.status?.snapshotCreatedAt || '',
      createdTS: backup?.metadata?.creationTimestamp || '',
      canRestore: canRestoreBackup(backup),
      canDelete: canDeleteBackup(backup),
    }));
});

const { pending: fetchPending } = useFetch(async () => {
  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore) {
    allBackupsRaw.value = [];

    return;
  }

  try {
    allBackupsRaw.value = (await store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.BACKUPS })) || [];
  } catch {
    allBackupsRaw.value = [];
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
    return 'Error';
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
  // old longhorn-ui reads messages.error first, then falls back to status.error
  const errorMessage = backup?.status?.messages?.error || backup?.messages?.error || backup?.status?.error || '';
  const normalized = String(state).toLowerCase();
  const colorMap = {
    completed: 'bg-success',
    inprogress: 'bg-warning',
    syncing: 'bg-warning',
    pending: 'bg-info',
    error: 'bg-error',
    failed: 'bg-error',
    unknown: 'badge-disabled',
  };

  return {
    label: ['InProgress', 'Syncing'].includes(state) && progress !== undefined ? `${state} (${progress}%)` : state,
    color: colorMap[normalized] || 'bg-info',
    message: errorMessage,
  };
}

function canRestoreBackup(backup) {
  return !!getBackupUrl(backup);
}

function canDeleteBackup(backup) {
  return !!backup?.links?.remove;
}

async function restoreBackup(row) {
  if (!row?.canRestore) {
    return;
  }

  try {
    await row.doAction('restore');
  } catch {}
}

function deleteBackup(row) {
  if (!row?.canDelete) {
    return;
  }

  store.dispatch('management/promptModal', {
    resources: [row],
    action: 'delete',
  });
}

async function copyBackupUrl(row) {
  const url = getBackupUrl(row);

  if (!url) {
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch {}
}

function operationActions(row) {
  return [
    {
      action: ACTION_RESTORE,
      label: 'Restore',
      disabled: !row?.canRestore,
    },
    {
      action: ACTION_DELETE,
      label: 'Delete',
      disabled: !row?.canDelete,
    },
  ];
}

function onOperationAction(row, payload) {
  switch (payload?.action) {
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

function getBackupUrl(backup) {
  return backup?.status?.url || backup?.url || '';
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
      <Tab name="basics" label="Basics" :weight="100">
        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Volume" :value="displayValue(value?.volumeName)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Size" :value="displayValue(value?.size)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Last Backup At" :value="displayValue(value?.lastBackupAt)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="PV Name" :value="displayValue(kubernetesStatus?.pvName)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="PV Status" :value="displayValue(kubernetesStatus?.pvStatus)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="PVC Namespace" :value="displayValue(kubernetesStatus?.namespace)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="PVC Name" :value="displayValue(kubernetesStatus?.pvcName)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Last PVC Ref At" :value="displayValue(kubernetesStatus?.lastPVCRefAt)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Last Pod Ref At" :value="displayValue(kubernetesStatus?.lastPodRefAt)" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Workload/Pod" :value="workloadPodNames" />
          </div>
        </div>
      </Tab>

      <Tab name="backups" label="Backups" :weight="90">
        <Loading v-if="fetchPending" />
        <SortableTable
          v-else
          :headers="backupHeaders"
          :rows="backupRows"
          key-field="id"
          :search="false"
          :table-actions="false"
          :row-actions="false"
          default-sort-by="created"
          default-sort-order="desc"
        >
          <template #col:state="{ row }">
            <td>
              <span v-clean-tooltip="row.stateInfo?.message">
                <BadgeState v-if="row.stateInfo?.label" :label="row.stateInfo.label" :color="row.stateInfo.color" />
                <span v-else class="text-muted">&mdash;</span>
              </span>
            </td>
          </template>
          <template #col:url="{ row }">
            <td>
              <div class="backup-url-cell">
                <span v-if="row.url" class="backup-url-text">{{ row.url }}</span>
                <span v-else class="text-muted">&mdash;</span>
                <button
                  v-if="row.url"
                  v-clean-tooltip="'Copy Backup URL'"
                  type="button"
                  class="btn btn-sm role-link"
                  @click="copyBackupUrl(row)"
                >
                  <i class="icon icon-copy" />
                </button>
              </div>
            </td>
          </template>
          <template #col:operation="{ row }">
            <td>
              <ActionMenu
                :resource="row"
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
.backup-url-cell {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  min-width: 0;

  .backup-url-text {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    line-height: 1.4;
  }
}
</style>
