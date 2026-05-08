<script>
import { Card } from '@components/Card';
import { Banner } from '@components/Banner';
import AsyncButton from '@shell/components/AsyncButton';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import FormValidation from '@shell/mixins/form-validation';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';

export default {
  name: 'BackingImageBackupDialog',

  emits: ['close'],

  components: {
    Card,
    Banner,
    AsyncButton,
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
        backupTargetName: '',
      },
      backupTargets: [],
      errors: [],
      isLoading: true,
      fvFormRuleSets: [{ path: 'value.backupTargetName', rules: ['required'] }],
    };
  },

  computed: {
    resource() {
      return this.resources?.[0] || {};
    },

    backingImageName() {
      return this.resource?.metadata?.name || this.resource?.name || 'backing-image';
    },

    backupTargetOptions() {
      return this.backupTargets.map((target) => ({
        label: this.getTargetName(target),
        value: this.getTargetName(target),
        disabled: target.status?.available === false,
      }));
    },

    hasAvailableBackupTargets() {
      return this.backupTargetOptions.some((target) => !target.disabled);
    },
  },

  async mounted() {
    await this.loadBackupTargets();
  },

  methods: {
    getTargetName(target) {
      return target.metadata?.name || target.name;
    },

    close() {
      this.$emit('close');
    },

    generateRandomId() {
      if (globalThis?.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      }

      return Math.random().toString(36).slice(2, 10);
    },

    buildBackupBackingImageName() {
      return `${this.backingImageName}-${this.generateRandomId()}`;
    },

    async loadBackupTargets() {
      this.errors = [];

      try {
        const inStore = this.$store.getters['currentProduct']?.inStore || 'cluster';
        const targets = await this.$store.dispatch(`${inStore}/findAll`, {
          type: LONGHORN_RESOURCES.BACKUP_TARGETS,
        });

        this.backupTargets = Array.isArray(targets) ? targets : [];

        const defaultTarget = this.backupTargets.find(
          (target) => this.getTargetName(target) === 'default' && target.status?.available !== false
        );

        this.value.backupTargetName = defaultTarget ? this.getTargetName(defaultTarget) : '';
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
      } finally {
        this.isLoading = false;
      }
    },

    async backup(buttonDone) {
      this.errors = [];

      try {
        const inStore = this.$store.getters['currentProduct']?.inStore || 'cluster';

        const backupBackingImage = await this.$store.dispatch(`${inStore}/create`, {
          type: LONGHORN_RESOURCES.BACKING_IMAGE_BACKUPS,
          metadata: {
            name: this.buildBackupBackingImageName(),
            namespace: LONGHORN_NAMESPACE,
          },
          spec: {
            backingImage: this.backingImageName,
            backupTargetName: this.value.backupTargetName,
            userCreated: true,
          },
        });

        await backupBackingImage.save();

        buttonDone(true);
        this.close();

        this.$store.dispatch(
          'growl/success',
          {
            title: this.t('longhorn.backingImage.dialog.backup.success.title'),
            message: this.t('longhorn.backingImage.dialog.backup.success.message', { name: this.backingImageName }),
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
      <h4>{{ t('longhorn.backingImage.dialog.backup.title') }}</h4>
    </template>

    <template #body>
      <p class="description-text mb-15">
        {{
          t('longhorn.backingImage.dialog.backup.description', {
            name: backingImageName,
          })
        }}
      </p>

      <LabeledSelect
        v-model:value="value.backupTargetName"
        :label="t('longhorn.backingImage.dialog.backup.backupTarget')"
        :options="backupTargetOptions"
        :rules="!isLoading ? fvGetAndReportPathRules('value.backupTargetName') : []"
        required
      />

      <Banner
        v-if="!isLoading && !hasAvailableBackupTargets && !errors.length"
        color="error"
        :label="t('longhorn.backingImage.dialog.backup.noAvailableTarget')"
        class="mt-10"
      />
      <template v-if="!isLoading">
        <Banner v-for="(err, i) in errors" :key="i" color="error" :label="err" class="mt-10" />
      </template>
    </template>

    <template #actions>
      <div class="actions-row">
        <button class="btn role-secondary mr-10" @click="close">{{ t('generic.cancel') }}</button>
        <AsyncButton
          type="submit"
          class="btn bg-primary"
          :disabled="isLoading || !fvFormIsValid || !hasAvailableBackupTargets"
          @click="backup"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.description-text {
  margin: 0;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
