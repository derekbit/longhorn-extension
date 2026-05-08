<script>
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import AsyncButton from '@shell/components/AsyncButton';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import FormValidation from '@shell/mixins/form-validation';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';

function parseBooleanSetting(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return defaultValue;
}

export default {
  name: 'RestoreBackupBackingImageDialog',

  emits: ['close'],

  components: {
    Card,
    Banner,
    AsyncButton,
    LabeledInput,
    LabeledSelect,
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
      value: {
        secret: '',
        secretNamespace: '',
        dataEngine: 'v1',
      },
      errors: [],
      v1DataEngineEnabled: true,
      v2DataEngineEnabled: false,
      fvFormRuleSets: [{ path: 'value.dataEngine', rules: ['required'] }],
    };
  },

  computed: {
    resource() {
      return this.resources?.[0] || {};
    },

    backupBackingImageName() {
      return this.resource?.metadata?.name || this.resource?.name || '';
    },

    backingImageName() {
      return this.resource?.spec?.backingImage || this.resource?.status?.backingImage || '';
    },

    backupTargetName() {
      return this.resource?.spec?.backupTargetName || this.resource?.status?.backupTargetName || '';
    },

    backupUrl() {
      return this.resource?.status?.url || '';
    },

    checksum() {
      return this.resource?.status?.checksum || '';
    },

    dataEngineOptions() {
      return [
        {
          label: 'v1',
          value: 'v1',
          disabled: !this.v1DataEngineEnabled,
        },
        {
          label: 'v2',
          value: 'v2',
          disabled: !this.v2DataEngineEnabled,
        },
      ];
    },
  },

  async mounted() {
    this.value.secret = this.resource?.status?.secret || '';
    this.value.secretNamespace = this.resource?.status?.secretNamespace || '';
    await this.loadDataEngineSettings();
    this.value.dataEngine = this.v1DataEngineEnabled ? 'v1' : 'v2';
  },

  methods: {
    close() {
      this.$emit('close');
    },

    async loadDataEngineSettings() {
      this.errors = [];

      try {
        const inStore = this.$store.getters['currentProduct']?.inStore || 'cluster';
        const [v1Setting, v2Setting] = await Promise.all([
          this.$store.dispatch(`${inStore}/find`, {
            type: LONGHORN_RESOURCES.SETTINGS,
            id: LONGHORN_SETTINGS.V1_DATA_ENGINE,
          }),
          this.$store.dispatch(`${inStore}/find`, {
            type: LONGHORN_RESOURCES.SETTINGS,
            id: LONGHORN_SETTINGS.V2_DATA_ENGINE,
          }),
        ]);

        this.v1DataEngineEnabled = parseBooleanSetting(v1Setting?.value, true);
        this.v2DataEngineEnabled = parseBooleanSetting(v2Setting?.value, false);
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
      }
    },

    validateDataEngine() {
      if (this.value.dataEngine === 'v1' && !this.v1DataEngineEnabled) {
        return this.t('longhorn.backingImageBackup.dialog.restore.errors.v1DataEngineDisabled');
      }

      if (this.value.dataEngine === 'v2' && !this.v2DataEngineEnabled) {
        return this.t('longhorn.backingImageBackup.dialog.restore.errors.v2DataEngineDisabled');
      }

      return '';
    },

    getRestoreSpec() {
      if (!this.backingImageName || !this.backupUrl) {
        return null;
      }

      return {
        metadata: {
          name: this.backingImageName,
          namespace: LONGHORN_NAMESPACE,
        },
        spec: {
          checksum: this.checksum,
          sourceType: 'restore',
          sourceParameters: {
            'backup-target-name': this.backupTargetName,
            'backup-url': this.backupUrl,
          },
          secret: this.value.secret,
          secretNamespace: this.value.secretNamespace,
          dataEngine: this.value.dataEngine,
        },
      };
    },

    async restore(buttonDone) {
      this.errors = [];

      const validationError = this.validateDataEngine();
      const restoreSpec = this.getRestoreSpec();

      if (validationError) {
        this.errors = [validationError];
        buttonDone(false);

        return;
      }

      if (!restoreSpec) {
        this.errors = [this.t('longhorn.backingImageBackup.dialog.restore.errors.restoreFailed')];
        buttonDone(false);

        return;
      }

      try {
        const inStore = this.$store.getters['currentProduct']?.inStore || 'cluster';
        const backingImage = await this.$store.dispatch(`${inStore}/create`, {
          type: LONGHORN_RESOURCES.BACKING_IMAGES,
          ...restoreSpec,
        });

        await backingImage.save();

        buttonDone(true);
        this.close();

        const backupName = restoreSpec.metadata.name;

        this.$store.dispatch(
          'growl/success',
          {
            title: this.t('longhorn.backingImageBackup.dialog.restore.success.title'),
            message: this.t('longhorn.backingImageBackup.dialog.restore.success.message', { name: backupName }),
            timeout: 4000,
          },
          { root: true }
        );
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
    },
  },
};
</script>

<template>
  <Card :show-highlight-border="false">
    <template #title>
      <h4>{{ t('longhorn.backingImageBackup.dialog.restore.title') }}</h4>
    </template>

    <template #body>
      <LabeledInput
        :value="backupBackingImageName"
        :label="t('longhorn.backingImageBackup.dialog.restore.backup')"
        disabled
      />

      <LabeledInput
        v-if="value.secret"
        :value="value.secret"
        class="mt-15"
        :label="t('longhorn.backingImageBackup.dialog.restore.secret')"
        disabled
      />

      <LabeledInput
        v-if="value.secretNamespace"
        :value="value.secretNamespace"
        class="mt-15"
        :label="t('longhorn.backingImageBackup.dialog.restore.secretNamespace')"
        disabled
      />

      <LabeledSelect
        v-model:value="value.dataEngine"
        class="mt-15"
        :label="t('longhorn.backingImageBackup.dialog.restore.dataEngine')"
        :options="dataEngineOptions"
        :rules="fvGetAndReportPathRules('value.dataEngine')"
        required
      />

      <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">{{ t('generic.cancel') }}</button>
        <AsyncButton type="submit" class="btn bg-primary" :disabled="!fvFormIsValid" @click="restore" />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.actions-row {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
