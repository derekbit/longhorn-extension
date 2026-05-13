<script>
import SortableTable from '@shell/components/SortableTable';
import ActionMenu from '@shell/components/ActionMenuShell.vue';
import {
  RECURRING_JOB_SELECTOR_TYPE,
  buildRecurringJobSelectorLabelKey,
  formatRecurringJobCron,
  formatRecurringJobGroups,
  formatRecurringJobTask,
  getRecurringJobGroups,
  getRecurringJobName,
  getRecurringJobSelectorsFromLabels,
} from '@longhorn/utils/recurringjob';
import { EMPTY_DISPLAY } from '@longhorn/types/general';

const ACTION_EDIT = 'edit';
const ACTION_DELETE = 'delete';

export default {
  name: 'VolumeRecurringJobs',

  components: {
    SortableTable,
    ActionMenu,
  },

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

    addRecurringJob() {
      this.$store.dispatch('management/promptModal', {
        resources: [this.value],
        component: 'AddRecurringJobDialog',
      });
    },

    addRecurringJobGroup() {
      this.$store.dispatch('management/promptModal', {
        resources: [this.value],
        component: 'AddRecurringJobGroupDialog',
        componentProps: {
          recurringJobData: this.recurringJobData,
        },
      });
    },

    async removeSelector(name, isGroup = false) {
      const target = isGroup
        ? this.t('longhorn.recurringJob.messages.selectorTarget.group')
        : this.t('longhorn.recurringJob.messages.selectorTarget.job');

      this.openActionDialog({
        title: this.t('generic.delete'),
        message: this.t('longhorn.recurringJob.messages.confirmDeleteSelector', { target, name }),
        confirmLabel: this.t('generic.delete'),
        confirmButtonClass: 'role-danger',
        onConfirm: async () => {
          const selectorType = isGroup ? RECURRING_JOB_SELECTOR_TYPE.GROUP : RECURRING_JOB_SELECTOR_TYPE.JOB;
          const labelKey = buildRecurringJobSelectorLabelKey(name, selectorType);

          if (!this.value?.metadata?.labels?.[labelKey]) {
            return;
          }

          delete this.value.metadata.labels[labelKey];
          await this.value.save();
        },
      });
    },

    editRecurringJob(row) {
      if (!row?.resource || row.isAlreadyDeleted) {
        return;
      }

      if (typeof row.resource.goToEdit === 'function') {
        row.resource.goToEdit();
      }
    },

    jobActions(row) {
      return [
        {
          action: ACTION_EDIT,
          label: this.t('generic.edit'),
          enabled: !row?.isAlreadyDeleted,
        },
        {
          action: ACTION_DELETE,
          label: this.t('generic.delete'),
          enabled: true,
        },
      ];
    },

    groupActions() {
      return [
        {
          action: ACTION_DELETE,
          label: this.t('generic.delete'),
          enabled: true,
        },
      ];
    },

    onJobAction(row, payload) {
      switch (payload?.action) {
        case ACTION_EDIT:
          this.editRecurringJob(row);
          break;
        case ACTION_DELETE:
          this.removeSelector(row.name);
          break;
        default:
          break;
      }
    },

    onGroupAction(row, payload) {
      if (payload?.action === ACTION_DELETE) {
        this.removeSelector(row.name, true);
      }
    },

    recurringJobsInGroup(groupName) {
      return this.recurringJobData.filter((job) => getRecurringJobGroups(job).includes(groupName));
    },

    showGroupDetail(row) {
      this.$store.dispatch('management/promptModal', {
        component: 'RecurringJobGroupDetailDialog',
        componentProps: {
          groupName: row.name,
          recurringJobData: this.recurringJobData,
        },
      });
    },
  },

  computed: {
    EMPTY_DISPLAY() {
      return EMPTY_DISPLAY;
    },
    canAddRecurringJobs() {
      // TODO: Check volume actions when available
      // Currently volume.actions is not populated
      return true;
    },

    currentSelectors() {
      return getRecurringJobSelectorsFromLabels(this.value?.metadata?.labels || {});
    },

    jobRows() {
      const { jobs } = this.currentSelectors;

      return jobs
        .map((name) => {
          const matchedJob = this.recurringJobData.find((job) => getRecurringJobName(job) === name);
          const spec = matchedJob?.spec || {};

          return {
            id: name,
            name,
            resource: matchedJob,
            isAlreadyDeleted: !matchedJob,
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

    groupRows() {
      const { groups } = this.currentSelectors;

      return groups
        .map((name) => {
          const jobs = this.recurringJobsInGroup(name);

          return {
            id: name,
            name,
            isAlreadyDeleted: jobs.length === 0,
          };
        })
        .sort((firstRow, secondRow) => firstRow.name.localeCompare(secondRow.name));
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
        {
          name: 'actions',
          label: '',
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
        {
          name: 'actions',
          label: '',
          width: 80,
          align: 'center',
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
        <template #header-right>
          <button :disabled="!canAddRecurringJobs" class="btn role-tertiary" @click="addRecurringJob">
            {{ t('generic.add') }}
          </button>
        </template>
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
        <template #col:actions="{ row }">
          <td class="text-center">
            <ActionMenu
              :resource="row.resource || value"
              :custom-actions="jobActions(row)"
              @action-invoked="(payload) => onJobAction(row, payload)"
            />
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
        <template #header-right>
          <button :disabled="!canAddRecurringJobs" class="btn role-tertiary" @click="addRecurringJobGroup">
            {{ t('generic.add') }}
          </button>
        </template>
        <template #col:name="{ row }">
          <td>
            <button class="group-name-link" type="button" @click="showGroupDetail(row)">
              {{ row.name }}
            </button>
            <i
              v-if="row.isAlreadyDeleted"
              v-clean-tooltip="
                row.name === 'default'
                  ? t('longhorn.recurringJob.detail.defaultGroupEmpty')
                  : t('longhorn.recurringJob.detail.groupMissing')
              "
              class="icon icon-warning text-error ml-5"
            />
          </td>
        </template>
        <template #col:actions="{ row }">
          <td class="text-center">
            <ActionMenu
              :resource="value"
              :custom-actions="groupActions()"
              @action-invoked="(payload) => onGroupAction(row, payload)"
            />
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

  .group-name-link {
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--link);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }

  .group-name-link:hover {
    color: var(--link-hover);
  }

  .group-name-link:focus-visible {
    outline: 1px solid var(--primary);
    outline-offset: 2px;
  }

  .group-name-link + .icon {
    vertical-align: middle;
  }

  .group-name-link,
  .text-name {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .group-name-link {
    display: inline-block;
  }

  .text-name {
    display: inline-block;
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
