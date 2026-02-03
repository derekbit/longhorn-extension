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
import { RECURRING_JOB_TASK, PARAM_KEYS, VOLUME_BACKUP_POLICY } from '@longhorn/types/recurringjob';

const DEFAULT_SPEC = {
  retain: 1,
  concurrency: 1,
  cron: '0 0 * * *',
  groups: [],
  labels: {},
  parameters: {},
};

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
      VOLUME_BACKUP_POLICY,
      fvFormRuleSets: [],
      showCronModal: false,
      forceCreate: false,
    };
  },

  computed: {
    taskOptions() {
      return [
        {
          label: this.t(`longhorn.recurringJob.form.taskOptions.backup`),
          value: RECURRING_JOB_TASK.BACKUP,
        },
        {
          label: this.t(`longhorn.recurringJob.form.taskOptions.snapshot`),
          value: RECURRING_JOB_TASK.SNAPSHOT,
        },
        {
          label: this.t(`longhorn.recurringJob.form.taskOptions.snapshotDelete`),
          value: RECURRING_JOB_TASK.SNAPSHOT_DELETE,
        },
        {
          label: this.t(`longhorn.recurringJob.form.taskOptions.snapshotCleanup`),
          value: RECURRING_JOB_TASK.SNAPSHOT_CLEANUP,
        },
        {
          label: this.t(`longhorn.recurringJob.form.taskOptions.systemBackup`),
          value: RECURRING_JOB_TASK.SYSTEM_BACKUP,
        },
        {
          label: this.t(`longhorn.recurringJob.form.taskOptions.filesystemTrim`),
          value: RECURRING_JOB_TASK.FILESYSTEM_TRIM,
        },
      ];
    },

    parameterKeyOptions() {
      return this.localTask === RECURRING_JOB_TASK.SYSTEM_BACKUP
        ? [PARAM_KEYS.VOLUME_BACKUP_POLICY]
        : [PARAM_KEYS.FULL_BACKUP_INTERVAL];
    },

    volumeBackupPolicyOptions() {
      return Object.values(VOLUME_BACKUP_POLICY).map((v) => ({
        label: v,
        value: v,
      }));
    },

    canAddParameter() {
      if (this.mode === _VIEW) return false;
      const params = this.value?.spec?.parameters || {};
      const currentKeys = Object.keys(params).filter((k) => k !== '');

      return currentKeys.length < this.parameterKeyOptions.length;
    },

    isForceCreateSupported() {
      return [RECURRING_JOB_TASK.BACKUP, RECURRING_JOB_TASK.SNAPSHOT].includes(this.localTask);
    },

    localTask: {
      get() {
        return (this.value?.spec?.task || '').replace('-force-create', '');
      },
      set(val) {
        if (!this.value.spec) set(this.value, 'spec', {});
        const finalTask =
          this.forceCreate && [RECURRING_JOB_TASK.SNAPSHOT, RECURRING_JOB_TASK.BACKUP].includes(val)
            ? `${val}-force-create`
            : val;

        set(this.value.spec, 'task', finalTask);
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

      const params = this.value?.spec?.parameters || {};

      Object.keys(params).forEach((key) => {
        if (key?.trim()) {
          const rules = ['required'];

          if (key === PARAM_KEYS.FULL_BACKUP_INTERVAL) rules.push('requiredInt', 'min:0', 'isPositive');
          basics.push({ path: `spec.parameters.${key}`, rules });
        }
      });

      return { basics };
    },

    tabErrors() {
      const schema = this.validationSchema;

      if (!schema?.basics) return { basics: false };
      const hasError = (fields) =>
        fields.some((f) => {
          const val = get(this.value, f.path);
          const rules = this.fvGetPathRules(f.path) || [];

          return rules.some((rule) => typeof rule(val) === 'string');
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

      this.forceCreate = !!this.value.spec.task?.endsWith('-force-create');

      Object.entries(DEFAULT_SPEC).forEach(([key, val]) => {
        if (this.value.spec[key] === undefined) {
          set(this.value.spec, key, JSON.parse(JSON.stringify(val)));
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
      const params = this.value.spec.parameters;

      if (task === RECURRING_JOB_TASK.SYSTEM_BACKUP) {
        if (params[PARAM_KEYS.VOLUME_BACKUP_POLICY] === undefined) {
          set(this.value.spec.parameters, PARAM_KEYS.VOLUME_BACKUP_POLICY, VOLUME_BACKUP_POLICY.IF_NOT_PRESENT);
        }
      } else if (task === RECURRING_JOB_TASK.BACKUP && params[''] !== undefined) {
        set(this.value.spec, 'parameters', {});
      }
    },

    addParameter() {
      const available = this.parameterKeyOptions;
      const params = JSON.parse(JSON.stringify(this.value.spec.parameters || {}));

      const nextKey = available.find((k) => k && !Object.keys(params).includes(k));

      if (nextKey) {
        if (params[''] !== undefined) delete params[''];

        const defaultVal =
          this.localTask === RECURRING_JOB_TASK.SYSTEM_BACKUP ? VOLUME_BACKUP_POLICY.IF_NOT_PRESENT : '0';

        params[nextKey] = defaultVal;

        set(this.value.spec, 'parameters', { ...params });
      }
    },

    async save(buttonDone) {
      this.errors = [];
      if (!this.isFormValid) return buttonDone(false);

      try {
        if (this.value.metadata?.name) this.value.spec.name = this.value.metadata.name;
        const finalParams = { ...this.value.spec.parameters };

        Object.keys(finalParams).forEach((k) => {
          if (!k || k.trim() === '') delete finalParams[k];
        });
        set(this.value.spec, 'parameters', finalParams);

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
      handler(neu) {
        const all = neu?.basics || [];

        this.fvFormRuleSets = all;
        this.fvReportedValidationPaths = all.map((f) => f.path);
      },
      immediate: true,
      deep: true,
    },

    async localTask(neu, old) {
      if (neu === old || !this.value.spec) return;

      set(this.value.spec, 'parameters', {});

      Object.entries(DEFAULT_SPEC).forEach(([key, val]) => {
        set(this.value.spec, key, JSON.parse(JSON.stringify(val)));
      });

      this.initParametersByTask();

      await this.$nextTick();

      if (neu === RECURRING_JOB_TASK.FILESYSTEM_TRIM) set(this.value.spec, 'retain', 0);
      if (neu === RECURRING_JOB_TASK.SYSTEM_BACKUP) set(this.value.spec, 'concurrency', 1);
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
                v-clean-tooltip="
                  `Create ${localTask === RECURRING_JOB_TASK.BACKUP ? 'backups' : 'snapshots'} periodically.`
                "
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
                :disabled="localTask === RECURRING_JOB_TASK.FILESYSTEM_TRIM || mode === _VIEW"
                required
              />
            </div>
          </div>

          <div v-if="localTask !== RECURRING_JOB_TASK.SYSTEM_BACKUP" class="row mb-20">
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

          <div
            v-if="[RECURRING_JOB_TASK.BACKUP, RECURRING_JOB_TASK.SYSTEM_BACKUP].includes(localTask)"
            class="row mt-40"
          >
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
                    label="Key"
                    :options="parameterKeyOptions"
                    :mode="mode"
                    disabled
                /></template>
                <template #value="{ row, queueUpdate }">
                  <LabeledSelect
                    v-if="localTask === RECURRING_JOB_TASK.SYSTEM_BACKUP"
                    v-model:value="row.value"
                    label="Value"
                    :options="volumeBackupPolicyOptions"
                    :mode="mode"
                    :rules="fvGetAndReportPathRules(`spec.parameters.${row.key}`)"
                    @update:value="queueUpdate"
                  />
                  <LabeledInput
                    v-else
                    v-model:value="row.value"
                    label="Value"
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

        <Tab
          v-if="localTask !== RECURRING_JOB_TASK.SYSTEM_BACKUP"
          name="labels"
          label-key="longhorn.recurringJob.tab.labels"
        >
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
