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
      <Tab name="basics" :label="t('longhorn.orphans.tab.basics')">
        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue :name="t('longhorn.orphans.table.header.node')" :value="displayValue(value?.spec?.nodeID)" />
          </div>
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.orphans.table.header.type')"
              :value="displayValue(value?.spec?.orphanType)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.orphans.table.header.dataEngine')"
              :value="displayValue(value?.spec?.dataEngine)"
            />
          </div>
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.orphans.table.header.dataName')"
              :value="displayValue(value?.spec?.parameters?.DataName)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.orphans.table.header.diskName')"
              :value="displayValue(value?.spec?.parameters?.DiskName)"
            />
          </div>
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.orphans.table.header.diskPath')"
              :value="displayValue(value?.spec?.parameters?.DiskPath)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.orphans.table.header.instanceName')"
              :value="displayValue(value?.spec?.parameters?.InstanceName)"
            />
          </div>
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.orphans.table.header.instanceManager')"
              :value="displayValue(value?.spec?.parameters?.InstanceManager)"
            />
          </div>
        </div>
      </Tab>
    </Tabbed>
  </div>
</template>
