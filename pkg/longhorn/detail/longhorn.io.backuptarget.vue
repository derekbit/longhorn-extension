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
      <Tab name="basics" :label="t('longhorn.backupTarget.tab.basics')">
        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue
              :name="t('longhorn.backupTarget.table.header.backupTargetURL')"
              :value="displayValue(value?.spec?.backupTargetURL)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue
              :name="t('longhorn.backupTarget.table.header.credentialSecret')"
              :value="displayValue(value?.spec?.credentialSecret)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.backupTarget.table.header.pollInterval')"
              :value="displayValue(value?.spec?.pollInterval)"
            />
          </div>
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.backupTarget.table.header.available')"
              :value="displayValue(value?.status?.available ? 'True' : 'False')"
            />
          </div>
        </div>
      </Tab>
    </Tabbed>
  </div>
</template>
