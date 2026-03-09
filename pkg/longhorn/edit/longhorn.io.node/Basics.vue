<script>
import { RadioGroup } from '@components/Form/Radio';
import UnitInput from '@shell/components/form/UnitInput';
import { LabeledInput } from '@components/Form/LabeledInput';
import ArrayList from '@shell/components/form/ArrayList';
import { BadgeState } from '@components/BadgeState';

export default {
  components: {
    BadgeState,
    LabeledInput,
    UnitInput,
    RadioGroup,
    ArrayList,
  },
  props: {
    mode: {
      type: String,
      required: true,
    },
    value: {
      type: Object,
      required: true,
    },
    conditions: {
      type: Array,
      default: () => [],
    },
    rules: {
      type: Object,
      default: () => ({}),
    },
  },
  computed: {
    nodeSchedulingOptions() {
      return [
        { label: this.t('generic.enabled'), value: true },
        { label: this.t('generic.disabled'), value: false },
      ];
    },
    evictionRequestedOptions() {
      return [
        { label: this.t('generic.trueOption'), value: true },
        { label: this.t('generic.falseOption'), value: false },
      ];
    },
  },
};
</script>

<template>
  <div>
    <div class="row mb-10 conditions">
      <BadgeState
        v-for="condition in conditions"
        :key="condition.key"
        v-clean-tooltip="condition.tooltip"
        class="mr-10 mb-10"
        :value="condition.value"
        :icon="condition.icon"
      />
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model:value="value.status.region"
          class="mb-10"
          :label="t('longhorn.node.form.region')"
          :mode="mode"
          disabled
        />
        <LabeledInput
          v-model:value="value.status.zone"
          class="mb-10"
          :label="t('longhorn.node.form.zone')"
          :mode="mode"
          disabled
        />
        <UnitInput
          v-model:value="value.spec.instanceManagerCPURequest"
          class="mb-20"
          :label="t('longhorn.node.form.instanceManagerCPURequest')"
          :mode="mode"
          suffix="m"
          :min="0"
          :required="true"
          :rules="rules?.instanceManagerCPURequest"
        />
        <RadioGroup
          v-model:value="value.spec.allowScheduling"
          name="nodeScheduling"
          class="mb-20"
          :label="t('longhorn.node.form.scheduling')"
          :mode="mode"
          :options="nodeSchedulingOptions"
          :row="true"
        />
        <RadioGroup
          v-model:value="value.spec.evictionRequested"
          name="nodeEvictionRequested"
          class="mb-20"
          :label="t('longhorn.node.form.evictionRequested')"
          :mode="mode"
          :options="evictionRequestedOptions"
          :row="true"
        />
        <ArrayList
          v-model:value="value.spec.tags"
          :mode="mode"
          :title="t('longhorn.node.form.tags')"
          :add-label="t('longhorn.node.form.addTags')"
        >
          <template #title>
            <h4>{{ t('longhorn.node.form.tags') }}</h4>
          </template>
        </ArrayList>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.conditions {
  display: flex;
  flex-wrap: wrap;
}
</style>
