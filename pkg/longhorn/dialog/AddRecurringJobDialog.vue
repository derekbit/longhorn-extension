<script>
import { Card } from '@components/Card';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import ArrayList from '@shell/components/form/ArrayList';
import KeyValue from '@shell/components/form/KeyValue';
import { Checkbox } from '@components/Form/Checkbox';
import AsyncButton from '@shell/components/AsyncButton';
import { Banner } from '@components/Banner';
import FormValidation from '@shell/mixins/form-validation';
import CronExpressionEditorModal from '@shell/components/Cron/CronExpressionEditorModal';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import {
  RECURRING_JOB_DEFAULT_SPEC,
  RECURRING_JOB_FORCE_CREATE_SUFFIX,
  RECURRING_JOB_FORCE_CREATE_SUPPORTED_TASKS,
  RECURRING_JOB_TASK,
  RECURRING_JOB_TASKS_WITHOUT_RETAIN,
  RECURRING_JOB_TASKS_WITHOUT_GROUPS_AND_LABELS,
} from '@longhorn/types/recurringjob';
import {
  RECURRING_JOB_SELECTOR_ENABLED,
  RECURRING_JOB_SELECTOR_TYPE,
  buildRecurringJobSelectorLabelKey,
  getRecurringJobName,
  getRecurringJobSelectorPrefix,
  sanitizeRecurringJobParameters,
} from '@longhorn/utils/recurringjob';
import { exceptionToErrorsArray } from '@shell/utils/error';

const RECURRING_JOB_TASK_OPTIONS = [
  { label: 'Backup', value: RECURRING_JOB_TASK.BACKUP },
  { label: 'Snapshot', value: RECURRING_JOB_TASK.SNAPSHOT },
  { label: 'Snapshot Delete', value: RECURRING_JOB_TASK.SNAPSHOT_DELETE },
  { label: 'Snapshot Cleanup', value: RECURRING_JOB_TASK.SNAPSHOT_CLEANUP },
  { label: 'System Backup', value: RECURRING_JOB_TASK.SYSTEM_BACKUP },
  { label: 'Filesystem Trim', value: RECURRING_JOB_TASK.FILESYSTEM_TRIM },
];

export default {
  name: 'AddRecurringJobDialog',

  emits: ['close'],

  components: {
    Card,
    LabeledInput,
    LabeledSelect,
    ArrayList,
    KeyValue,
    Checkbox,
    AsyncButton,
    Banner,
    CronExpressionEditorModal,
  },

  mixins: [FormValidation],

  props: {
    resources: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      isNew: true,
      existingJobName: '',
      allRecurringJobs: [],
      name: '',
      task: RECURRING_JOB_TASK.SNAPSHOT,
      forceCreate: false,
      retain: RECURRING_JOB_DEFAULT_SPEC.retain,
      concurrency: RECURRING_JOB_DEFAULT_SPEC.concurrency,
      cron: RECURRING_JOB_DEFAULT_SPEC.cron,
      groups: [],
      labels: {},
      showCronModal: false,
      errors: [],
      fvFormRuleSets: [
        { path: 'name', rules: ['required'] },
        { path: 'cron', rules: ['required'] },
      ],
    };
  },

  async mounted() {
    const inStore = this.$store.getters['currentProduct']?.inStore || 'cluster';

    this.allRecurringJobs = await this.$store
      .dispatch(`${inStore}/findAll`, { type: LONGHORN_RESOURCES.RECURRING_JOBS })
      .catch(() => []);
  },

  computed: {
    volume() {
      return this.resources?.[0] || {};
    },

    inStore() {
      return this.$store.getters['currentProduct']?.inStore || 'cluster';
    },

    taskOptions() {
      return RECURRING_JOB_TASK_OPTIONS;
    },

    isForceCreateSupported() {
      return RECURRING_JOB_FORCE_CREATE_SUPPORTED_TASKS.includes(this.task);
    },

    isRetainDisabled() {
      return RECURRING_JOB_TASKS_WITHOUT_RETAIN.includes(this.task);
    },

    shouldShowConcurrency() {
      return this.task !== RECURRING_JOB_TASK.SYSTEM_BACKUP;
    },

    shouldShowGroupsAndLabels() {
      return !RECURRING_JOB_TASKS_WITHOUT_GROUPS_AND_LABELS.includes(this.task);
    },

    isSubmitDisabled() {
      return this.isNew ? !this.fvFormIsValid : !this.existingJobName;
    },

    existingJobOptions() {
      const jobSelectorPrefix = getRecurringJobSelectorPrefix(RECURRING_JOB_SELECTOR_TYPE.JOB);
      const assignedJobs = Object.keys(this.volume?.metadata?.labels || {})
        .filter((key) => key.startsWith(jobSelectorPrefix))
        .map((key) => key.replace(jobSelectorPrefix, ''));

      return (this.allRecurringJobs || [])
        .map((job) => getRecurringJobName(job))
        .filter((jobName) => !!jobName && !assignedJobs.includes(jobName))
        .map((jobName) => ({ label: jobName, value: jobName }));
    },
  },

  watch: {
    task(newTask) {
      if (RECURRING_JOB_TASKS_WITHOUT_RETAIN.includes(newTask)) {
        this.retain = 0;
      } else if (this.retain === 0) {
        this.retain = RECURRING_JOB_DEFAULT_SPEC.retain;
      }

      if (newTask === RECURRING_JOB_TASK.SYSTEM_BACKUP) {
        this.concurrency = 1;
      }
    },
  },

  methods: {
    close() {
      this.$emit('close');
    },

    async save(buttonDone) {
      this.errors = [];

      if (this.isNew && !this.fvFormIsValid) {
        buttonDone(false);

        return;
      }

      if (!this.isNew && !this.existingJobName) {
        this.errors = [this.t('longhorn.recurringJob.dialog.add.required')];
        buttonDone(false);

        return;
      }

      try {
        const volume = this.volume;

        if (!volume.metadata.labels) {
          volume.metadata.labels = {};
        }

        if (this.isNew) {
          const finalTask =
            this.forceCreate && this.isForceCreateSupported
              ? `${this.task}${RECURRING_JOB_FORCE_CREATE_SUFFIX}`
              : this.task;

          // Step 1: Create the recurring job CRD
          const jobResource = await this.$store.dispatch(`${this.inStore}/create`, {
            type: LONGHORN_RESOURCES.RECURRING_JOBS,
            metadata: {
              name: this.name.trim(),
              namespace: LONGHORN_NAMESPACE,
            },
            spec: {
              name: this.name.trim(),
              task: finalTask,
              retain: this.isRetainDisabled ? 0 : Number(this.retain),
              concurrency: this.shouldShowConcurrency ? Number(this.concurrency) : 1,
              cron: this.cron,
              groups: this.shouldShowGroupsAndLabels ? [...this.groups] : [],
              labels: this.shouldShowGroupsAndLabels ? { ...this.labels } : {},
              parameters: sanitizeRecurringJobParameters({}),
            },
          });

          await jobResource.save();

          // Step 2: Associate with volume by adding the label
          // Label format: recurring-job.longhorn.io/<job-name>: enabled
          volume.metadata.labels[buildRecurringJobSelectorLabelKey(this.name.trim(), RECURRING_JOB_SELECTOR_TYPE.JOB)] =
            RECURRING_JOB_SELECTOR_ENABLED;
        } else {
          // Add existing recurring job to volume by adding the label
          // Label format: recurring-job.longhorn.io/<job-name>: enabled
          volume.metadata.labels[
            buildRecurringJobSelectorLabelKey(this.existingJobName, RECURRING_JOB_SELECTOR_TYPE.JOB)
          ] = RECURRING_JOB_SELECTOR_ENABLED;
        }

        await volume.save();

        buttonDone(true);
        this.close();
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
    },
  },
};
</script>

<template>
  <Card :show-highlight-border="false" class="add-recurring-job-dialog">
    <template #title>
      <h4>{{ t('longhorn.recurringJob.dialog.add.title') }}</h4>
    </template>

    <template #body>
      <div class="form-field">
        <LabeledSelect
          v-model:value="isNew"
          :label="t('longhorn.recurringJob.dialog.add.mode')"
          :options="[
            { label: t('longhorn.recurringJob.dialog.add.modeNew'), value: true },
            { label: t('longhorn.recurringJob.dialog.add.modeExisting'), value: false },
          ]"
        />
      </div>

      <template v-if="!isNew">
        <div class="form-field">
          <LabeledSelect
            v-model:value="existingJobName"
            :label="t('longhorn.recurringJob.dialog.add.selectJob')"
            :options="existingJobOptions"
            :placeholder="t('longhorn.recurringJob.dialog.add.selectJobPlaceholder')"
            required
          />
        </div>
      </template>

      <template v-else>
        <div class="form-field">
          <LabeledInput
            v-model:value="name"
            :label="t('generic.name')"
            :rules="fvGetAndReportPathRules('name')"
            required
          />
        </div>

        <div class="row form-field">
          <div class="col span-6">
            <LabeledSelect
              v-model:value="task"
              :label="t('longhorn.recurringJob.table.header.task')"
              :options="taskOptions"
              required
            />
          </div>

          <div v-if="isForceCreateSupported" class="col span-6 force-create-col">
            <Checkbox v-model:value="forceCreate" :label="t('longhorn.recurringJob.form.forceCreate')" />
          </div>
        </div>

        <div class="row form-field">
          <div class="col span-6">
            <LabeledInput
              v-model:value.number="retain"
              type="number"
              :label="t('longhorn.recurringJob.table.header.retain')"
              :min="0"
              :disabled="isRetainDisabled"
              required
            />
          </div>

          <div v-if="shouldShowConcurrency" class="col span-6">
            <LabeledInput
              v-model:value.number="concurrency"
              type="number"
              :label="t('longhorn.recurringJob.table.header.concurrency')"
              :min="1"
              required
            />
          </div>
        </div>

        <div class="form-field">
          <div class="cron-row">
            <div class="cron-input">
              <LabeledInput
                v-model:value="cron"
                :label="t('longhorn.recurringJob.table.header.schedule')"
                :rules="fvGetAndReportPathRules('cron')"
                required
              />
            </div>
            <button type="button" class="btn role-tertiary ml-10" @click="showCronModal = true">
              {{ t('generic.edit') }}
            </button>
          </div>
        </div>

        <template v-if="shouldShowGroupsAndLabels">
          <div class="form-field">
            <ArrayList
              v-model:value="groups"
              :title="t('longhorn.recurringJob.table.header.groups')"
              :add-label="t('generic.add')"
            />
          </div>

          <div class="form-field">
            <KeyValue
              v-model:value="labels"
              :title="t('longhorn.recurringJob.table.header.labels')"
              :read-allowed="false"
            />
          </div>
        </template>
      </template>

      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">
          {{ t('generic.cancel') }}
        </button>
        <AsyncButton type="submit" class="btn bg-primary" :disabled="isSubmitDisabled" @click="save" />
      </div>
    </template>
  </Card>
  <CronExpressionEditorModal v-model:show="showCronModal" v-model:cron-expression="cron" />
</template>

<style scoped lang="scss">
.add-recurring-job-dialog {
  .form-field {
    margin-bottom: 15px;
  }

  .force-create-col {
    display: flex;
    align-items: center;
    padding-top: 20px;
  }

  .cron-row {
    display: flex;
    align-items: flex-end;

    .cron-input {
      flex: 1;
    }
  }

  .actions-row {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }
}
</style>
