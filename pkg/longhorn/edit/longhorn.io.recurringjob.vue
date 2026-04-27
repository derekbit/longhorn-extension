<script>
import Loading from '@shell/components/Loading';
import CruResource from '@shell/components/CruResource';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import ArrayList from '@shell/components/form/ArrayList';
import KeyValue from '@shell/components/form/KeyValue';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import CronExpressionEditorModal from '@shell/components/Cron/CronExpressionEditorModal';
import CreateEditView from '@shell/mixins/create-edit-view';
import FormValidation from '@shell/mixins/form-validation';
import { _CREATE, _VIEW } from '@shell/config/query-params';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { get, set } from '@shell/utils/object';
import { randomStr } from '@shell/utils/string';
import { LabeledInput } from '@components/Form/LabeledInput';
import { Checkbox } from '@components/Form/Checkbox';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import {
  PARAM_KEYS,
  RECURRING_JOB_DEFAULT_SPEC,
  RECURRING_JOB_FORCE_CREATE_SUPPORTED_TASKS,
  RECURRING_JOB_FORCE_CREATE_SUFFIX,
  RECURRING_JOB_TASK,
  RECURRING_JOB_TASKS_WITHOUT_GROUPS_AND_LABELS,
  RECURRING_JOB_TASKS_WITHOUT_RETAIN,
  RECURRING_JOB_TASKS_WITH_PARAMETERS,
  VOLUME_BACKUP_POLICY,
} from '@longhorn/types/recurringjob';
import { sanitizeRecurringJobParameters } from '@longhorn/utils/recurringjob';

const RECURRING_JOB_TASK_OPTIONS = [
  { key: 'backup', value: RECURRING_JOB_TASK.BACKUP },
  { key: 'snapshot', value: RECURRING_JOB_TASK.SNAPSHOT },
  { key: 'snapshotDelete', value: RECURRING_JOB_TASK.SNAPSHOT_DELETE },
  { key: 'snapshotCleanup', value: RECURRING_JOB_TASK.SNAPSHOT_CLEANUP },
  { key: 'systemBackup', value: RECURRING_JOB_TASK.SYSTEM_BACKUP },
  { key: 'filesystemTrim', value: RECURRING_JOB_TASK.FILESYSTEM_TRIM },
];

function cloneDefaultSpec() {
  return JSON.parse(JSON.stringify(RECURRING_JOB_DEFAULT_SPEC));
}

export default {
  name: 'EditRecurringJob',

  components: {
    Loading,
    CruResource,
    NameNsDescription,
    LabeledInput,
    LabeledSelect,
    Checkbox,
    ArrayList,
    KeyValue,
    Tabbed,
    Tab,
    CronExpressionEditorModal,
  },

  mixins: [CreateEditView, FormValidation],

  props: {
    mode: {
      type: String,
      default: _CREATE,
    },
    value: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      _CREATE,
      _VIEW,
      LONGHORN_NAMESPACE,
      RECURRING_JOB_TASK,
      PARAM_KEYS,
      fvFormRuleSets: [],
      showCronModal: false,
      forceCreate: false,
    };
  },

  computed: {
    taskOptions() {
      return RECURRING_JOB_TASK_OPTIONS.map((taskOption) => ({
        label: this.t(`longhorn.recurringJob.form.taskOptions.${taskOption.key}`),
        value: taskOption.value,
      }));
    },

    parameterKeyOptions() {
      return this.localTask === RECURRING_JOB_TASK.SYSTEM_BACKUP
        ? [PARAM_KEYS.VOLUME_BACKUP_POLICY]
        : [PARAM_KEYS.FULL_BACKUP_INTERVAL];
    },

    volumeBackupPolicyOptions() {
      return Object.values(VOLUME_BACKUP_POLICY).map((policy) => ({
        label: policy,
        value: policy,
      }));
    },

    canAddParameter() {
      if (this.mode === _VIEW) return false;
      const parameterMap = this.value?.spec?.parameters || {};
      const currentParameterKeys = Object.keys(parameterMap).filter((parameterKey) => parameterKey !== '');

      return currentParameterKeys.length < this.parameterKeyOptions.length;
    },

    isForceCreateSupported() {
      return RECURRING_JOB_FORCE_CREATE_SUPPORTED_TASKS.includes(this.localTask);
    },

    shouldShowConcurrency() {
      return this.localTask !== RECURRING_JOB_TASK.SYSTEM_BACKUP;
    },

    shouldShowLabelsAndGroups() {
      return !RECURRING_JOB_TASKS_WITHOUT_GROUPS_AND_LABELS.includes(this.localTask);
    },

    shouldShowParameters() {
      return RECURRING_JOB_TASKS_WITH_PARAMETERS.includes(this.localTask);
    },

    isRetainDisabled() {
      return RECURRING_JOB_TASKS_WITHOUT_RETAIN.includes(this.localTask) || this.mode === _VIEW;
    },

    forceCreateTooltip() {
      return this.t('longhorn.recurringJob.form.forceCreateTooltip', {
        resource: this.localTask === RECURRING_JOB_TASK.BACKUP ? 'backups' : 'snapshots',
      });
    },

    localTask: {
      get() {
        return (this.value?.spec?.task || '').replace(RECURRING_JOB_FORCE_CREATE_SUFFIX, '');
      },
      set(task) {
        if (!this.value.spec) set(this.value, 'spec', {});

        const taskWithForceCreate =
          this.forceCreate && RECURRING_JOB_FORCE_CREATE_SUPPORTED_TASKS.includes(task)
            ? `${task}${RECURRING_JOB_FORCE_CREATE_SUFFIX}`
            : task;

        set(this.value.spec, 'task', taskWithForceCreate);
      },
    },

    validationSchema() {
      const basics = [
        {
          path: 'metadata.name',
          rules: ['required'],
          translationKey: 'generic.name',
        },
        {
          path: 'spec.task',
          rules: ['required'],
          translationKey: 'longhorn.recurringJob.table.header.task',
        },
        {
          path: 'spec.retain',
          rules: ['requiredInt', 'min:0', 'isPositive'],
          translationKey: 'longhorn.recurringJob.table.header.retain',
        },
        {
          path: 'spec.cron',
          rules: ['required'],
          translationKey: 'longhorn.recurringJob.table.header.schedule',
        },
      ];

      if (this.localTask !== RECURRING_JOB_TASK.SYSTEM_BACKUP) {
        basics.push({
          path: 'spec.concurrency',
          rules: ['requiredInt', 'min:1', 'isPositive'],
          translationKey: 'longhorn.recurringJob.table.header.concurrency',
        });
      }

      const parameterMap = this.value?.spec?.parameters || {};

      Object.keys(parameterMap).forEach((parameterKey) => {
        if (parameterKey?.trim()) {
          const rules = ['required'];

          if (parameterKey === PARAM_KEYS.FULL_BACKUP_INTERVAL) rules.push('requiredInt', 'min:0', 'isPositive');
          basics.push({ path: `spec.parameters.${parameterKey}`, rules });
        }
      });

      return { basics };
    },

    tabErrors() {
      const schema = this.validationSchema;

      if (!schema?.basics) return { basics: false };
      const hasError = (fields) =>
        fields.some((field) => {
          const fieldValue = get(this.value, field.path);
          const rules = this.fvGetPathRules(field.path) || [];

          return rules.some((rule) => typeof rule(fieldValue) === 'string');
        });

      return { basics: hasError(schema.basics) };
    },

    isFormValid() {
      return this.tabErrors?.basics === false;
    },
  },

  created() {
    this.initResource();
  },

  methods: {
    initResource() {
      if (!this.value.metadata) set(this.value, 'metadata', {});
      if (!this.value.spec) set(this.value, 'spec', {});

      if (this.mode === _CREATE) {
        if (!this.value.metadata.name) set(this.value.metadata, 'name', `c-${randomStr(6).toLowerCase()}`);
        if (!this.value.spec.task) set(this.value.spec, 'task', RECURRING_JOB_TASK.SNAPSHOT);
      }

      this.forceCreate = !!this.value.spec.task?.endsWith(RECURRING_JOB_FORCE_CREATE_SUFFIX);

      Object.entries(cloneDefaultSpec()).forEach(([specKey, specValue]) => {
        if (this.value.spec[specKey] === undefined) {
          set(this.value.spec, specKey, specValue);
        }
      });

      this.initParametersByTask();
    },

    onError(errors) {
      this.errors = Array.isArray(errors) ? errors : [errors];
    },

    initParametersByTask() {
      if (!this.value?.spec) return;
      if (!this.value.spec.parameters) set(this.value.spec, 'parameters', {});

      const task = this.localTask;
      const parameterMap = sanitizeRecurringJobParameters(this.value.spec.parameters);
      const defaultParameterMap = {};

      if (task === RECURRING_JOB_TASK.SYSTEM_BACKUP) {
        defaultParameterMap[PARAM_KEYS.VOLUME_BACKUP_POLICY] = VOLUME_BACKUP_POLICY.IF_NOT_PRESENT;
      }

      set(this.value.spec, 'parameters', { ...defaultParameterMap, ...parameterMap });
    },

    addParameter() {
      const availableParameterKeys = this.parameterKeyOptions;
      const parameterMap = JSON.parse(JSON.stringify(this.value.spec.parameters || {}));

      const nextParameterKey = availableParameterKeys.find(
        (parameterKey) => parameterKey && !Object.keys(parameterMap).includes(parameterKey)
      );

      if (nextParameterKey) {
        const sanitizedParameterMap = sanitizeRecurringJobParameters(parameterMap);

        sanitizedParameterMap[nextParameterKey] =
          this.localTask === RECURRING_JOB_TASK.SYSTEM_BACKUP ? VOLUME_BACKUP_POLICY.IF_NOT_PRESENT : '0';

        set(this.value.spec, 'parameters', sanitizedParameterMap);
      }
    },

    async save(buttonDone) {
      this.errors = [];
      if (!this.isFormValid) return buttonDone(false);

      try {
        if (this.value.metadata?.name) this.value.spec.name = this.value.metadata.name;
        set(this.value.spec, 'parameters', sanitizeRecurringJobParameters(this.value.spec.parameters));

        await this.actuallySave();
        buttonDone(true);
        this.done();
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
    },
  },

  watch: {
    validationSchema: {
      handler(newSchema) {
        const allValidationFields = newSchema?.basics || [];

        this.fvFormRuleSets = allValidationFields;
        this.fvReportedValidationPaths = allValidationFields.map((field) => field.path);
      },
      immediate: true,
      deep: true,
    },

    async localTask(newTask, oldTask) {
      if (newTask === oldTask || !this.value.spec) return;

      set(this.value.spec, 'parameters', {});

      Object.entries(cloneDefaultSpec()).forEach(([specKey, specValue]) => {
        set(this.value.spec, specKey, specValue);
      });

      this.initParametersByTask();

      await this.$nextTick();

      if (RECURRING_JOB_TASKS_WITHOUT_RETAIN.includes(newTask)) {
        set(this.value.spec, 'retain', 0);
      }
      if (newTask === RECURRING_JOB_TASK.SYSTEM_BACKUP) set(this.value.spec, 'concurrency', 1);
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <CruResource
      :done-route="doneRoute"
      :mode="mode"
      :resource="value"
      :validation-passed="isFormValid"
      :errors="fvUnreportedValidationErrors"
      @finish="save"
      @cancel="done"
      @error="onError"
    >
      <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />
      <Tabbed side-tabs :resource="value">
        <Tab name="basics" label-key="longhorn.recurringJob.tab.basics" :error="tabErrors.basics">
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledSelect
                v-model:value="localTask"
                :mode="mode"
                :label="t('longhorn.recurringJob.table.header.task')"
                :options="taskOptions"
                :rules="fvGetAndReportPathRules('spec.task')"
                :disabled="mode !== _CREATE"
                required
              />
            </div>
            <div v-if="isForceCreateSupported" class="col span-6 force-create">
              <Checkbox
                v-model:value="forceCreate"
                v-clean-tooltip="forceCreateTooltip"
                :mode="mode"
                :disabled="mode !== _CREATE"
                :label="t('longhorn.recurringJob.form.forceCreate')"
                @update:value="localTask = localTask"
              />
            </div>
          </div>

          <div class="row mb-20">
            <div class="col span-6">
              <LabeledInput
                v-model:value.number="value.spec.retain"
                :mode="mode"
                type="number"
                :label="t('longhorn.recurringJob.table.header.retain')"
                :min="0"
                :rules="fvGetAndReportPathRules('spec.retain')"
                :disabled="isRetainDisabled"
                required
              />
            </div>
          </div>

          <div v-if="shouldShowConcurrency" class="row mb-20">
            <div class="col span-6">
              <LabeledInput
                v-model:value.number="value.spec.concurrency"
                :mode="mode"
                type="number"
                :label="t('longhorn.recurringJob.table.header.concurrency')"
                :min="1"
                :rules="fvGetAndReportPathRules('spec.concurrency')"
                required
              />
            </div>
          </div>

          <div class="row mb-20 cron-row">
            <div class="col span-6">
              <LabeledInput
                v-model:value="value.spec.cron"
                :mode="mode"
                type="cron"
                :label="t('longhorn.recurringJob.table.header.schedule')"
                :rules="fvGetAndReportPathRules('spec.cron')"
                required
              />
            </div>
            <div class="col span-6">
              <button v-if="mode !== _VIEW" type="button" class="btn role-tertiary" @click="showCronModal = true">
                {{ t('generic.edit') }}
              </button>
            </div>
          </div>

          <div v-if="shouldShowParameters" class="row mt-40">
            <div class="col span-12">
              <KeyValue
                v-model:value="value.spec.parameters"
                :mode="mode"
                :key-options="parameterKeyOptions"
                :key-editable="false"
                :remove-allowed="true"
              >
                <template #title
                  ><h4>
                    {{ t('longhorn.recurringJob.form.parameters') }}
                  </h4></template
                >
                <template #key="{ row }"
                  ><LabeledSelect
                    v-model:value="row.key"
                    :label="t('longhorn.recurringJob.form.key')"
                    :options="parameterKeyOptions"
                    :mode="mode"
                    disabled
                /></template>
                <template #value="{ row, queueUpdate }">
                  <LabeledSelect
                    v-if="localTask === RECURRING_JOB_TASK.SYSTEM_BACKUP"
                    v-model:value="row.value"
                    :label="t('longhorn.recurringJob.form.value')"
                    :options="volumeBackupPolicyOptions"
                    :mode="mode"
                    :rules="fvGetAndReportPathRules(`spec.parameters.${row.key}`)"
                    @update:value="queueUpdate"
                  />
                  <LabeledInput
                    v-else
                    v-model:value="row.value"
                    :label="t('longhorn.recurringJob.form.value')"
                    :mode="mode"
                    :type="row.key === PARAM_KEYS.FULL_BACKUP_INTERVAL ? 'number' : 'text'"
                    :rules="row.key ? fvGetAndReportPathRules(`spec.parameters.${row.key}`) : []"
                    @update:value="queueUpdate"
                  />
                </template>
                <template #add="{ add }">
                  <button
                    type="button"
                    class="btn role-tertiary add"
                    :disabled="!canAddParameter"
                    @click="
                      () => {
                        addParameter();
                        add();
                      }
                    "
                  >
                    {{ t('generic.add') }}
                  </button>
                </template>
                <template #removeButton="{ remove, row, i }">
                  <button
                    type="button"
                    class="btn role-link"
                    :disabled="
                      mode === _VIEW ||
                      (localTask === RECURRING_JOB_TASK.SYSTEM_BACKUP && row.key === PARAM_KEYS.VOLUME_BACKUP_POLICY)
                    "
                    @click="remove(i)"
                  >
                    {{ t('generic.remove') }}
                  </button>
                </template>
              </KeyValue>
            </div>
          </div>
        </Tab>

        <Tab v-if="shouldShowLabelsAndGroups" name="labels" label-key="longhorn.recurringJob.tab.labels">
          <ArrayList
            v-model:value="value.spec.groups"
            :mode="mode"
            :title="t('longhorn.recurringJob.table.header.groups')"
            :add-label="t('generic.add')"
          />
          <KeyValue
            v-model:value="value.spec.labels"
            :mode="mode"
            :title="t('longhorn.recurringJob.table.header.labels')"
          />
        </Tab>
      </Tabbed>
    </CruResource>
    <CronExpressionEditorModal v-model:show="showCronModal" v-model:cron-expression="value.spec.cron" />
  </div>
</template>

<style lang="scss" scoped>
.force-create {
  align-self: center;
}
.cron-row {
  display: flex;
  align-items: center;
}
:deep(.kv-item.remove) {
  align-self: center;
}
:deep(.kv-container .key-value-label) {
  display: none;
}
</style>
