<script setup>
import { computed } from 'vue';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import LabelValue from '@shell/components/LabelValue';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import { _VIEW } from '@shell/config/query-params';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';

const props = defineProps({
  mode: {
    type: String,
    default: _VIEW,
  },
  value: {
    type: Object,
    required: false,
    default: () => ({}),
  },
});

const progressDisplay = computed(() => {
  const progress = props.value?.status?.progress;
  const state = props.value?.status?.state;

  if (progress !== undefined && progress !== null && ['InProgress', 'Syncing'].includes(state)) {
    return `${progress}%`;
  }

  return displayValue(progress);
});

const sizeDisplay = computed(() => {
  const size = props.value?.status?.size;

  if (!size || size === 0) return '—';

  // Convert bytes to human-readable format
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = size;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
});

function displayValue(val) {
  if (Array.isArray(val)) {
    return val.length ? val.join(', ') : '—';
  }

  return val === null || val === undefined || String(val).trim() === '' ? '—' : val;
}
</script>

<template>
  <div>
    <NameNsDescription
      :value="value"
      :mode="mode"
      :force-namespace="LONGHORN_NAMESPACE"
      :name-hidden="mode !== _VIEW"
      :description-hidden="true"
    />
    <Tabbed side-tabs :resource="value">
      <Tab name="basics" label="Basics">
        <LabelValue name="Backing Image" :value="displayValue(value?.status?.backingImage)" />
        <LabelValue name="Backup Target" :value="displayValue(value?.spec?.backupTargetName)" />
        <LabelValue name="State">
          <template #value>
            <span>{{ displayValue(value?.status?.state) }}</span>
            <i
              v-if="value?.status?.error"
              v-clean-tooltip="value.status.error"
              class="icon icon-error text-error ml-5"
            />
          </template>
        </LabelValue>
        <LabelValue name="Size" :value="sizeDisplay" />
        <LabelValue v-if="value?.status?.progress !== undefined" name="Progress" :value="progressDisplay" />
        <LabelValue name="URL" :value="displayValue(value?.status?.url)" />
        <LabelValue name="Last Synced At" :value="displayValue(value?.status?.lastSyncedAt)" />
        <LabelValue name="Checksum">
          <template #value>
            <span class="checksum-text">{{ displayValue(value?.status?.checksum) }}</span>
          </template>
        </LabelValue>
      </Tab>
    </Tabbed>
  </div>
</template>

<style lang="scss" scoped>
.label {
  margin-bottom: 20px;
}
.checksum-text {
  word-break: break-all;
}
</style>
