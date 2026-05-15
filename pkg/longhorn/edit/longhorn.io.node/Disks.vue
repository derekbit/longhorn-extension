<script>
import { _VIEW } from '@shell/config/query-params';
import UnitInput from '@shell/components/form/UnitInput';
import ArrayList from '@shell/components/form/ArrayList';
import LabelValue from '@shell/components/LabelValue';
import ArrayListGrouped from '@shell/components/form/ArrayListGrouped';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { RadioGroup } from '@components/Form/Radio';
import { BadgeState } from '@components/BadgeState';
import { bytesToGi } from '@longhorn/utils/general';
import { GiB_UNIT } from '@longhorn/types/general';

export default {
  components: {
    BadgeState,
    UnitInput,
    LabeledInput,
    LabeledSelect,
    RadioGroup,
    ArrayList,
    LabelValue,
    ArrayListGrouped,
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
      type: Object,
      default: () => ({}),
    },
    rules: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return { _VIEW, GiB_UNIT };
  },
  computed: {
    diskTypeOptions() {
      return [
        { label: this.t('longhorn.node.form.fileSystem'), value: 'filesystem' },
        { label: this.t('longhorn.node.form.block'), value: 'block' },
      ];
    },
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
  methods: {
    bytesToGi,
    canBeRemoved(disk) {
      if (this.mode === _VIEW) return false;
      if (disk.value.isNew) return true;

      const isScheduled = (disk.value.storageScheduled || 0) > 0;
      const schedulingAllowed = disk.value.allowScheduling === true;

      return !isScheduled && !schedulingAllowed;
    },
    removeDiskTooltip(disk) {
      if (this.mode === _VIEW) {
        return '';
      }

      if (this.canBeRemoved(disk)) {
        return '';
      }

      return this.t('longhorn.node.form.removeDiskMessage');
    },
  },
};
</script>

<template>
  <div>
    <ArrayListGrouped
      :value="value.disks"
      :mode="mode"
      :can-remove="canBeRemoved"
      :add-label="t('longhorn.node.form.addDisk')"
      @add="$emit('add')"
      @remove="$emit('remove', $event.row.value.id)"
    >
      <template #remove-button="scope">
        <button
          v-if="canBeRemoved(scope.row)"
          type="button"
          class="btn role-link close btn-sm"
          :data-testid="`remove-item-${scope.i}`"
          @click="scope.remove"
        >
          <i class="icon icon-x" />
        </button>
        <span v-else-if="mode !== _VIEW" v-clean-tooltip="removeDiskTooltip(scope.row)">
          <i class="icon icon-x text-muted" />
        </span>
        <span v-else />
      </template>

      <template #default="{ row: { value: disk } }">
        <div v-if="disk && value.spec.disks[disk.id]" class="disk-container">
          <div class="row mb-10 conditions">
            <BadgeState
              v-for="condition in conditions[disk.id]"
              :key="condition.key"
              v-clean-tooltip="condition.tooltip"
              class="mr-10 mb-10"
              :value="condition.value"
              :icon="condition.icon"
            />
          </div>

          <div class="row mb-10">
            <div class="col span-6">
              <LabeledInput
                v-model:value="value.spec.disks[disk.id].name"
                class="mb-10"
                :label="t('longhorn.node.form.name')"
                :mode="mode"
                :disabled="mode === _VIEW || !value.spec.disks[disk.id].isNew"
                :rules="rules[disk.id]?.name || []"
              />
              <LabeledSelect
                v-model:value="value.spec.disks[disk.id].diskType"
                class="mb-10"
                :label="t('longhorn.node.form.diskType')"
                :mode="mode"
                :disabled="mode === _VIEW || !value.spec.disks[disk.id].isNew"
                :options="diskTypeOptions"
              />
              <LabeledInput
                v-model:value="value.spec.disks[disk.id].path"
                class="mb-10"
                :label="t('longhorn.node.form.diskPath')"
                :mode="mode"
                :disabled="mode === _VIEW || !value.spec.disks[disk.id].isNew"
                :required="true"
                :rules="rules[disk.id]?.path || []"
              />
              <UnitInput
                v-model:value="value.spec.disks[disk.id].storageReserved"
                class="mb-10"
                :input-exponent="3"
                :increment="1024"
                :label="t('longhorn.node.form.storageReserved')"
                :mode="mode"
                :min="0"
                :required="true"
                :rules="rules[disk.id]?.storageReserved || []"
              />
            </div>
          </div>

          <div class="row mb-20">
            <div class="col span-4">
              <LabelValue
                :name="t('longhorn.node.form.storageAvailable')"
                :value="disk.isNew ? `0 ${GiB_UNIT}` : `${bytesToGi(disk.storageAvailable || 0)} ${GiB_UNIT}`"
              />
            </div>
            <div class="col span-4">
              <LabelValue
                :name="t('longhorn.node.form.storageScheduled')"
                :value="disk.isNew ? `0 ${GiB_UNIT}` : `${bytesToGi(disk.storageScheduled || 0)} ${GiB_UNIT}`"
              />
            </div>
            <div class="col span-4">
              <LabelValue
                :name="t('longhorn.node.form.storageMaximum')"
                :value="disk.isNew ? `0 ${GiB_UNIT}` : `${bytesToGi(disk.storageMaximum || 0)} ${GiB_UNIT}`"
              />
            </div>
          </div>

          <div class="row">
            <div class="col span-6">
              <RadioGroup
                v-model:value="value.spec.disks[disk.id].allowScheduling"
                :name="`diskScheduling-${disk.id}`"
                class="mb-20"
                :label="t('longhorn.node.form.scheduling')"
                :mode="mode"
                :options="nodeSchedulingOptions"
                :row="true"
              />
              <RadioGroup
                v-model:value="value.spec.disks[disk.id].evictionRequested"
                :name="`diskEviction-${disk.id}`"
                class="mb-20"
                :label="t('longhorn.node.form.evictionRequested')"
                :mode="mode"
                :options="evictionRequestedOptions"
                :row="true"
              />
              <ArrayList
                v-model:value="value.spec.disks[disk.id].tags"
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
    </ArrayListGrouped>
  </div>
</template>
