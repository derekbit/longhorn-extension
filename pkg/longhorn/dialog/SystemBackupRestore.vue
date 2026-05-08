<script>
import { Card } from '@components/Card';
import { LabeledInput } from '@components/Form/LabeledInput';
import AsyncButton from '@shell/components/AsyncButton';
import FormValidation from '@shell/mixins/form-validation';

export default {
  name: 'SystemBackupRestore',

  emits: ['close'],

  components: {
    Card,
    LabeledInput,
    AsyncButton,
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
        name: '',
        version: '',
        systemBackup: '',
      },
      fvFormRuleSets: [{ path: 'value.name', rules: ['required'] }],
    };
  },

  computed: {
    resource() {
      return this.resources?.[0] || {};
    },
  },

  mounted() {
    // Initialize values from resource
    this.value.version = this.resource?.status?.version || '';
    this.value.systemBackup = this.resource?.metadata?.name || '';
  },

  methods: {
    close() {
      this.$emit('close');
    },

    async restore(buttonDone) {
      // TODO: Implement system restore via Longhorn manager API.
      // This action requires calling the /v1/systemrestores endpoint
      buttonDone(true);
      this.close();
    },
  },
};
</script>

<template>
  <Card :show-highlight-border="false">
    <template #title>
      <h4>{{ t('longhorn.systemBackup.dialog.restore.title') }}</h4>
    </template>

    <template #body>
      <LabeledInput
        v-model:value="value.name"
        class="mt-10 mb-10"
        :label="t('generic.name')"
        :rules="fvGetAndReportPathRules('value.name')"
        required
      />
      <LabeledInput
        v-model:value="value.version"
        class="mb-15"
        :label="t('longhorn.systemBackup.table.header.version')"
        disabled
      />
      <LabeledInput
        v-model:value="value.systemBackup"
        :label="t('longhorn.systemBackup.dialog.restore.systemBackup')"
        disabled
      />
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
