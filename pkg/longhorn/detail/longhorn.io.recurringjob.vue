<script setup>
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import LabelValue from '@shell/components/LabelValue';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { RECURRING_JOB_TASK } from '@longhorn/types/recurringjob';

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
      <Tab name="basics" :label="t('longhorn.recurringJob.tab.basics')">
        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue :name="t('longhorn.recurringJob.table.header.task')" :value="value.taskDisplay" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue :name="t('longhorn.recurringJob.table.header.schedule')" :value="value.cronDisplay" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue
              :name="t('longhorn.recurringJob.table.header.retain')"
              :value="displayValue(value.spec?.retain)"
            />
          </div>
          <div v-if="value.baseTask !== RECURRING_JOB_TASK.SYSTEM_BACKUP" class="col span-6">
            <LabelValue
              :name="t('longhorn.recurringJob.table.header.concurrency')"
              :value="displayValue(value.spec?.concurrency)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-6">
            <LabelValue :name="t('longhorn.recurringJob.table.header.groups')" :value="value.groupsDisplay" />
          </div>
          <div class="col span-6">
            <LabelValue :name="t('longhorn.recurringJob.table.header.labels')" :value="value.labelsDisplay" />
          </div>
        </div>

        <template v-if="value.baseTask === RECURRING_JOB_TASK.BACKUP && value.fullBackupInterval !== null">
          <div class="row mb-20">
            <div class="col span-6">
              <LabelValue name="Full Backup Interval" :value="displayValue(value.fullBackupInterval)" />
            </div>
          </div>
        </template>

        <template
          v-if="value.baseTask === RECURRING_JOB_TASK.SYSTEM_BACKUP && value.volumeBackupPolicyDisplay !== null"
        >
          <div class="row mb-20">
            <div class="col span-6">
              <LabelValue name="Volume Backup Policy" :value="value.volumeBackupPolicyDisplay" />
            </div>
          </div>
        </template>
      </Tab>
    </Tabbed>
  </div>
</template>
