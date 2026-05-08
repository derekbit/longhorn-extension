<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
import { useStore } from 'vuex';
import { useI18n } from '@shell/composables/useI18n';
import { useTooltip, formatTooltipContent } from '@longhorn/components/Charts/composable';

const MIN_ANGLE_DEGREES = 5;
const CIRCUMFERENCE_DEGREES = 240;

const props = defineProps({
  labels: {
    type: Array,
    default: () => [],
  },
  datasets: {
    type: Array,
    default: () => [],
  },
  suffix: {
    type: String,
    default: '',
  },
  resourceNameKey: {
    type: String,
    default: undefined,
  },
  activeIndex: {
    type: [Number, null],
    default: null,
  },
});

const emit = defineEmits(['update:activeIndex']);

Chart.register(DoughnutController, ArcElement, Tooltip);

const store = useStore();
const { t } = useI18n(store);
const { showTooltip, hideTooltip } = useTooltip();

const canvasRef = ref(null);
let chartInstance = null;
const isMouseOutside = ref(true);
const borderColor = ref('');

function round(value) {
  return Math.round(value * 100) / 100;
}

function updateColorsFromTheme() {
  if (typeof window !== 'undefined') {
    const bodyStyles = getComputedStyle(document.body);
    const bg = bodyStyles.getPropertyValue('--body-bg').trim();

    borderColor.value = bg || '#FFFFFF';
  }
}

const stableChartState = computed(() => {
  const labels = [];
  const data = [];
  const backgroundColor = [];
  const indexMap = [];

  const sourceLabels = props.labels || [];
  const sourceDataset = props.datasets?.[0];

  if (sourceDataset) {
    sourceDataset.data.forEach((value, originalIndex) => {
      const numeric = typeof value === 'string' ? parseFloat(value) : value;

      if (!isNaN(numeric) && numeric > 0) {
        labels.push(sourceLabels[originalIndex]);
        data.push(numeric);
        backgroundColor.push(sourceDataset.backgroundColor[originalIndex]);
        indexMap.push(originalIndex);
      }
    });
  }

  return {
    chartData: {
      labels,
      datasets: [{ data, backgroundColor }],
    },
    indexMap,
    total: data.reduce((totalValue, currentValue) => totalValue + currentValue, 0),
  };
});

const minimumValue = computed(() => {
  return round(stableChartState.value.total * (MIN_ANGLE_DEGREES / CIRCUMFERENCE_DEGREES));
});

const adjustedStableChartState = computed(() => {
  const rawState = stableChartState.value;
  const { data, ...rest } = rawState.chartData.datasets[0];

  let totalAdjustment = 0;

  const adjustedData = data.map((value) => {
    if (value < minimumValue.value) {
      totalAdjustment += minimumValue.value - value;

      return minimumValue.value;
    }

    return value;
  });

  const largestIndex = adjustedData.reduce(
    (maxIndex, currentValue, currentIndex, arr) => (currentValue > arr[maxIndex] ? currentIndex : maxIndex),
    0
  );

  if (adjustedData.length > 0) {
    adjustedData[largestIndex] = round(adjustedData[largestIndex] - totalAdjustment);

    if (adjustedData[largestIndex] < 0) {
      adjustedData[largestIndex] = 0;
    }
  }

  return {
    ...rawState,
    chartData: {
      ...rawState.chartData,
      datasets: [{ data: adjustedData, ...rest }],
    },
  };
});
// ----------------------------------------------------------------------

const activeFilteredIndex = computed(() => {
  if (props.activeIndex === null) return null;
  const idx = stableChartState.value.indexMap.indexOf(props.activeIndex);

  return idx === -1 ? null : idx;
});

const activeSlice = computed(() => {
  const idx = activeFilteredIndex.value;

  if (idx === null) return null;

  return {
    label: stableChartState.value.chartData.labels[idx],
    value: stableChartState.value.chartData.datasets[0].data[idx],
  };
});

const displayNumber = computed(() => {
  const value = activeSlice.value?.value ?? stableChartState.value.total ?? 0;

  return `${round(value)} ${props.suffix || ''}`;
});
const displayLabel = computed(() => activeSlice.value?.label ?? 'In Total');

function handleMouseEnter() {
  isMouseOutside.value = false;
}

function handleMouseLeave() {
  isMouseOutside.value = true;
  if (props.activeIndex !== null) emit('update:activeIndex', null);
  hideTooltip();
}

const fixCenterPlugin = {
  id: 'fixCenter',
  beforeDraw(chart) {
    const meta = chart.getDatasetMeta(0);

    if (!meta?.data?.length) return;
    const { width, height } = chart;
    const outerRadius = Math.min(width, height) / 2;
    const cutoutRatio = parseFloat(chart.options.cutout) / 100 || 0.8;
    const innerRadius = outerRadius * cutoutRatio;
    const cx = width / 2;
    const cy = height / 2;

    meta.data.forEach((seg) => {
      const arc = seg;

      seg.x = cx;
      seg.y = cy;
      arc.outerRadius = outerRadius - 2;
      arc.innerRadius = innerRadius - 2;
    });
  },
};

const emptyDoughnutPlugin = {
  id: 'emptyDoughnut',
  beforeDraw(chart) {
    const meta = chart.getDatasetMeta(0);

    if (!meta?.data?.length) {
      const { ctx, width, height } = chart;

      const cx = width / 2;
      const cy = height / 2;

      const outerRadius = Math.min(width, height) / 2;
      const cutoutRatio = parseFloat(chart.options.cutout) / 100 || 0.8;
      const innerRadius = outerRadius * cutoutRatio;

      const adjustedOuterRadius = outerRadius - 2;
      const adjustedInnerRadius = innerRadius - 2;

      const borderWidth = 2;

      const ringRadius = (adjustedOuterRadius + adjustedInnerRadius) / 2;
      const totalRingWidth = adjustedOuterRadius - adjustedInnerRadius;

      const startAngleDegreesCorrected = 150;
      const circumferenceDegrees = CIRCUMFERENCE_DEGREES;

      const startAngle = (startAngleDegreesCorrected * Math.PI) / 180;
      const endAngle = ((startAngleDegreesCorrected + circumferenceDegrees) * Math.PI) / 180;

      ctx.save();

      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, startAngle, endAngle);

      ctx.strokeStyle = 'rgba(217, 221, 223, 0.5)';
      ctx.lineWidth = totalRingWidth - borderWidth;
      ctx.stroke();

      ctx.restore();
    }
  },
};

const chartOptions = {
  rotation: -120,
  circumference: CIRCUMFERENCE_DEGREES,
  cutout: '80%',
  responsive: true,
  maintainAspectRatio: true,
  elements: {
    arc: {
      borderRadius: 3,
      hoverOffset: 1,
      borderWidth: 1,
      borderColor: (context) => {
        if (context.active) {
          return context.dataset.backgroundColor?.[context.dataIndex] || '#000000';
        }

        return borderColor.value;
      },
    },
  },
  onHover: (event, elements) => {
    if (isMouseOutside.value) return;

    const mouseEvent = event.native;

    if (!mouseEvent) {
      hideTooltip();

      return;
    }

    const filteredIdx = elements.length ? elements[0].index : null;
    const originalIdx = filteredIdx !== null ? stableChartState.value.indexMap[filteredIdx] : null;

    if (props.activeIndex !== originalIdx) {
      emit('update:activeIndex', originalIdx);
    }

    if (filteredIdx !== null && originalIdx !== null) {
      const content = formatTooltipContent({
        label: props.labels?.[originalIdx] ?? '',
        value: stableChartState.value.chartData.datasets[0].data[filteredIdx],
        total: stableChartState.value.total,
        suffix: props.suffix,
        resourceNameKey: props.resourceNameKey,
        t,
      });

      showTooltip(content, mouseEvent);
    } else {
      hideTooltip();
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
  interaction: { mode: 'nearest', intersect: false },
};

function attachListeners(canvas) {
  canvas.addEventListener('mouseenter', handleMouseEnter);
  canvas.addEventListener('mouseleave', handleMouseLeave);
}

function detachListeners(canvas) {
  canvas.removeEventListener('mouseenter', handleMouseEnter);
  canvas.removeEventListener('mouseleave', handleMouseLeave);
}

function cleanup() {
  if (chartInstance?.canvas) {
    detachListeners(chartInstance.canvas);
  }
  chartInstance?.destroy();
}

function renderChart() {
  if (!canvasRef.value) return;

  cleanup();

  chartInstance = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: adjustedStableChartState.value.chartData,
    options: chartOptions,
    plugins: [fixCenterPlugin, emptyDoughnutPlugin],
  });

  attachListeners(chartInstance.canvas);
}

watch(
  () => adjustedStableChartState.value.chartData,
  () => {
    renderChart();
  },
  { deep: true }
);

watch(
  activeFilteredIndex,
  (filteredIdx) => {
    if (!chartInstance) return;
    chartInstance.setActiveElements(filteredIdx === null ? [] : [{ datasetIndex: 0, index: filteredIdx }]);
    chartInstance.update();
  },
  { flush: 'post' }
);

watch(
  () => store.getters['prefs/theme'],
  () => {
    updateColorsFromTheme();
    chartInstance?.update();
  }
);

onMounted(() => {
  updateColorsFromTheme();
  renderChart();
});

onBeforeUnmount(cleanup);
</script>

<template>
  <div class="chart-container">
    <canvas ref="canvasRef" />
    <div class="center-text">
      <div class="number">{{ displayNumber }}</div>
      <div class="label">{{ displayLabel }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.chart-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-width: 0;
}
.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}
.center-text {
  position: absolute;
  inset: 0;
  pointer-events: none;
  text-align: center;
}
.center-text .number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: 600;
  font-size: 18px;
  white-space: nowrap;
}
.center-text .label {
  position: absolute;
  bottom: 0%;
  left: 50%;
  transform: translate(-50%, -75%);
  font-weight: 400;
  font-size: 14px;
  white-space: nowrap;
}
</style>
