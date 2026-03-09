<script>
import SortableTable from '@shell/components/SortableTable';
import { LONGHORN_LABELS } from '@longhorn/types/resources';

const STATUS = { ENABLED: 'enabled' };
const PREFIX = {
  JOB: `${LONGHORN_LABELS.RECURRING_JOB}/`,
  GROUP: `${LONGHORN_LABELS.RECURRING_JOB_GROUP}/`,
};

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
      const labels = this.value?.metadata?.labels || {};

      return Object.entries(labels).reduce(
        (acc, [key, value]) => {
          if (value?.toLowerCase() !== STATUS.ENABLED) return acc;

          if (key.startsWith(PREFIX.JOB)) {
            acc.jobs.push(key.replace(PREFIX.JOB, ''));
          } else if (key.startsWith(PREFIX.GROUP)) {
            acc.groups.push(key.replace(PREFIX.GROUP, ''));
          }

          return acc;
        },
        { jobs: [], groups: [] }
      );
    },

    jobRows() {
      const { jobs } = this.currentSelectors;

      return jobs
        .map((name) => {
          const matchedJob = this.recurringJobData.find((j) => (j.metadata?.name || j.name) === name);
          const spec = matchedJob?.spec || {};

          return {
            id: name,
            name,
            isAlreadyDeleted: !matchedJob,
            task: spec.task || '—',
            groups: spec.groups || [],
            cron: spec.cron || '',
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
          const hasExistingJobs = this.recurringJobData.some((j) => {
            const jobGroups = j.spec?.groups || j.groups || [];

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
          label: 'Name',
          value: 'name',
          sort: ['name'],
        },
        {
          name: 'task',
          label: 'Type',
          value: 'task',
        },
        {
          name: 'groups',
          label: 'Groups',
          value: 'groups',
        },
        {
          name: 'cron',
          label: 'Schedule',
          value: 'cron',
          formatter: 'CronSchedule',
        },
        {
          name: 'labels',
          label: 'Labels',
          value: 'labels',
          formatter: 'KeyValue',
        },
        {
          name: 'retain',
          label: 'Retain',
          value: 'retain',
          width: 80,
          align: 'center',
        },
        {
          name: 'concurrency',
          label: 'Concurrency',
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
          label: 'Name',
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
        <h3>Jobs</h3>
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
                v-clean-tooltip="'Recurring Job configuration not found'"
                class="icon icon-warning text-error ml-5"
              />
            </div>
          </td>
        </template>

        <template #col:groups="{ row }">
          <td>
            <template v-if="row.groups && row.groups.length">
              <span v-for="(group, idx) in row.groups" :key="group">
                {{ group }}{{ idx < row.groups.length - 1 ? ', ' : '' }}
              </span>
            </template>
            <span v-else class="text-muted">—</span>
          </td>
        </template>
      </SortableTable>
    </div>

    <div class="table-container">
      <div class="header-row mb-10">
        <h3>Groups</h3>
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
                    ? 'The default group is empty (no jobs assigned)'
                    : 'Recurring Job Group definition not found'
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
