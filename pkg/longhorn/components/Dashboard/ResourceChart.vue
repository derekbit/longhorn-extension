<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import { useI18n } from '@shell/composables/useI18n';
import SemiDoughnut from '@longhorn/components/Charts/SemiDoughnut';
import { useTooltip, formatTooltipContent } from '@longhorn/components/Charts/composable';
import Link from '@shell/components/formatter/Link';
import { PRODUCT_NAME } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  chartData: {
    type: Object,
    required: true,
  },
  horizontal: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n(useStore());
const { showTooltip, hideTooltip } = useTooltip();
const route = useRoute();

const activeIndex = ref(null);

const dataset = computed(() => props.chartData.datasets?.[0] ?? { data: [], backgroundColor: [] });

const isLinkableResource = computed(() =>
  ['longhorn.dashboard.node.title', 'longhorn.dashboard.volume.title'].includes(props.chartData.resourceNameKey)
);

const resourceTypeByChart = computed(() => {
  const chartResource = props.chartData.resourceNameKey;

  if (chartResource === 'longhorn.dashboard.node.title') {
    return LONGHORN_RESOURCES.NODES;
  }

  if (chartResource === 'longhorn.dashboard.volume.title') {
    return LONGHORN_RESOURCES.VOLUMES;
  }

  return null;
});

const listRouteName = `c-cluster-${PRODUCT_NAME}-resource`;

const total = computed(() => {
  const sum = dataset.value.data.reduce((a, b) => a + b, 0);

  return Math.round(sum * 100) / 100;
});

const rows = computed(() =>
  props.chartData.labels.map((label, index) => {
    const value = dataset.value.data[index] ?? 0;
    const isEmpty = value === 0;
    const isLinkable = isLinkableResource.value && !isEmpty;
    const filterValue = String(props.chartData.filterValues?.[index] ?? label);
    const to =
      isLinkable && resourceTypeByChart.value
        ? {
            name: listRouteName,
            params: {
              cluster: route.params.cluster,
              resource: resourceTypeByChart.value,
            },
            query: {
              ...route.query,
              q: filterValue,
            },
          }
        : null;

    return {
      key: label,
      label,
      value,
      to,
      displayValue: isEmpty ? '—' : props.chartData.suffix ? `${value} ${props.chartData.suffix}` : `${value}`,
      isEmpty,
      isLinkable,
      color: dataset.value.backgroundColor[index],
    };
  })
);

const totalRow = computed(() => ({
  label: t('longhorn.dashboard.total'),
  isEmpty: total.value === 0,
  displayValue: props.chartData.suffix ? `${total.value} ${props.chartData.suffix}` : `${total.value}`,
}));

function handleRowEnter(row, index, event) {
  if (row.isEmpty) return;

  activeIndex.value = index;

  const content = formatTooltipContent({
    label: row.label,
    value: row.value,
    total: total.value,
    suffix: props.chartData.suffix,
    resourceNameKey: props.chartData.resourceNameKey,
    t,
  });

  showTooltip(content, event);
}

function handleRowLeave() {
  activeIndex.value = null;
  hideTooltip();
}
</script>

<template>
  <div class="box" :class="{ horizontal }">
    <h3 class="chart-title">{{ title }}</h3>

    <div class="split-container" :class="{ horizontal }">
      <div class="chart-panel">
        <SemiDoughnut
          v-model:active-index="activeIndex"
          :labels="chartData.labels"
          :datasets="chartData.datasets"
          :suffix="chartData.suffix"
          :resource-name-key="chartData.resourceNameKey"
        />
      </div>

      <div class="metrics-panel">
        <div
          v-for="(row, i) in rows"
          :key="row.key"
          class="metrics-row"
          :class="{ 'active-row': activeIndex === i }"
          @mouseenter="handleRowEnter(row, i, $event)"
          @mouseleave="handleRowLeave"
        >
          <div class="metrics-status" :style="{ backgroundColor: row.color }" />

          <component
            :is="row.isLinkable ? Link : 'span'"
            class="metrics-label"
            :class="{
              'secondary-text-link': row.isLinkable,
              'text-secondary': row.isEmpty,
            }"
            v-bind="row.isLinkable ? { value: { text: row.label, to: row.to }, options: { internal: true } } : {}"
          >
            <template v-if="!row.isLinkable">
              {{ row.label }}
            </template>
          </component>

          <div class="metrics-value" :class="{ 'text-secondary': row.isEmpty }">
            {{ row.displayValue }}
          </div>
        </div>

        <div class="metrics-row total-row">
          <div class="metrics-status" />

          <div class="metrics-label" :class="{ 'text-secondary': totalRow.isEmpty }">
            {{ totalRow.label }}
          </div>

          <div class="metrics-value" :class="{ 'text-secondary': totalRow.isEmpty }">
            {{ totalRow.displayValue }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.box {
  background: var(--simple-box-bg);
  box-shadow: 0 0 10px var(--simple-box-shadow);
  border: 1px solid var(--simple-box-border);
  padding: 16px;
  border-radius: 6px;
}

.chart-title {
  padding: 0 12px;
  line-height: 1.5;
  margin-bottom: 12px;
}

.split-container {
  display: flex;
  gap: 16px;
  flex-direction: row;
  align-items: center;
}

.chart-panel {
  flex: 0 0 130px;
  width: 130px;
  margin: 8px 12px;
}

.metrics-panel {
  flex: 1;
  width: 100%;
  cursor: default;
}

.metrics-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-radius: 4px;

  &.active-row {
    background-color: var(--box-bg);
  }
}

.metrics-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.metrics-label {
  flex: 1;
  line-height: 1.5;
  padding-right: 16px;
  color: var(--body-text);
}

.metrics-value {
  text-align: right;
}

.total-row {
  font-weight: 600;
  margin-bottom: 0;

  .metrics-status {
    border: 1px solid #dcdee4;
    background-color: transparent;
  }
}

.text-secondary {
  color: var(--link-text-secondary);
}

@media (min-width: map-get($breakpoints, '--viewport-9')) {
  .split-container {
    flex-direction: column;

    &.horizontal {
      flex-direction: column;
      align-items: center;
    }
  }
}

@media (min-width: map-get($breakpoints, '--viewport-12')) {
  .split-container {
    flex-direction: column;
  }
}

@media (min-width: '1600px') {
  .split-container {
    flex-direction: column;

    &.horizontal {
      flex-direction: row;
      align-items: flex-start;
    }
  }
}

@media (min-width: '2000px') {
  .split-container {
    flex-direction: row;
  }
}
</style>
