<script setup>
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import LabelValue from '@shell/components/LabelValue';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';

defineProps({
  value: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: 'view',
  },
});

function displayValue(val) {
  if (Array.isArray(val)) {
    return val.length ? val.join(', ') : '—';
  }

  return val === null || val === undefined || String(val).trim() === '' ? '—' : String(val);
}
</script>

<template>
  <div>
    <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />

    <Tabbed side-tabs class="mt-20">
      <Tab name="basics" :label="t('longhorn.systemBackup.tab.basics')">
        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.systemBackup.table.header.version')"
              :value="displayValue(value?.status?.version)"
            />
          </div>
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.systemBackup.table.header.state')"
              :value="displayValue(value?.status?.state)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.systemBackup.table.header.lastSyncedAt')"
              :value="displayValue(value?.status?.lastSyncedAt)"
            />
          </div>
        </div>

        <div v-if="value?.status?.error" class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Error" :value="value.status.error" />
          </div>
        </div>
      </Tab>
    </Tabbed>
  </div>
</template>
