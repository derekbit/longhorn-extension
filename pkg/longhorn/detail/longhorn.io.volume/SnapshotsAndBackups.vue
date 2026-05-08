<script>
import SortableTable from '@shell/components/SortableTable';
import ActionMenu from '@shell/components/ActionMenuShell.vue';
import Checkbox from '@components/Form/Checkbox/Checkbox';
import { formatSi } from '@shell/utils/units';
import { EMPTY_DISPLAY } from '@longhorn/types/display';

const ACTION_TAKE_SNAPSHOT = 'snapshotCRCreate';
const ACTION_BACKUP = 'snapshotBackup';
const ACTION_REVERT = 'snapshotRevert';
const ACTION_DELETE = 'snapshotDelete';
const ACTION_PURGE = 'snapshotPurge';

export default {
  name: 'VolumeSnapshotsAndBackups',

  components: {
    SortableTable,
    ActionMenu,
    Checkbox,
  },

  props: {
    dataSource: {
      type: Array,
      default: () => [],
    },
    volume: {
      type: Object,
      default: null,
    },
    snapshotState: {
      type: Boolean,
      default: true,
    },
    backupTargets: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      showRemoved: true,
    };
  },

  computed: {
    rows() {
      const source = this.showRemoved ? this.dataSource : this.filterRemoved(this.dataSource);

      return source
        .filter((item) => this.getItemName(item) !== 'volume-head')
        .map((item) => {
          const name = this.getItemName(item);
          const isBackup = item.type === 'backup';
          const size = item.backupStatusObject?.size || item.status?.size || item.size || 0;

          return {
            ...item,
            id: name,
            snapshotName: name,
            displayType: isBackup
              ? this.t('longhorn.volume.snapshotAndBackup.type.backup')
              : this.t('longhorn.volume.snapshotAndBackup.type.snapshot'),
            removedDisplay: this.isRemoved(item) ? this.t('generic.trueOption') : this.t('generic.falseOption'),
            displaySize: this.formatBinary(size),
            replicaAddress: item.backupStatusObject?.replicaAddress || EMPTY_DISPLAY,
            backups: item.backupStatusObject?.backupIds?.[0] || EMPTY_DISPLAY,
            createdTS: item.metadata?.creationTimestamp || item.created,
            removed: this.isRemoved(item),
            userCreated: this.isUserCreated(item),
          };
        });
    },

    createSnapshotDisabled() {
      // TODO: Extension volume CRD may not always expose complete actions.
      // Keep longhorn-ui logic here and revisit when action parity is finalized.
      return (
        !this.volume?.actions || !this.volume?.actions?.snapshotCRCreate || !this.snapshotState || this.isVolumeBusy
      );
    },

    createBackupDisabled() {
      // TODO: Keep parity with longhorn-ui for now.
      return this.createSnapshotDisabled || !this.isBackupTargetAvailable;
    },

    isBackupTargetAvailable() {
      const backupTargetName = this.volume?.backupTargetName;

      if (!backupTargetName) {
        return false;
      }

      return !!this.backupTargets.find((target) => target?.metadata?.name === backupTargetName && target?.available);
    },

    isVolumeBusy() {
      const isRestoring = this.volume?.status?.restoreStatus?.some((item) => item?.isRestoring);
      const upgradingEngine =
        this.volume?.currentImage && this.volume?.image && this.volume.currentImage !== this.volume.image;

      return !!this.volume?.standby || !!isRestoring || !!upgradingEngine;
    },

    tableHeaders() {
      return [
        {
          name: 'type',
          label: this.t('longhorn.volume.snapshotAndBackup.table.header.type'),
          value: 'displayType',
          width: 80,
        },
        {
          name: 'snapshotName',
          label: this.t('generic.name'),
          value: 'snapshotName',
        },
        {
          name: 'removed',
          label: this.t('longhorn.volume.snapshotAndBackup.table.header.removed'),
          value: 'removedDisplay',
          width: 100,
        },
        {
          name: 'size',
          label: this.t('longhorn.volume.table.header.size'),
          value: 'displaySize',
          width: 80,
        },
        {
          name: 'replicaAddress',
          label: this.t('longhorn.volume.snapshotAndBackup.table.header.replicaAddress'),
          value: 'replicaAddress',
        },
        {
          name: 'backups',
          label: this.t('longhorn.volume.snapshotAndBackup.table.header.backups'),
          value: 'backups',
        },
        {
          name: 'created',
          label: this.t('longhorn.dashboard.created'),
          value: 'createdTS',
          width: 100,
          formatter: 'LiveDate',
          sort: ['createdTS:desc'],
        },
        {
          name: 'actions',
          label: '',
          width: 80,
          align: 'center',
        },
      ];
    },
  },

  methods: {
    openActionDialog({ title, message, confirmLabel, confirmButtonClass, onConfirm }) {
      this.$store.dispatch('management/promptModal', {
        component: 'ActionConfirmDialog',
        componentProps: {
          title,
          message,
          confirmLabel,
          confirmButtonClass,
          onConfirm,
        },
      });
    },

    openInfoDialog(message) {
      this.openActionDialog({
        title: this.t('longhorn.volume.snapshotAndBackup.messages.warningTitle'),
        message,
      });
    },

    getItemName(item) {
      return item.metadata?.name || item.name;
    },

    getParentName(item) {
      return item.status?.parent || item.spec?.parent || item.parent || '';
    },

    getChildrenNames(item) {
      const children = item.status?.children || item.spec?.children || item.children || [];

      if (Array.isArray(children)) {
        return children;
      }

      return Object.keys(children || {});
    },

    cloneItem(item) {
      return JSON.parse(JSON.stringify(item));
    },

    toChildrenMap(childrenNames) {
      return childrenNames.reduce((acc, childName) => {
        acc[childName] = true;

        return acc;
      }, {});
    },

    isSystemOrRemoved(item) {
      const name = this.getItemName(item);
      const userCreated = item.status?.userCreated ?? item.usercreated;

      return item.removed || item.status?.markRemoved || (userCreated === false && name !== 'volume-head');
    },

    isRemoved(item) {
      return !!(item.removed || item.status?.markRemoved);
    },

    isUserCreated(item) {
      return (item.status?.userCreated ?? item.usercreated) !== false;
    },

    setParentName(item, parentName) {
      if (item.status && 'parent' in item.status) {
        item.status.parent = parentName;
      }
      if (item.spec && 'parent' in item.spec) {
        item.spec.parent = parentName;
      }
      if ('parent' in item) {
        item.parent = parentName;
      }
    },

    setChildren(item, childrenNames) {
      if (item.status && item.status.children && !Array.isArray(item.status.children)) {
        item.status.children = this.toChildrenMap(childrenNames);
      }

      if (item.spec && item.spec.children && !Array.isArray(item.spec.children)) {
        item.spec.children = this.toChildrenMap(childrenNames);
      }

      if (Array.isArray(item.children)) {
        item.children = childrenNames;
      } else if (item.children) {
        item.children = this.toChildrenMap(childrenNames);
      }
    },

    filterRemoved(data) {
      if (!data || data.length === 0) return [];

      const itemMap = new Map(data.map((item) => [this.getItemName(item), this.cloneItem(item)]));
      const namesToRemove = new Set();

      for (const item of itemMap.values()) {
        if (this.isSystemOrRemoved(item)) {
          namesToRemove.add(this.getItemName(item));
        }
      }

      for (const name of namesToRemove) {
        const item = itemMap.get(name);

        if (!item) continue;

        const parentName = this.getParentName(item);
        const childrenNames = this.getChildrenNames(item);

        if (parentName && itemMap.has(parentName)) {
          const parent = itemMap.get(parentName);
          const nextChildren = this.getChildrenNames(parent)
            .filter((childName) => childName !== name)
            .concat(childrenNames.filter((childName) => childName !== name));

          this.setChildren(parent, [...new Set(nextChildren)]);
        }

        childrenNames.forEach((cName) => {
          const child = itemMap.get(cName);

          if (child) {
            this.setParentName(child, parentName);
          }
        });
      }

      return Array.from(itemMap.values()).filter((item) => !namesToRemove.has(this.getItemName(item)));
    },

    formatBinary(bytes) {
      return formatSi(bytes, {
        suffix: 'iB',
        firstSpread: 1024,
        increment: 1024,
      });
    },

    actionsForRow(row) {
      const out = [];

      if (row.userCreated && !row.removed) {
        out.push({
          action: ACTION_REVERT,
          label: this.t('longhorn.volume.snapshotAndBackup.actions.revert'),
          enabled: !!this.volume?.actions?.snapshotRevert && !!this.volume?.disableFrontend,
        });
        out.push({
          action: ACTION_BACKUP,
          label: this.t('longhorn.volume.snapshotAndBackup.actions.backup'),
          enabled: !!this.volume?.actions?.snapshotBackup && !this.isVolumeBusy,
        });
      }

      out.push({
        action: ACTION_DELETE,
        label: this.t('generic.delete'),
        enabled: !!this.volume?.actions?.snapshotDelete || !!this.volume?.actions?.snapshotPurge,
      });

      return out;
    },

    async doVolumeAction(action, params = {}) {
      if (!this.volume?.doAction || !action) {
        return;
      }

      return await this.volume.doAction(action, params);
    },

    async takeSnapshot() {
      return await this.doVolumeAction(ACTION_TAKE_SNAPSHOT);
    },

    async createBackup() {
      const created = await this.takeSnapshot();
      const snapshotName = created?.name || created?.id || created?.metadata?.name;

      if (snapshotName) {
        await this.doVolumeAction(ACTION_BACKUP, { name: snapshotName });
      }

      // TODO: Some extension contexts may not return created snapshot metadata from action response.
      // Confirm backend response contract and add a deterministic snapshot name resolution strategy.
    },

    async onRowAction(row, payload) {
      const action = payload?.action;

      switch (action) {
        case ACTION_REVERT:
          if (!this.volume?.disableFrontend) {
            this.openInfoDialog(this.t('longhorn.volume.snapshotAndBackup.messages.reattachToRevert'));

            return;
          }
          this.openActionDialog({
            title: this.t('longhorn.volume.snapshotAndBackup.actions.revert'),
            message: this.t('longhorn.volume.snapshotAndBackup.messages.confirmRevert', { name: row.snapshotName }),
            confirmLabel: this.t('longhorn.volume.snapshotAndBackup.actions.revert'),
            onConfirm: async () => {
              await this.doVolumeAction(ACTION_REVERT, { name: row.snapshotName });
            },
          });
          break;
        case ACTION_BACKUP:
          await this.doVolumeAction(ACTION_BACKUP, { name: row.snapshotName });
          break;
        case ACTION_DELETE:
          this.openActionDialog({
            title: this.t('generic.delete'),
            message: this.t('longhorn.volume.snapshotAndBackup.messages.confirmDelete', { name: row.snapshotName }),
            confirmLabel: this.t('generic.delete'),
            confirmButtonClass: 'role-danger',
            onConfirm: async () => {
              if (row.removed) {
                await this.doVolumeAction(ACTION_PURGE);
              } else {
                await this.doVolumeAction(ACTION_DELETE, { name: row.snapshotName });
                await this.doVolumeAction(ACTION_PURGE);
              }
            },
          });
          break;
        default:
          break;
      }
    },
  },
};
</script>

<template>
  <div class="snapshots-backups">
    <SortableTable
      :key="`table-${showRemoved}`"
      :headers="tableHeaders"
      :rows="rows"
      key-field="id"
      :search="false"
      :table-actions="false"
      :row-actions="false"
      default-sort-by="created"
      default-sort-order="desc"
    >
      <template #header-left>
        <div class="header-left-content">
          <Checkbox v-model:value="showRemoved" :label="t('longhorn.volume.snapshotAndBackup.showRemoved')" />
        </div>
      </template>
      <template #header-right>
        <div class="table-actions">
          <button class="btn role-tertiary" :disabled="createSnapshotDisabled" @click="takeSnapshot">
            {{ t('longhorn.volume.snapshotAndBackup.actions.takeSnapshot') }}
          </button>
          <button class="btn role-tertiary" :disabled="createBackupDisabled" @click="createBackup">
            {{ t('longhorn.volume.snapshotAndBackup.actions.createBackup') }}
          </button>
        </div>
      </template>
      <template #col:actions="{ row }">
        <td class="text-center">
          <ActionMenu
            :resource="volume"
            :custom-actions="actionsForRow(row)"
            @action-invoked="(payload) => onRowAction(row, payload)"
          />
        </td>
      </template>
    </SortableTable>
  </div>
</template>

<style lang="scss" scoped>
.snapshots-backups {
  :deep(.fixed-header-actions) {
    align-items: flex-end;
  }

  .header-left-content {
    display: flex;
    align-items: flex-end;
  }

  .table-actions {
    display: flex;
    align-items: flex-end;
    gap: 8px;
  }
}
</style>
