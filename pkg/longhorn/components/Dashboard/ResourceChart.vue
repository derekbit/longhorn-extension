<script>
import { useTooltip, formatTooltipContent } from '@longhorn/components/Charts/composable';
import SemiDoughnut from '@longhorn/components/Charts/SemiDoughnut';
import Link from '@shell/components/formatter/Link';
import { PRODUCT_NAME } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';

const tooltipComposable = useTooltip();

export default {
  name: 'ResourceChart',
  components: {
    Link,
    SemiDoughnut,
  },
  props: {
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
  },
  data() {
    return {
      activeIndex: null,
      showTooltip: tooltipComposable.showTooltip,
      hideTooltip: tooltipComposable.hideTooltip,
      listRouteName: `c-cluster-${PRODUCT_NAME}-resource`,
    };
  },
  computed: {
    dataset() {
      return this.chartData.datasets?.[0] ?? { data: [], backgroundColor: [] };
    },
    isLinkableResource() {
      return ['longhorn.dashboard.node.title', 'longhorn.dashboard.volume.title'].includes(
        this.chartData.resourceNameKey
      );
    },
    resourceTypeByChart() {
      const chartResource = this.chartData.resourceNameKey;

      if (chartResource === 'longhorn.dashboard.node.title') {
        return LONGHORN_RESOURCES.NODES;
      }

      if (chartResource === 'longhorn.dashboard.volume.title') {
        return LONGHORN_RESOURCES.VOLUMES;
      }

      return null;
    },
    total() {
      const sum = this.dataset.data.reduce((totalValue, currentValue) => totalValue + currentValue, 0);

      return Math.round(sum * 100) / 100;
    },
    rows() {
      const labels = this.chartData?.labels || [];
      const data = this.dataset?.data || [];
      const backgroundColor = this.dataset?.backgroundColor || [];

      return labels.map((label, index) => {
        const value = data[index] ?? 0;
        const isEmpty = value === 0;
        const isLinkable = this.isLinkableResource && !isEmpty;
        const filterValue = String(this.chartData.filterValues?.[index] ?? label);
        const to =
          isLinkable && this.resourceTypeByChart
            ? {
                name: this.listRouteName,
                params: {
                  cluster: this.$route.params.cluster,
                  resource: this.resourceTypeByChart,
                },
                query: {
                  ...this.$route.query,
                  q: filterValue,
                },
              }
            : null;

        return {
          key: label,
          label,
          value,
          to,
          displayValue: isEmpty ? '—' : this.chartData.suffix ? `${value} ${this.chartData.suffix}` : `${value}`,
          isEmpty,
          isLinkable,
          color: backgroundColor[index],
        };
      });
    },
    totalRow() {
      return {
        label: this.t('longhorn.dashboard.total'),
        isEmpty: this.total === 0,
        displayValue: this.chartData.suffix ? `${this.total} ${this.chartData.suffix}` : `${this.total}`,
      };
    },
  },
  methods: {
    handleRowEnter(row, index, event) {
      if (row.isEmpty) return;

      this.activeIndex = index;

      const content = formatTooltipContent({
        label: row.label,
        value: row.value,
        total: this.total,
        suffix: this.chartData.suffix,
        resourceNameKey: this.chartData.resourceNameKey,
        t: (key) => this.t(key),
      });

      this.showTooltip(content, event);
    },
    handleRowLeave() {
      this.activeIndex = null;
      this.hideTooltip();
    },
  },
};
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

          <Link
            v-if="row.isLinkable && row.to"
            :row="row"
            :value="{ text: row.label, to: row.to }"
            :options="{ internal: true }"
            class="metrics-label secondary-text-link"
          />
          <span v-else class="metrics-label" :class="{ 'text-secondary': row.isEmpty }">
            {{ row.label }}
          </span>

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
