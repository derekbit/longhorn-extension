<script>
import SortableTable from '@shell/components/SortableTable';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import NodeName from '@longhorn/formatters/NodeName';

export default {
  name: 'VolumeAttachments',

  components: { SortableTable, NodeName },

  props: {
    value: {
      type: Object,
      required: true,
    },
  },

  async fetch() {
    const inStore = this.$store.getters['currentProduct']?.inStore;
    const resourceType = LONGHORN_RESOURCES.VOLUME_ATTACHMENTS;

    if (inStore && this.$store.getters[`${inStore}/schemaFor`](resourceType)) {
      try {
        await this.$store.dispatch(`${inStore}/findAll`, { type: resourceType });
      } catch (fetchError) {
        // eslint-disable-next-line no-console
        console.error(`[Longhorn] Failed to fetch ${resourceType}:`, fetchError);
      }
    }
  },

  computed: {
    rows() {
      return this.value.attachmentRows || [];
    },

    tableHeaders() {
      return [
        {
          name: 'attachmentID',
          label: this.t('longhorn.volume.attachments.table.header.attachmentId'),
          sort: 'attachmentID',
        },
        {
          name: 'attachmentType',
          label: this.t('longhorn.volume.attachments.table.header.type'),
          sort: 'attachmentType',
        },
        {
          name: 'nodeID',
          label: this.t('longhorn.volume.attachments.table.header.node'),
          sort: 'nodeID',
          formatter: 'NodeName',
        },
        {
          name: 'satisfied',
          label: this.t('longhorn.volume.attachments.table.header.satisfied'),
          sort: 'satisfied',
          align: 'center',
        },
        {
          name: 'lastTransitionTime',
          label: this.t('longhorn.volume.attachments.table.header.lastTransition'),
          sort: 'lastTransitionTime',
          formatter: 'LiveDate',
        },
      ];
    },
  },

  methods: {
    getIncompleteMessage(row) {
      const firstCondition = row.conditions?.[0];

      return firstCondition?.message || this.t('longhorn.volume.attachments.messages.criteriaNotSatisfied');
    },
  },
};
</script>

<template>
  <div class="volume-attachments">
    <SortableTable
      :headers="tableHeaders"
      :rows="rows"
      key-field="id"
      :search="false"
      :table-actions="false"
      :row-actions="false"
      default-sort-by="attachmentID"
    >
      <template #cell:satisfied="{ row, value: isSatisfied }">
        <span v-if="isSatisfied">{{ t('longhorn.volume.attachments.value.yes') }}</span>
        <span v-else v-clean-tooltip="getIncompleteMessage(row)" class="cursor-help">{{
          t('longhorn.volume.attachments.value.no')
        }}</span>
      </template>

      <template #cell:nodeID="{ value: nodeId }">
        <NodeName :value="nodeId" />
      </template>
    </SortableTable>
  </div>
</template>

<style lang="scss" scoped></style>
