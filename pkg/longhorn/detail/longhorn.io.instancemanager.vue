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
      <Tab name="basics" :label="t('longhorn.instanceManager.tab.basics')">
        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.instanceManager.table.header.status')"
              :value="displayValue(value?.status?.currentState)"
            />
          </div>
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.instanceManager.table.header.type')"
              :value="displayValue(value?.spec?.type)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.instanceManager.table.header.dataEngine')"
              :value="displayValue(value?.spec?.dataEngine)"
            />
          </div>
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.instanceManager.table.header.node')"
              :value="displayValue(value?.spec?.nodeID)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue
              :name="t('longhorn.instanceManager.table.header.image')"
              :value="displayValue(value?.spec?.image)"
            />
          </div>
        </div>
      </Tab>
    </Tabbed>
  </div>
</template>
