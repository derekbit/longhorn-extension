<script>
import { Card } from '@components/Card';
import SortableTable from '@shell/components/SortableTable';
import {
  formatRecurringJobCron,
  formatRecurringJobGroups,
  formatRecurringJobTask,
  getRecurringJobGroups,
  getRecurringJobName,
} from '@longhorn/utils/recurringjob';
import { EMPTY_DISPLAY } from '@longhorn/types/general';

export default {
  name: 'RecurringJobGroupDetailDialog',

  emits: ['close'],

  components: {
    Card,
    SortableTable,
  },

  props: {
    groupName: {
      type: String,
      default: '',
    },
    recurringJobData: {
      type: Array,
      default: () => [],
    },
  },

  computed: {
    headers() {
      return [
        {
          name: 'name',
          labelKey: 'generic.name',
          value: 'name',
          sort: ['name'],
        },
        {
          name: 'task',
          labelKey: 'longhorn.recurringJob.table.header.task',
          value: 'taskDisplay',
        },
        {
          name: 'groups',
          labelKey: 'longhorn.recurringJob.table.header.groups',
          value: 'groupsDisplay',
        },
        {
          name: 'cron',
          labelKey: 'longhorn.recurringJob.table.header.schedule',
          value: 'cronDisplay',
        },
        {
          name: 'labels',
          labelKey: 'longhorn.recurringJob.table.header.labels',
          value: 'labels',
          formatter: 'KeyValue',
        },
        {
          name: 'retain',
          labelKey: 'longhorn.recurringJob.table.header.retain',
          value: 'retain',
          width: 80,
          align: 'center',
        },
        {
          name: 'concurrency',
          labelKey: 'longhorn.recurringJob.table.header.concurrency',
          value: 'concurrency',
          width: 100,
          align: 'center',
        },
      ];
    },

    rows() {
      return this.recurringJobData
        .filter((job) => getRecurringJobGroups(job).includes(this.groupName))
        .map((job) => {
          const name = getRecurringJobName(job);
          const spec = job?.spec || {};

          return {
            id: name,
            name,
            taskDisplay: formatRecurringJobTask(spec.task),
            groupsDisplay: formatRecurringJobGroups(spec.groups || []),
            cronDisplay: formatRecurringJobCron(spec.cron),
            labels: spec.labels || {},
            retain: spec.retain ?? EMPTY_DISPLAY,
            concurrency: spec.concurrency ?? EMPTY_DISPLAY,
          };
        })
        .sort((firstRow, secondRow) => firstRow.name.localeCompare(secondRow.name));
    },

    title() {
      return this.t('longhorn.recurringJob.dialog.groupDetail.title', { name: this.groupName });
    },
  },

  methods: {
    close() {
      this.$emit('close');
    },
  },
};
</script>

<template>
  <Card class="group-detail-dialog" :show-highlight-border="false">
    <template #title>
      <h4 class="title-text">{{ title }}</h4>
    </template>

    <template #body>
      <SortableTable
        key-field="id"
        :headers="headers"
        :rows="rows"
        :search="false"
        :table-actions="false"
        :row-actions="false"
        default-sort-by="name"
      />
    </template>

    <template #actions>
      <button type="button" class="btn role-primary" @click="close">
        {{ t('generic.close') }}
      </button>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
.title-text {
  margin: 0;
}

.group-detail-dialog {
  min-width: 900px;
}
</style>
