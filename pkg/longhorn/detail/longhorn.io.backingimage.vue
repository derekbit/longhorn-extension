<script setup>
import { computed } from 'vue';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import LabelValue from '@shell/components/LabelValue';
import SortableTable from '@shell/components/SortableTable';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';

const SOURCE_TYPES = [
  { label: 'Download From URL', value: 'download' },
  { label: 'Upload From Local', value: 'upload' },
  { label: 'Export From a Longhorn Volume', value: 'export-from-volume' },
  { label: 'Clone From Existing Backing Image', value: 'clone' },
];

const props = defineProps({
  value: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: 'view',
  },
});

const sourceType = computed(() => props.value?.spec?.sourceType);

const sourceTypeDisplay = computed(() => {
  const st = SOURCE_TYPES.find((st) => st.value === props.value?.spec?.sourceType);

  return st?.label || props.value?.spec?.sourceType;
});

const diskFileStatuses = computed(() => {
  const diskMap = props.value?.status?.diskFileStatusMap || {};

  return Object.entries(diskMap).map(([key, statusMap]) => ({
    status: statusMap?.state,
    message: statusMap?.message,
    disk: key,
    progress: statusMap?.progress ? parseInt(statusMap.progress, 10) : 0,
  }));
});

const isReady = computed(() => {
  return diskFileStatuses.value.length > 0 && diskFileStatuses.value.every((item) => item.status === 'ready');
});

const isChecksumMismatch = computed(() => {
  const expected = (props.value?.spec?.checksum || '').trim();
  const current = (props.value?.status?.checksum || '').trim();

  return expected !== '' && isReady.value && expected !== current;
});

const diskHeaders = [
  {
    name: 'status',
    label: 'Status',
    value: 'status',
    sort: ['status'],
    width: 250,
  },
  {
    name: 'disk',
    label: 'Disk',
    value: 'disk',
    sort: ['disk'],
  },
  {
    name: 'operation',
    label: 'Operation',
    width: 150,
  },
];

async function cleanUp(row) {
  if (window.confirm(`Are you sure you want to clean up the image file from the disk (${row.disk})?`)) {
    try {
      await props.value.doAction('backingImageCleanup', { disks: [row.disk] });
    } catch (err) {
      console.error('Failed to clean up disk:', err);
    }
  }
}

function ensureResourceStructure() {
  if (!props.value.spec) props.value.spec = { sourceParameters: {} };
  if (!props.value.spec.sourceParameters) props.value.spec.sourceParameters = {};
}

function displayValue(val) {
  if (Array.isArray(val)) {
    return val.length ? val.join(', ') : '—';
  }

  return val === null || val === undefined || String(val).trim() === '' ? '—' : val;
}

ensureResourceStructure();
</script>

<template>
  <div>
    <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />

    <Tabbed side-tabs class="mt-20">
      <Tab name="basics" label="Basics">
        <LabelValue name="UUID" :value="displayValue(value?.status?.uuid)" />

        <LabelValue name="Source Type" :value="displayValue(sourceTypeDisplay)" />

        <template v-if="sourceType === 'export-from-volume'">
          <LabelValue name="Volume Name" :value="displayValue(value?.spec?.sourceParameters?.['volume-name'])" />
          <LabelValue name="Exported Type" :value="displayValue(value?.spec?.sourceParameters?.['export-type'])" />
          <LabelValue
            v-if="value?.spec?.sourceParameters?.encryption"
            name="Encryption"
            :value="displayValue(value?.spec?.sourceParameters?.encryption)"
          />
          <div class="row">
            <div class="col span-6">
              <LabelValue
                v-if="value?.spec?.sourceParameters?.secret"
                name="Secret"
                :value="displayValue(value?.spec?.sourceParameters?.secret)"
              />
            </div>
            <div class="col span-6">
              <LabelValue
                v-if="value?.spec?.sourceParameters?.['secret-namespace']"
                name="Secret Namespace"
                :value="displayValue(value?.spec?.sourceParameters?.['secret-namespace'])"
              />
            </div>
          </div>
        </template>

        <template v-else-if="sourceType === 'download'">
          <LabelValue name="URL" :value="displayValue(value?.spec?.sourceParameters?.url)" />
        </template>

        <template v-else-if="sourceType === 'clone'">
          <LabelValue name="Source Image" :value="displayValue(value?.spec?.sourceParameters?.['backing-image'])" />
          <LabelValue
            v-if="value?.spec?.sourceParameters?.encryption"
            name="Encryption"
            :value="displayValue(value?.spec?.sourceParameters?.encryption)"
          />
          <div class="row">
            <div class="col span-6">
              <LabelValue
                v-if="value?.spec?.sourceParameters?.secret"
                name="Secret"
                :value="displayValue(value?.spec?.sourceParameters?.secret)"
              />
            </div>
            <div class="col span-6">
              <LabelValue
                v-if="value?.spec?.sourceParameters?.['secret-namespace']"
                name="Secret Namespace"
                :value="displayValue(value?.spec?.sourceParameters?.['secret-namespace'])"
              />
            </div>
          </div>
        </template>

        <template v-if="['download', 'upload'].includes(sourceType)">
          <LabelValue name="Expected Checksum">
            <template #value>
              <span class="checksum-text">{{ displayValue(value?.spec?.checksum) }}</span>
            </template>
          </LabelValue>
        </template>

        <LabelValue name="Current Checksum">
          <template #value>
            <div class="checksum-container">
              <span class="checksum-text">{{ displayValue(value?.status?.checksum) }}</span>
              <i
                v-if="isChecksumMismatch"
                v-clean-tooltip="'Current checksum doesn’t match the expected value'"
                class="icon icon-error text-error ml-5"
              />
            </div>
          </template>
        </LabelValue>

        <div class="row">
          <div class="col span-6">
            <LabelValue name="Min Copies" :value="displayValue(value?.spec?.minNumberOfCopies)" />
          </div>
          <div class="col span-6">
            <LabelValue name="Data Engine" :value="displayValue(value?.spec?.dataEngine)" />
          </div>
        </div>
        <div class="row">
          <div class="col span-6">
            <LabelValue :name="t('longhorn.volume.form.nodeTag')" :value="displayValue(value?.spec?.nodeSelector)" />
          </div>
          <div class="col span-6">
            <LabelValue :name="t('longhorn.volume.form.diskTag')" :value="displayValue(value?.spec?.diskSelector)" />
          </div>
        </div>
      </Tab>

      <Tab name="disks" label="Disks">
        <SortableTable
          :headers="diskHeaders"
          :rows="diskFileStatuses"
          key-field="disk"
          :search="false"
          :row-actions="false"
          :table-actions="false"
        >
          <template #col:status="{ row }">
            <td>
              <span style="text-transform: capitalize">{{ row.status }}</span>
              <span v-if="row.status === 'in-progress' || row.status === 'downloading'" class="text-muted ml-5">
                ({{ row.progress }}%)
              </span>
              <i v-if="row.message" v-clean-tooltip="row.message" class="icon icon-warning text-warning ml-5" />
            </td>
          </template>
          <template #col:operation="{ row }">
            <td>
              <button class="btn btn-sm role-secondary" @click.stop="cleanUp(row)">Clean Up</button>
            </td>
          </template>
        </SortableTable>
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
.checksum-container {
  display: flex;
  align-items: center;
}
</style>
