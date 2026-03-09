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
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`[Longhorn] Failed to fetch ${resourceType}:`, e);
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
          label: 'Attachment ID',
          sort: 'attachmentID',
        },
        {
          name: 'attachmentType',
          label: 'Type',
          sort: 'attachmentType',
        },
        {
          name: 'nodeID',
          label: 'Node',
          sort: 'nodeID',
          formatter: 'NodeName',
        },
        {
          name: 'satisfied',
          label: 'Satisfied',
          sort: 'satisfied',
          align: 'center',
        },
        {
          name: 'lastTransitionTime',
          label: 'Last Transition',
          sort: 'lastTransitionTime',
          formatter: 'LiveDate',
        },
      ];
    },
  },

  methods: {
    getIncompleteMessage(row) {
      const firstCondition = row.conditions?.[0];

      return firstCondition?.message || 'Attachment criteria not yet satisfied';
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
      <template #cell:satisfied="{ row, value }">
        <span v-if="value">Yes</span>
        <span v-else v-clean-tooltip="getIncompleteMessage(row)" class="text-warning cursor-help">
          No
          <i class="icon icon-info ml-5 text-muted" />
        </span>
      </template>

      <template #cell:nodeID="{ value }">
        <NodeName :value="value" />
      </template>
    </SortableTable>
  </div>
</template>

<style lang="scss" scoped></style>
