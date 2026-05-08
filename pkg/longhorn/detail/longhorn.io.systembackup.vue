<script setup>
import { useStore } from 'vuex';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import LabelValue from '@shell/components/LabelValue';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import LiveDate from '@shell/components/formatter/LiveDate';
import { useI18n } from '@shell/composables/useI18n';
import { _VIEW } from '@shell/config/query-params';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { EMPTY_DISPLAY } from '@longhorn/types/display';

const VOLUME_BACKUP_POLICY_OPTIONS = (translate) => [
  { label: translate('longhorn.systemBackup.options.volumeBackupPolicy.ifNotPresent'), value: 'if-not-present' },
  { label: translate('longhorn.systemBackup.options.volumeBackupPolicy.always'), value: 'always' },
  { label: translate('longhorn.systemBackup.options.volumeBackupPolicy.disabled'), value: 'disabled' },
];

defineProps({
  value: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: _VIEW,
  },
});

const store = useStore();
const { t } = useI18n(store);

function displayValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : EMPTY_DISPLAY;
  }

  return value === null || value === undefined || String(value).trim() === '' ? EMPTY_DISPLAY : String(value);
}

function getCreatedAtValue(value) {
  return value?.status?.createdAt || value?.metadata?.creationTimestamp;
}
</script>

<template>
  <div>
    <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />

    <Tabbed side-tabs class="mt-20">
      <Tab name="basics" :label="t('longhorn.systemBackup.tab.basics')">
        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue
              :name="t('longhorn.systemBackup.table.header.version')"
              :value="displayValue(value?.status?.version)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabeledSelect
              :value="value?.spec?.volumeBackupPolicy"
              :label="t('longhorn.systemBackup.fields.volumeBackupPolicy')"
              :options="VOLUME_BACKUP_POLICY_OPTIONS(t)"
              :mode="mode"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue :name="t('longhorn.systemBackup.fields.createdAt')">
              <template #value>
                <LiveDate v-if="getCreatedAtValue(value)" :value="getCreatedAtValue(value)" />
                <span v-else>{{ EMPTY_DISPLAY }}</span>
              </template>
            </LabelValue>
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue :name="t('longhorn.systemBackup.table.header.lastSyncedAt')">
              <template #value>
                <LiveDate v-if="value?.status?.lastSyncedAt" :value="value.status.lastSyncedAt" />
                <span v-else>{{ EMPTY_DISPLAY }}</span>
              </template>
            </LabelValue>
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue
              :name="t('longhorn.systemBackup.fields.ownerID')"
              :value="displayValue(value?.status?.ownerID)"
            />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue
              :name="t('longhorn.systemBackup.fields.managerImage')"
              :value="displayValue(value?.status?.managerImage)"
            />
          </div>
        </div>
      </Tab>
    </Tabbed>
  </div>
</template>
