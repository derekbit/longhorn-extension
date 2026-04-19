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

        <div v-if="value?.status?.conditions" class="row mb-20">
          <div class="col span-12">
            <LabelValue name="Status Message">
              <template #value>
                <div v-for="(condition, idx) in value.status.conditions" :key="idx" class="condition-item">
                  <span class="condition-type">{{ condition.type }}:</span>
                  <span
                    :class="{ 'text-success': condition.status === 'True', 'text-error': condition.status === 'False' }"
                  >
                    {{ condition.status }}
                  </span>
                  <span v-if="condition.message" class="text-muted ml-10">{{ condition.message }}</span>
                </div>
              </template>
            </LabelValue>
          </div>
        </div>
      </Tab>
    </Tabbed>
  </div>
</template>

<style lang="scss" scoped>
.condition-item {
  margin-bottom: 5px;
}
.condition-type {
  font-weight: 500;
  margin-right: 5px;
}
</style>
