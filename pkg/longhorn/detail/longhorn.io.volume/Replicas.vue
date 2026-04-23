<script>
import SortableTable from '@shell/components/SortableTable';
import { BadgeState } from '@components/BadgeState';
import { getReplicaSyncStatus } from '@longhorn/utils/replica-status';

export default {
  name: 'VolumeReplicas',

  components: {
    SortableTable,
    BadgeState,
  },

  props: {
    value: {
      type: Object,
      required: true,
    },
    replicas: {
      type: Array,
      required: true,
    },
    engines: {
      type: Array,
      default: () => [],
    },
    nodes: {
      type: Array,
      default: () => [],
    },
  },

  computed: {
    rows() {
      const volumeName = this.value?.metadata?.name;
      const volState = this.value?.state || '';
      const engineCrd = this.engines.find((e) => e.spec?.volumeName === volumeName);

      return this.replicas.map((replica) => {
        const replicaName = replica.metadata?.name || replica.id;
        const tokens = replicaName.split('-');
        const shortName = tokens.slice(Math.max(tokens.length - 3, 0)).join('-');

        const mode = (engineCrd?.status?.replicaModeMap?.[replicaName] || '').toLowerCase();
        const hasFailed = !!(replica.status?.failedAt || replica.spec?.failedAt);

        const syncState = getReplicaSyncStatus({ mode, hasFailed });

        const canDelete = this.value.isAttached;
        const deleteDisabledTooltip = !canDelete
          ? `Replica belongs to volume currently ${volState}. Volume must be attached.`
          : '';

        return {
          ...replica,
          id: replica.id || replicaName,
          name: replicaName,
          shortName,
          syncModeKey: syncState.key,
          syncModeColor: syncState.color,
          processRunning: replica.status?.currentState === 'running',
          hostId: replica.spec?.nodeID || '',
          instanceManagerName: replica.status?.instanceManagerName || '—',
          diskPath: replica.spec?.diskPath || '—',
          dataPath: replica.spec?.diskPath ? `${replica.spec.diskPath}replicas/${replicaName}` : '—',
          canDelete,
          deleteDisabledTooltip,
        };
      });
    },

    tableHeaders() {
      return [
        {
          name: 'sync-state',
          label: this.t('longhorn.replica.table.header.state'),
          value: 'syncModeKey',
          width: 100,
        },
        {
          name: 'process-state',
          label: 'Process',
          value: 'processRunning',
          width: 80,
        },
        {
          name: 'short-name',
          label: 'Name',
          value: 'shortName',
        },
        {
          name: 'node',
          label: 'Node',
          value: 'hostId',
          formatter: 'NodeName',
        },
        {
          name: 'instanceManager',
          label: 'Instance Manager',
          value: 'instanceManagerName',
        },
        {
          name: 'diskPath',
          label: 'Disk Path',
          value: 'diskPath',
        },
        {
          name: 'actions',
          label: '',
          width: 40,
        },
      ];
    },
  },

  methods: {
    async deleteReplica(row) {
      this.$store.dispatch('management/promptModal', {
        resources: [row],
        action: 'delete',
      });
    },
  },
};
</script>

<template>
  <div class="volume-replicas">
    <SortableTable
      :rows="rows"
      :headers="tableHeaders"
      key-field="id"
      :search="false"
      :table-actions="false"
      :row-actions="false"
      default-sort-by="short-name"
    >
      <template #col:process-state="{ row }">
        <td>
          <BadgeState
            :label="row.processRunning ? 'Running' : 'Stopped'"
            :color="row.processRunning ? 'bg-success' : 'bg-darker'"
          />
        </td>
      </template>

      <template #col:sync-state="{ row }">
        <td>
          <BadgeState :label="t(`longhorn.replica.status.${row.syncModeKey}`)" :color="row.syncModeColor" />
        </td>
      </template>

      <template #col:short-name="{ row }">
        <td>
          <span v-clean-tooltip="row.name">
            {{ row.shortName }}
          </span>
        </td>
      </template>

      <template #col:diskPath="{ row }">
        <td>
          <span v-clean-tooltip="row.dataPath">
            {{ row.diskPath }}
          </span>
        </td>
      </template>

      <template #col:actions="{ row }">
        <td class="text-center">
          <button
            v-clean-tooltip="row.deleteDisabledTooltip"
            type="button"
            class="btn btn-sm role-link"
            :disabled="!row.canDelete"
            @click="deleteReplica(row)"
          >
            <i class="icon icon-trash" />
          </button>
        </td>
      </template>
    </SortableTable>
  </div>
</template>

<style lang="scss" scoped>
.volume-replicas {
  .role-link {
    padding: 0;

    &:disabled {
      color: var(--disabled-text) !important;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      background: transparent;
      transform: scale(1.1);
    }

    .icon-trash {
      font-size: 18px;
    }
  }
}
</style>
