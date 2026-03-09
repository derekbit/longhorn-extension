<script>
import SortableTable from '@shell/components/SortableTable';
import Checkbox from '@components/Form/Checkbox/Checkbox';
import { formatSi } from '@shell/utils/units';

export default {
  name: 'VolumeSnapshotsAndBackups',

  components: { SortableTable, Checkbox },

  props: {
    value: {
      type: Object,
      required: true,
    },
    dataSource: {
      type: Array,
      default: () => [],
    },
    backupVolume: {
      type: Object,
      default: null,
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
        .filter((item) => (item.metadata?.name || item.name) !== 'volume-head')
        .map((item) => {
          const name = item.metadata?.name || item.name;
          const isBackup = item.type === 'backup';
          const size = item.backupStatusObject?.size || item.status?.size || item.size || 0;

          return {
            ...item,
            id: name,
            snapshotName: name,
            displayType: isBackup ? 'Backup' : 'Snapshot',
            displaySize: this.formatBinary(size),
            parentID: item.status?.parent || item.spec?.parent || '—',
            replicaAddress: item.backupStatusObject?.replicaAddress || '—',
            backups: item.backupStatusObject?.backupIds?.[0] || '—',
            createdTS: item.metadata?.creationTimestamp || item.created,
          };
        });
    },

    tableHeaders() {
      return [
        {
          name: 'type',
          label: 'Type',
          value: 'displayType',
          width: 80,
        },
        {
          name: 'snapshotName',
          label: 'Name',
          value: 'snapshotName',
        },
        {
          name: 'parentID',
          label: 'Parent ID',
          value: 'parentID',
        },
        {
          name: 'size',
          label: 'Size',
          value: 'displaySize',
          width: 80,
        },
        {
          name: 'replicaAddress',
          label: 'Replica Address',
          value: 'replicaAddress',
        },
        {
          name: 'backups',
          label: 'Backups',
          value: 'backups',
        },
        {
          name: 'created',
          label: 'Created',
          value: 'createdTS',
          width: 100,
          formatter: 'LiveDate',
          sort: ['createdTS:desc'],
        },
      ];
    },
  },

  methods: {
    filterRemoved(data) {
      if (!data || data.length === 0) return [];

      const itemMap = new Map(data.map((item) => [item.metadata?.name || item.name, { ...item }]));
      const namesToRemove = new Set();

      for (const item of itemMap.values()) {
        const name = item.metadata?.name || item.name;
        const isSystemOrRemoved =
          item.removed || item.status?.markRemoved || (item.spec?.userCreated === false && name !== 'volume-head');

        if (isSystemOrRemoved) {
          namesToRemove.add(name);
        }
      }

      for (const name of namesToRemove) {
        const item = itemMap.get(name);

        if (!item) continue;

        const parentName = item.status?.parent || item.spec?.parent || '';
        const childrenNames = Object.keys(item.status?.children || item.children || {});

        if (parentName && itemMap.has(parentName)) {
          const parent = itemMap.get(parentName);
          const pChildren = { ...(parent.status?.children || parent.children || {}) };

          delete pChildren[name];
          childrenNames.forEach((cName) => {
            pChildren[cName] = true;
          });

          if (parent.status) parent.status.children = pChildren;
          else parent.children = pChildren;
        }

        childrenNames.forEach((cName) => {
          const child = itemMap.get(cName);

          if (child) {
            if (child.status) child.status.parent = parentName;
            if (child.spec) child.spec.parent = parentName;
          }
        });
      }

      return Array.from(itemMap.values()).filter((item) => !namesToRemove.has(item.metadata?.name || item.name));
    },

    formatBinary(bytes) {
      return formatSi(bytes, {
        suffix: 'iB',
        firstSpread: 1024,
        increment: 1024,
      });
    },
  },
};
</script>

<template>
  <div class="snapshots-backups">
    <div class="filter-bar mb-10">
      <Checkbox v-model:value="showRemoved" label="Show System/Removed Snapshots" />
    </div>

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
    />
  </div>
</template>

<style lang="scss" scoped>
.snapshots-backups {
  .filter-bar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
}
</style>
