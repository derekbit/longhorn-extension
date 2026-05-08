<script setup>
import { computed } from 'vue';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import LabelValue from '@shell/components/LabelValue';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import LiveDate from '@shell/components/formatter/LiveDate';
import { formatSi } from '@shell/utils/units';
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

const sizeDisplay = computed(() => {
  const size = props.value?.status?.size;

  if (!size) return '—';

  return formatSi(size, {
    suffix: 'iB',
    firstSuffix: 'B',
    increment: 1024,
  });
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
      <Tab name="basics" :label="t('longhorn.backingImageBackup.tab.basics')">
        <LabelValue
          class="mb-20"
          :name="t('longhorn.backingImageBackup.table.header.backingImage')"
          :value="displayValue(value?.spec?.backingImage)"
        />
        <LabelValue
          class="mb-20"
          :name="t('longhorn.backingImageBackup.table.header.backupTarget')"
          :value="displayValue(value?.spec?.backupTargetName)"
        />
        <LabelValue class="mb-20" :name="t('longhorn.backingImageBackup.table.header.size')" :value="sizeDisplay" />
        <LabelValue
          class="mb-20"
          :name="t('longhorn.backingImageBackup.table.header.url')"
          :value="displayValue(value?.status?.url)"
        />
        <LabelValue class="mb-20" :name="t('longhorn.backingImageBackup.table.header.lastSyncedAt')">
          <template #value>
            <LiveDate v-if="value?.status?.lastSyncedAt" :value="value.status.lastSyncedAt" />
            <span v-else>—</span>
          </template>
        </LabelValue>
        <LabelValue class="mb-20" :name="t('longhorn.backingImageBackup.table.header.checksum')">
          <template #value>
            <span class="checksum-text">{{ displayValue(value?.status?.checksum) }}</span>
          </template>
        </LabelValue>
      </Tab>
    </Tabbed>
  </div>
</template>

<style lang="scss" scoped>
.checksum-text {
  word-break: break-all;
}
</style>
