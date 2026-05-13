<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { BadgeState } from '@components/BadgeState';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabelValue from '@shell/components/LabelValue';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import { useI18n } from '@shell/composables/useI18n';
import { formatSi } from '@shell/utils/units';
import SortableTable from '@shell/components/SortableTable';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { BADGE_COLOR } from '@longhorn/types/general';
import {
  BACKING_IMAGE_ENCRYPTION_TYPE_OPTIONS,
  BACKING_IMAGE_EXPORT_TYPE_OPTIONS,
  BACKING_IMAGE_SOURCE_TYPE,
  BACKING_IMAGE_SOURCE_TYPE_OPTIONS,
} from '@longhorn/types/backingimage';

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

const store = useStore();
const { t } = useI18n(store);

function translateOptionLabels(options = []) {
  return options.map((option) => ({
    ...option,
    label: option.label || (option.labelKey ? t(option.labelKey) : option.value),
  }));
}

const sourceTypeOptions = computed(() => translateOptionLabels(BACKING_IMAGE_SOURCE_TYPE_OPTIONS));
const exportTypeOptions = computed(() => translateOptionLabels(BACKING_IMAGE_EXPORT_TYPE_OPTIONS));
const encryptionTypeOptions = computed(() => translateOptionLabels(BACKING_IMAGE_ENCRYPTION_TYPE_OPTIONS));

const sourceType = computed(() => props.value?.spec?.sourceType);

const sourceTypeDisplay = computed(() => {
  const current = sourceType.value;
  const matched = sourceTypeOptions.value.find((option) => option.value === current);

  return matched?.label || displayValue(current);
});

const actualSizeDisplay = computed(() => {
  const size = props.value?.status?.realSize;

  if (!size) {
    return '—';
  }

  return formatSi(size, {
    suffix: 'iB',
    firstSuffix: 'B',
    increment: 1024,
  });
});

const virtualSizeDisplay = computed(() => {
  const size = props.value?.status?.virtualSize;

  if (!size) {
    return '—';
  }

  return formatSi(size, {
    suffix: 'iB',
    firstSuffix: 'B',
    increment: 1024,
  });
});

const STATE_BADGE_MAP = {
  ready: { stateDisplay: t('longhorn.backingImage.state.ready'), stateBackground: BADGE_COLOR.SUCCESS },
  'in-progress': { stateDisplay: t('longhorn.backingImage.state.inProgress'), stateBackground: BADGE_COLOR.INFO },
  downloading: { stateDisplay: t('longhorn.backingImage.state.downloading'), stateBackground: BADGE_COLOR.INFO },
  pending: { stateDisplay: t('longhorn.backingImage.state.pending'), stateBackground: BADGE_COLOR.DISABLED },
  failed: { stateDisplay: t('longhorn.backingImage.state.failed'), stateBackground: BADGE_COLOR.ERROR },
  unknown: { stateDisplay: t('longhorn.backingImage.state.unknown'), stateBackground: BADGE_COLOR.DISABLED },
};

const diskFileStatuses = computed(() => {
  const diskMap = props.value?.status?.diskFileStatusMap || {};

  return Object.entries(diskMap).map(([key, statusMap]) => {
    const rawState = (statusMap?.state || 'unknown').toLowerCase();
    const badge = STATE_BADGE_MAP[rawState] || {
      stateDisplay: statusMap?.state || t('longhorn.backingImage.state.unknown'),
      stateBackground: BADGE_COLOR.DISABLED,
    };
    const progress = statusMap?.progress ? parseInt(statusMap.progress, 10) : 0;
    const isInProgress = rawState === 'in-progress' || rawState === 'downloading';

    return {
      status: statusMap?.state,
      statusBadge: {
        ...badge,
        stateDisplay: isInProgress && progress ? `${badge.stateDisplay} (${progress}%)` : badge.stateDisplay,
      },
      message: statusMap?.message,
      disk: key,
      progress,
      stateObj: {
        error: rawState === 'failed',
        warning: !!(statusMap?.message && rawState !== 'failed'),
      },
      stateDescription: statusMap?.message || '',
    };
  });
});

const isChecksumMismatch = computed(() => {
  const expected = (props.value?.spec?.checksum || '').trim();
  const current = (props.value?.status?.checksum || '').trim();

  return expected !== '' && expected !== current;
});

const diskHeaders = computed(() => [
  {
    name: 'status',
    label: t('longhorn.backingImage.table.header.status'),
    value: 'status',
    sort: ['status'],
    width: 250,
  },
  {
    name: 'disk',
    label: t('longhorn.backingImage.table.header.disk'),
    value: 'disk',
    sort: ['disk'],
  },
  {
    name: 'operation',
    label: t('longhorn.backingImage.table.header.operation'),
    width: 150,
  },
]);

function openActionDialog({ title, message, confirmLabel, confirmButtonClass, onConfirm }) {
  store.dispatch('management/promptModal', {
    component: 'ActionConfirmDialog',
    componentProps: {
      title,
      message,
      confirmLabel,
      confirmButtonClass,
      onConfirm,
    },
  });
}

async function cleanUp(row) {
  openActionDialog({
    title: t('longhorn.backingImage.actions.cleanUp'),
    message: t('longhorn.backingImage.messages.confirmCleanUp', { disk: row.disk }),
    confirmLabel: t('longhorn.backingImage.actions.cleanUp'),
    onConfirm: async () => {
      try {
        // TODO: Implement disk cleanup via Longhorn manager API.
        // Call: doAction('backingImageCleanup', { disks: [row.disk] })
        // Reference: longhorn-ui/src/services/backingImage.js - deleteDisksOnBackingImage()
      } catch {}
    },
  });
}

function displayValue(val) {
  if (Array.isArray(val)) {
    return val.length ? val.join(', ') : '—';
  }

  return val === null || val === undefined || String(val).trim() === '' ? '—' : val;
}
</script>

<template>
  <div>
    <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />

    <Tabbed side-tabs class="mt-20">
      <Tab name="basics" :label="t('longhorn.backingImage.tab.basics')">
        <LabelValue
          class="mb-20"
          :name="t('longhorn.backingImage.table.header.uuid')"
          :value="displayValue(value?.status?.uuid)"
        />

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue :name="t('longhorn.backingImage.table.header.actualSize')" :value="actualSizeDisplay" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue :name="t('longhorn.backingImage.table.header.virtualSize')" :value="virtualSizeDisplay" />
          </div>
        </div>

        <div class="row mb-20">
          <div class="col span-12">
            <LabelValue :name="t('longhorn.backingImage.table.header.sourceType')" :value="sourceTypeDisplay" />
          </div>
        </div>

        <template v-if="sourceType === BACKING_IMAGE_SOURCE_TYPE.EXPORT_FROM_VOLUME">
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledInput
                :label="t('longhorn.backingImage.form.volumeName')"
                :value="displayValue(value?.spec?.sourceParameters?.['volume-name'])"
                :mode="mode"
                required
                disabled
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                :label="t('longhorn.backingImage.form.exportedType')"
                :value="value?.spec?.sourceParameters?.['export-type']"
                :options="exportTypeOptions"
                :mode="mode"
                required
                disabled
              />
            </div>
          </div>
          <div v-if="value?.spec?.sourceParameters?.encryption" class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                :label="t('longhorn.backingImage.form.encryption')"
                :value="value?.spec?.sourceParameters?.encryption"
                :options="encryptionTypeOptions"
                :mode="mode"
                required
                disabled
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledInput
                v-if="value?.spec?.sourceParameters?.secret"
                :label="t('longhorn.backingImage.form.secret')"
                :value="displayValue(value?.spec?.sourceParameters?.secret)"
                :mode="mode"
                disabled
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-if="value?.spec?.sourceParameters?.['secret-namespace']"
                :label="t('longhorn.backingImage.form.secretNamespace')"
                :value="displayValue(value?.spec?.sourceParameters?.['secret-namespace'])"
                :mode="mode"
                disabled
              />
            </div>
          </div>
        </template>

        <template v-else-if="sourceType === BACKING_IMAGE_SOURCE_TYPE.DOWNLOAD">
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledInput
                :label="t('longhorn.backingImage.form.url')"
                :value="displayValue(value?.spec?.sourceParameters?.url)"
                :mode="mode"
                required
                disabled
              />
            </div>
          </div>
        </template>

        <template v-else-if="sourceType === BACKING_IMAGE_SOURCE_TYPE.CLONE">
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledInput
                :label="t('longhorn.backingImage.form.sourceImage')"
                :value="displayValue(value?.spec?.sourceParameters?.['backing-image'])"
                :mode="mode"
                required
                disabled
              />
            </div>
          </div>
          <div v-if="value?.spec?.sourceParameters?.encryption" class="row mb-20">
            <div class="col span-12">
              <LabeledSelect
                :label="t('longhorn.backingImage.form.encryption')"
                :value="value?.spec?.sourceParameters?.encryption"
                :options="encryptionTypeOptions"
                :mode="mode"
                required
                disabled
              />
            </div>
          </div>
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledInput
                v-if="value?.spec?.sourceParameters?.secret"
                :label="t('longhorn.backingImage.form.secret')"
                :value="displayValue(value?.spec?.sourceParameters?.secret)"
                :mode="mode"
                :required="['encrypt', 'decrypt'].includes(value?.spec?.sourceParameters?.encryption)"
                disabled
              />
            </div>
            <div class="col span-6">
              <LabeledInput
                v-if="value?.spec?.sourceParameters?.['secret-namespace']"
                :label="t('longhorn.backingImage.form.secretNamespace')"
                :value="displayValue(value?.spec?.sourceParameters?.['secret-namespace'])"
                :mode="mode"
                :required="['encrypt', 'decrypt'].includes(value?.spec?.sourceParameters?.encryption)"
                disabled
              />
            </div>
          </div>
        </template>

        <template v-if="[BACKING_IMAGE_SOURCE_TYPE.DOWNLOAD, BACKING_IMAGE_SOURCE_TYPE.UPLOAD].includes(sourceType)">
          <div class="row mb-20">
            <div class="col span-12">
              <LabeledInput
                :label="t('longhorn.backingImage.form.expectedChecksum')"
                :value="displayValue(value?.spec?.checksum)"
                type="multiline"
                :mode="mode"
                disabled
              />
            </div>
          </div>
        </template>

        <LabelValue class="mb-20" :name="t('longhorn.backingImage.form.currentChecksum')">
          <template #name>
            <label>{{ t('longhorn.backingImage.form.currentChecksum') }}</label>
            <i
              v-if="isChecksumMismatch"
              v-clean-tooltip="t('longhorn.backingImage.checksumMismatch')"
              class="icon icon-error text-error ml-5"
            />
          </template>
          <template #value>
            <span class="checksum-text">{{ displayValue(value?.status?.checksum) }}</span>
          </template>
        </LabelValue>

        <div class="row mb-20">
          <div class="col span-6">
            <LabeledInput
              :label="t('longhorn.backingImage.table.header.minNumberOfCopies')"
              :value="displayValue(value?.spec?.minNumberOfCopies)"
              :mode="mode"
              required
              disabled
            />
          </div>
          <div class="col span-6">
            <LabeledSelect
              :label="t('longhorn.volume.table.header.dataEngine')"
              :value="value?.spec?.dataEngine"
              :options="['v1', 'v2']"
              :mode="mode"
              required
              disabled
            />
          </div>
        </div>
        <div class="row mb-20">
          <div class="col span-6">
            <LabeledInput
              :label="t('longhorn.volume.form.nodeTag')"
              :value="displayValue(value?.spec?.nodeSelector)"
              :mode="mode"
              disabled
            />
          </div>
          <div class="col span-6">
            <LabeledInput
              :label="t('longhorn.volume.form.diskTag')"
              :value="displayValue(value?.spec?.diskSelector)"
              :mode="mode"
              disabled
            />
          </div>
        </div>
      </Tab>

      <Tab name="disks" :label="t('longhorn.backingImage.tab.disks')">
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
              <BadgeState :value="row.statusBadge" />
            </td>
          </template>
          <template #col:operation="{ row }">
            <td>
              <button class="btn btn-sm role-secondary" @click.stop="cleanUp(row)">
                {{ t('longhorn.backingImage.actions.cleanUp') }}
              </button>
            </td>
          </template>
        </SortableTable>
      </Tab>
    </Tabbed>
  </div>
</template>

<style lang="scss" scoped>
.checksum-text {
  display: block;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
}
</style>
