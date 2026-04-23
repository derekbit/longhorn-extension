<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import PercentageBar from '@shell/components/PercentageBar';
import { useI18n } from '@shell/composables/useI18n';
import { bytesToGi } from '@longhorn/utils/formatter';
import { GiB_UNIT } from '@longhorn/types/units';
import { formatPercent } from '@shell/utils/string';

const props = defineProps({
  value: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n(useStore());

const capacityBytes = computed(() => Number(props.value?.capacity || 0));
const usedBytes = computed(() => Number(props.value?.used || 0));

const capacity = computed(() => bytesToGi(capacityBytes.value));
const used = computed(() => bytesToGi(usedBytes.value));

const rawPercentage = computed(() => {
  if (!capacityBytes.value) {
    return 0;
  }

  return (usedBytes.value * 100) / capacityBytes.value;
});

const percentage = computed(() => formatPercent(rawPercentage.value));
const gaugePercentage = computed(() => {
  if (rawPercentage.value < 0) {
    return 0;
  }

  if (rawPercentage.value > 100) {
    return 100;
  }

  return rawPercentage.value;
});

const replicaSizeBytes = computed(() => Number(props.value?.replicaSize || 0));
const backingImageSizeBytes = computed(() => Number(props.value?.backingImageSize || 0));
const hasAllocatedBreakdown = computed(() => {
  return Object.prototype.hasOwnProperty.call(props.value || {}, 'replicaSize');
});

const tooltipContent = computed(() => {
  if (hasAllocatedBreakdown.value) {
    return {
      content: [
        `<div>${t('longhorn.node.tooltip.replicas')}: ${bytesToGi(replicaSizeBytes.value)} ${GiB_UNIT}</div>`,
        `<div>${t('longhorn.node.tooltip.backingImages')}: ${bytesToGi(backingImageSizeBytes.value)} ${GiB_UNIT}</div>`,
        `<div>${t('longhorn.node.tooltip.capacity')}: ${capacity.value} ${GiB_UNIT}</div>`,
        `<div>${t('longhorn.node.tooltip.usage')}: ${percentage.value}</div>`,
      ].join(''),
      html: true,
    };
  }

  return {
    content: [
      `<div>${t('longhorn.node.tooltip.used')}: ${used.value} ${GiB_UNIT}</div>`,
      `<div>${t('longhorn.node.tooltip.capacity')}: ${capacity.value} ${GiB_UNIT}</div>`,
      `<div>${t('longhorn.node.tooltip.usage')}: ${percentage.value}</div>`,
    ].join(''),
    html: true,
  };
});
</script>

<template>
  <div v-clean-tooltip="tooltipContent" class="consumption-cell">
    <PercentageBar :model-value="gaugePercentage" :show-percentage="true" />
  </div>
</template>

<style scoped>
.consumption-cell {
  min-width: 130px;
}
</style>
