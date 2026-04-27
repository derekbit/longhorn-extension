<script>
import SortableTable from '@shell/components/SortableTable';
import {
  formatRecurringJobCron,
  formatRecurringJobGroups,
  formatRecurringJobTask,
  getRecurringJobSelectorsFromLabels,
} from '@longhorn/utils/recurringjob';

export default {
  name: 'VolumeRecurringJobs',

  components: { SortableTable },

  props: {
    value: {
      type: Object,
      required: true,
    },
    recurringJobData: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },

  computed: {
    currentSelectors() {
      return getRecurringJobSelectorsFromLabels(this.value?.metadata?.labels || {});
    },

    jobRows() {
      const { jobs } = this.currentSelectors;

      return jobs
        .map((name) => {
          const matchedJob = this.recurringJobData.find((job) => (job.metadata?.name || job.name) === name);
          const spec = matchedJob?.spec || {};

          return {
            id: name,
            name,
            isAlreadyDeleted: !matchedJob,
            taskDisplay: formatRecurringJobTask(spec.task),
            groupsDisplay: formatRecurringJobGroups(spec.groups || []),
            cronDisplay: formatRecurringJobCron(spec.cron),
            labels: spec.labels || {},
            retain: spec.retain ?? '—',
            concurrency: spec.concurrency ?? '—',
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    groupRows() {
      const { groups } = this.currentSelectors;

      return groups
        .map((name) => {
          const hasExistingJobs = this.recurringJobData.some((job) => {
            const jobGroups = job.spec?.groups || job.groups || [];

            return jobGroups.includes(name);
          });

          return {
            id: name,
            name,
            isAlreadyDeleted: !hasExistingJobs,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    jobHeaders() {
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
          width: 80,
          align: 'center',
        },
      ];
    },

    groupHeaders() {
      return [
        {
          name: 'name',
          labelKey: 'generic.name',
          value: 'name',
          sort: ['name'],
        },
      ];
    },
  },
};
</script>

<template>
  <div class="recurring-jobs">
    <div class="table-container mb-30">
      <div class="header-row mb-10">
        <h3>{{ t('longhorn.recurringJob.detail.jobs') }}</h3>
      </div>
      <SortableTable
        :headers="jobHeaders"
        :rows="jobRows"
        key-field="id"
        :search="false"
        :loading="loading"
        :row-actions="false"
        :table-actions="false"
        default-sort-by="name"
      >
        <template #col:name="{ row }">
          <td>
            <div class="cell-with-icon" :class="{ 'text-muted': row.isAlreadyDeleted }">
              <span class="text-name">{{ row.name }}</span>
              <i
                v-if="row.isAlreadyDeleted"
                v-clean-tooltip="t('longhorn.recurringJob.detail.jobMissing')"
                class="icon icon-warning text-error ml-5"
              />
            </div>
          </td>
        </template>
      </SortableTable>
    </div>

    <div class="table-container">
      <div class="header-row mb-10">
        <h3>{{ t('longhorn.recurringJob.detail.groups') }}</h3>
      </div>
      <SortableTable
        :headers="groupHeaders"
        :rows="groupRows"
        key-field="id"
        :search="false"
        :loading="loading"
        :row-actions="false"
        :table-actions="false"
        default-sort-by="name"
      >
        <template #col:name="{ row }">
          <td>
            <div class="cell-with-icon">
              <span class="text-name">{{ row.name }}</span>
              <i
                v-if="row.isAlreadyDeleted"
                v-clean-tooltip="
                  row.name === 'default'
                    ? t('longhorn.recurringJob.detail.defaultGroupEmpty')
                    : t('longhorn.recurringJob.detail.groupMissing')
                "
                class="icon icon-warning text-error ml-5"
              />
            </div>
          </td>
        </template>
      </SortableTable>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.recurring-jobs {
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .cell-with-icon {
    display: flex;
    align-items: center;

    .text-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 250px;
    }
  }
}
</style>
