<script>
import { Card } from '@components/Card';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import AsyncButton from '@shell/components/AsyncButton';
import { Banner } from '@components/Banner';
import {
  RECURRING_JOB_SELECTOR_ENABLED,
  RECURRING_JOB_SELECTOR_TYPE,
  buildRecurringJobSelectorLabelKey,
  getRecurringJobSelectorPrefix,
  getRecurringJobGroups,
} from '@longhorn/utils/recurringjob';
import { exceptionToErrorsArray } from '@shell/utils/error';

export default {
  name: 'AddRecurringJobGroupDialog',

  emits: ['close'],

  components: {
    Card,
    LabeledSelect,
    AsyncButton,
    Banner,
  },

  props: {
    resources: {
      type: Array,
      default: () => [],
    },
    recurringJobData: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      groupName: '',
      errors: [],
    };
  },

  computed: {
    volume() {
      return this.resources?.[0] || {};
    },

    assignedGroupNames() {
      const groupSelectorPrefix = getRecurringJobSelectorPrefix(RECURRING_JOB_SELECTOR_TYPE.GROUP);

      return Object.keys(this.volume?.metadata?.labels || {})
        .filter((key) => key.startsWith(groupSelectorPrefix))
        .map((key) => key.replace(groupSelectorPrefix, ''));
    },

    groupOptions() {
      const names = new Set();

      (this.recurringJobData || []).forEach((job) => {
        const groups = getRecurringJobGroups(job);

        groups.forEach((name) => {
          if (name && !this.assignedGroupNames.includes(name)) {
            names.add(name);
          }
        });
      });

      return Array.from(names)
        .sort((firstGroupName, secondGroupName) => firstGroupName.localeCompare(secondGroupName))
        .map((name) => ({ label: name, value: name }));
    },

    isSubmitDisabled() {
      return !this.groupName;
    },
  },

  methods: {
    close() {
      this.$emit('close');
    },

    async save(buttonDone) {
      this.errors = [];

      if (!this.groupName) {
        this.errors = [this.t('longhorn.recurringJob.dialog.addGroup.required')];
        buttonDone(false);

        return;
      }

      try {
        const volume = this.volume;

        if (!volume.metadata.labels) {
          volume.metadata.labels = {};
        }

        // Associate recurring job group with the volume by adding label.
        // Label format: recurring-job-group.longhorn.io/<group-name>: enabled
        volume.metadata.labels[buildRecurringJobSelectorLabelKey(this.groupName, RECURRING_JOB_SELECTOR_TYPE.GROUP)] =
          RECURRING_JOB_SELECTOR_ENABLED;
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
  <Card :show-highlight-border="false">
    <template #title>
      <h4>{{ t('longhorn.recurringJob.dialog.addGroup.title') }}</h4>
    </template>

    <template #body>
      <LabeledSelect
        v-model:value="groupName"
        :label="t('longhorn.recurringJob.dialog.addGroup.selectGroup')"
        :options="groupOptions"
        :placeholder="t('longhorn.recurringJob.dialog.addGroup.selectGroupPlaceholder')"
        required
      />

      <Banner
        v-if="groupOptions.length === 0"
        color="warning"
        :label="t('longhorn.recurringJob.dialog.addGroup.noGroup')"
      />
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
</template>

<style scoped lang="scss">
.actions-row {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
