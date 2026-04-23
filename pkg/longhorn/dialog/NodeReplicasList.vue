<script>
import { Card } from '@components/Card';
import SortableTable from '@shell/components/SortableTable';
import { BadgeState } from '@components/BadgeState';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { getReplicaNodeStatus } from '@longhorn/utils/replica-status';

export default {
  name: 'NodeReplicasList',

  emits: ['close'],

  components: {
    Card,
    SortableTable,
    BadgeState,
  },

  props: {
    resources: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      tableRows: [],
      selectedRows: [],
    };
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct']?.inStore;

    if (!inStore) {
      return;
    }

    const allReplicas = (await this.$store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.REPLICAS })) || [];
    const allEngines = (await this.$store.dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.ENGINES })) || [];
    const nodeId = this.nodeId;
    const isDiskRow = this.isDiskRow;
    const diskId = this.diskId;
    const scheduledReplicaMap = this.target?.scheduledReplica || {};
    const scheduledReplicaNames = new Set(Object.keys(scheduledReplicaMap));

    this.tableRows = allReplicas
      .filter((replica) => {
        const hostId = replica?.hostID || replica?.hostId || replica?.spec?.nodeID || replica?.spec?.nodeId;
        const replicaName = replica?.metadata?.name || replica?.name || '';

        if (hostId !== nodeId) {
          return false;
        }

        if (isDiskRow) {
          if (scheduledReplicaNames.size > 0) {
            return scheduledReplicaNames.has(replicaName);
          }

          const replicaDiskId = replica?.spec?.diskID || replica?.diskID;

          return replicaDiskId === diskId;
        }

        return true;
      })
      .map((replica) => {
        const replicaName = replica?.metadata?.name || replica?.name || '';
        const volumeName = replica?.spec?.volumeName || replica?.volumeName || '—';
        const engineCrd = allEngines.find((engine) => engine?.spec?.volumeName === volumeName);
        const mode = String(
          replica?.mode || replica?.status?.mode || engineCrd?.status?.replicaModeMap?.[replicaName] || ''
        ).toLowerCase();
        const running = replica?.running === true || replica?.status?.currentState === 'running';
        const failedAt = replica?.failedAt ?? replica?.spec?.failedAt ?? replica?.status?.failedAt ?? '';

        const status = getReplicaNodeStatus({ running, mode, failedAt });

        return {
          id: replicaName,
          name: replicaName || '—',
          volumeName,
          statusKey: status.key,
          statusColor: status.color,
          resource: replica,
        };
      });
  },

  computed: {
    target() {
      return this.resources?.[0] || {};
    },

    nodeId() {
      return this.target?.metadata?.name || this.target?.nodeId || this.target?.id || this.target?.name || '';
    },

    isDiskRow() {
      return !!this.target?.nodeId;
    },

    diskId() {
      return this.isDiskRow ? this.target?.id || '' : '';
    },

    diskPath() {
      return this.isDiskRow ? this.target?.path || this.target?.name || this.target?.id || '' : '';
    },

    title() {
      return this.isDiskRow
        ? this.t('nodeReplicasList.titleForDisk', { disk: this.diskPath })
        : this.t('nodeReplicasList.title', { node: this.nodeId });
    },

    isLoading() {
      return !!this.$fetchState?.loading;
    },

    headers() {
      return [
        {
          name: 'status',
          labelKey: 'longhorn.replica.table.header.state',
          value: 'statusKey',
          width: 120,
        },
        {
          name: 'name',
          labelKey: 'nodeReplicasList.table.header.replica',
          value: 'name',
        },
        {
          name: 'operation',
          labelKey: 'nodeReplicasList.table.header.operation',
          width: 100,
          align: 'center',
        },
      ];
    },
  },

  methods: {
    close() {
      this.$emit('close');
    },

    onSelection(rows) {
      this.selectedRows = rows;
    },

    toVolume(row) {
      const clusterId = this.$route.params.cluster || 'local';

      if (!row?.volumeName || row.volumeName === '—') {
        return null;
      }

      return {
        name: 'c-cluster-product-resource-namespace-id',
        params: {
          cluster: clusterId,
          product: 'longhorn',
          resource: LONGHORN_RESOURCES.VOLUMES,
          namespace: 'longhorn-system',
          id: row.volumeName,
        },
      };
    },

    toVolumeReplicaTab(row) {
      const volumeRoute = this.toVolume(row);

      if (!volumeRoute) {
        return null;
      }

      return {
        ...volumeRoute,
        hash: '#replicas',
      };
    },

    deleteReplica(row) {
      if (!row?.resource) {
        return;
      }

      this.$store.dispatch('management/promptModal', {
        resources: [row.resource],
        action: 'delete',
      });
    },

    bulkDeleteReplicas() {
      const resources = this.selectedRows.map((row) => row.resource).filter((resource) => !!resource);

      if (!resources.length) {
        return;
      }

      this.$store.dispatch('management/promptModal', {
        resources,
        action: 'delete',
      });
    },
  },
};
</script>

<template>
  <Card class="node-replicas-dialog" :show-highlight-border="false">
    <template #title>
      <h4 class="text-default-text">
        {{ title }}
      </h4>
    </template>

    <template #body>
      <SortableTable
        :rows="tableRows"
        :headers="headers"
        key-field="id"
        :search="false"
        :loading="isLoading"
        :table-actions="true"
        :row-actions="false"
        :paging="true"
        @selection="onSelection"
      >
        <template #cell:status="{ row }">
          <BadgeState :label="t(`longhorn.replica.status.${row.statusKey}`)" :color="row.statusColor" />
        </template>

        <template #cell:name="{ row, value }">
          <router-link v-if="toVolumeReplicaTab(row)" :to="toVolumeReplicaTab(row)" @click="close">
            {{ value }}
          </router-link>
          <span v-else>{{ value }}</span>
        </template>

        <template #cell:operation="{ row }">
          <button type="button" class="btn btn-sm role-link" :disabled="isLoading" @click="deleteReplica(row)">
            {{ t('generic.delete') }}
          </button>
        </template>
      </SortableTable>
    </template>

    <template #actions>
      <button type="button" class="btn role-secondary" @click="close">
        {{ t('generic.cancel') }}
      </button>
      <div class="spacer" />
      <button
        type="button"
        class="btn bg-error ml-10"
        :disabled="isLoading || !selectedRows.length"
        @click="bulkDeleteReplicas"
      >
        {{ t('generic.delete') }}
      </button>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
:deep(.card-actions) {
  .spacer {
    flex: 1;
  }
}
</style>
