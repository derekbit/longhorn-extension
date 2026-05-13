<script>
import { Card } from '@components/Card';
import SortableTable from '@shell/components/SortableTable';
import { CONDITION_STATUS } from '@longhorn/types/node';
import { EMPTY_DISPLAY } from '@longhorn/types/general';

const CONDITION_TYPE = {
  READY: 'Ready',
  SCHEDULABLE: 'Schedulable',
  ALLOW_SCHEDULING: 'Allow Scheduling',
  AUTO_EVICTING: 'Auto Evicting',
};

export default {
  name: 'NodeReadinessDialog',

  components: {
    Card,
    SortableTable,
  },

  emits: ['close'],

  props: {
    resources: {
      type: Array,
      default: () => [],
    },
  },

  computed: {
    node() {
      return this.resources?.[0] || {};
    },

    nodeName() {
      return this.node?.metadata?.name || this.node?.id || this.node?.name || EMPTY_DISPLAY;
    },

    readyCondition() {
      return this.node?.readyCondition || this.findCondition('Ready');
    },

    schedulableCondition() {
      return this.node?.schedulableCondition || this.findCondition('Schedulable');
    },

    headers() {
      return [
        {
          name: 'condition',
          label: this.t('nodeReadinessDialog.table.header.condition'),
          value: 'condition',
          width: 150,
        },
        {
          name: 'status',
          label: this.t('nodeReadinessDialog.table.header.status'),
          value: 'status',
          width: 120,
        },
        {
          name: 'message',
          label: this.t('nodeReadinessDialog.table.header.message'),
          value: 'message',
        },
      ];
    },

    rows() {
      return [
        {
          id: 'ready',
          condition: CONDITION_TYPE.READY,
          status: this.getConditionStatus(this.readyCondition),
          message: this.readyCondition?.message || EMPTY_DISPLAY,
        },
        {
          id: 'schedulable',
          condition: CONDITION_TYPE.SCHEDULABLE,
          status: this.getConditionStatus(this.schedulableCondition),
          message: this.schedulableCondition?.message || EMPTY_DISPLAY,
        },
        {
          id: 'allowScheduling',
          condition: CONDITION_TYPE.ALLOW_SCHEDULING,
          status: this.node?.spec?.allowScheduling === false ? CONDITION_STATUS.FALSE : CONDITION_STATUS.TRUE,
          message: EMPTY_DISPLAY,
        },
        {
          id: 'autoEvicting',
          condition: CONDITION_TYPE.AUTO_EVICTING,
          status: this.node?.status?.autoEvicting ? CONDITION_STATUS.TRUE : CONDITION_STATUS.FALSE,
          message: EMPTY_DISPLAY,
        },
      ];
    },
  },

  methods: {
    findCondition(type) {
      return (this.node?.status?.conditions || []).find((condition) => condition?.type === type) || {};
    },

    getConditionStatus(condition) {
      return condition?.status || EMPTY_DISPLAY;
    },

    close() {
      this.$emit('close');
    },
  },
};
</script>

<template>
  <Card class="node-readiness-dialog" :show-highlight-border="false">
    <template #title>
      <h4 class="text-default-text">
        {{ t('nodeReadinessDialog.title', { node: nodeName }) }}
      </h4>
    </template>

    <template #body>
      <SortableTable
        :headers="headers"
        :rows="rows"
        key-field="id"
        :search="false"
        :table-actions="false"
        :row-actions="false"
        :paging="false"
      />
    </template>

    <template #actions>
      <button type="button" class="btn role-secondary" @click="close">
        {{ t('generic.cancel') }}
      </button>
    </template>
  </Card>
</template>
