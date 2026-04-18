<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { BadgeState } from '@components/BadgeState';
import { useFetch } from '@shell/components/Resource/Detail/FetchLoader/composables';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';

const VOL_STATE = {
  ATTACHED: 'attached',
  DETACHED: 'detached',
};

const props = defineProps({
  value: {
    type: Object,
    default: () => ({}),
  },
  row: {
    type: Object,
    default: () => ({}),
  },
});

const store = useStore();

const volumeStatus = computed(() => props.row.volumeStatus || props.value);
const state = computed(() => props.row.state);
const robustness = computed(() => props.row.robustness);
const isFaulted = computed(() => props.row.isFaulted);
const readyStatus = computed(() => props.row.readyStatus);

const status = computed(() => props.row.status || {});
const spec = computed(() => props.row.spec || {});
const replicas = computed(() => status.value.replicas || props.row.replicas || []);

const isV2 = computed(() => spec.value.dataEngine === 'v2');
const isEncrypted = computed(() => !!(spec.value.encrypted || status.value.encrypted || status.value.isEncrypted));
const isStandby = computed(() => !!(status.value.isStandby ?? spec.value.standby ?? props.row.standby));

// HA Logic
const nodeAnalysis = computed(() => {
  const activeReplicas = replicas.value.filter((r) => r.running && r.mode?.toLowerCase() !== 'err');
  const hosts = new Set(activeReplicas.map((r) => r.hostId || r.spec?.nodeID || r.spec?.nodeId).filter(Boolean));

  return {
    uniqueNodes: hosts.size,
    totalActive: activeReplicas.length,
    hasNoHost: activeReplicas.some((r) => !(r.hostId || r.spec?.nodeID)),
  };
});

const haType = computed(() => {
  const { uniqueNodes, totalActive, hasNoHost } = nodeAnalysis.value;

  if (totalActive <= 1 || hasNoHost) return null;

  return uniqueNodes === 1 ? 'danger' : uniqueNodes < totalActive ? 'warning' : null;
});

// Upgrade Logic
const engineUpgrade = computed(() => {
  const inStore = store.getters['currentProduct']?.inStore;
  const latest = store.getters[`${inStore}/byId`](
    LONGHORN_RESOURCES.SETTINGS,
    LONGHORN_SETTINGS.DEFAULT_ENGINE_IMAGE
  )?.value;
  const current = status.value.currentImage;

  if (!latest || isV2.value || current === latest) return null;

  const isSafe =
    (state.value === VOL_STATE.ATTACHED && robustness.value === 'healthy') ||
    (state.value === VOL_STATE.DETACHED && !isFaulted.value);

  return isSafe ? { latest } : null;
});

const showLoading = computed(
  () => state.value.endsWith('ing') || replicas.value.some((r) => r.mode?.toLowerCase() === 'wo')
);

// Progress Logic
const getProgress = (type) => {
  const list = status.value[`${type}Status`] || [];
  const key = `is${type.charAt(0).toUpperCase() + type.slice(1)}ing`;
  const count = list.filter((item) => item[key]).length;

  return count > 0 ? { label: type, percent: Math.floor((count / list.length) * 100) } : null;
};

const progressBars = computed(() => [getProgress('restore'), getProgress('rebuild')].filter(Boolean));

useFetch(async () => {
  const inStore = store.getters['currentProduct']?.inStore;

  if (inStore) {
    await store.dispatch(`${inStore}/find`, {
      type: LONGHORN_RESOURCES.SETTINGS,
      id: LONGHORN_SETTINGS.DEFAULT_ENGINE_IMAGE,
    });
  }
});
</script>

<template>
  <div class="volume-state">
    <div v-if="progressBars.length" class="progress-section">
      <div v-for="prog in progressBars" :key="prog.label" class="mini-progress">
        <div class="progress-track">
          <div class="progress-fill" :class="prog.label" :style="{ width: `${prog.percent}%` }" />
        </div>
        <span class="progress-text">{{ prog.label }} {{ prog.percent }}%</span>
      </div>
    </div>

    <div class="state-content">
      <i
        v-if="!readyStatus.ready"
        v-clean-tooltip="`Not Ready<br/>${readyStatus.msg}`"
        class="icon icon-error icon-fw text-error"
      />

      <BadgeState :value="volumeStatus" />

      <i
        v-if="haType"
        v-clean-tooltip="haType === 'danger' ? 'All replicas share a node' : 'Replicas share nodes'"
        :class="['icon icon-warning icon-fw', haType === 'danger' ? 'text-error' : 'text-warning']"
      />

      <div class="meta-icons">
        <i v-if="showLoading" class="icon icon-spinner icon-spin text-muted" />
        <i
          v-if="engineUpgrade"
          v-clean-tooltip="`Upgrade available: ${engineUpgrade.latest}`"
          class="icon icon-upgrade-alt text-muted"
        />
        <i v-if="isStandby" v-clean-tooltip="'Disaster Recovery Volume'" class="icon icon-archive text-muted" />
        <i v-if="isEncrypted" v-clean-tooltip="'Encrypted Volume'" class="icon icon-lock text-muted" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.volume-state {
  display: flex;
  flex-direction: column;

  .progress-section {
    margin-bottom: 4px;
    .mini-progress {
      display: flex;
      align-items: center;
      gap: 6px;
      .progress-track {
        flex: 1;
        height: 3px;
        background: var(--border);
        border-radius: 2px;
        overflow: hidden;
        .progress-fill {
          height: 100%;
          transition: width 0.4s ease;
          &.restore {
            background: var(--info);
          }
          &.rebuild {
            background: var(--warning);
          }
        }
      }
      .progress-text {
        font-size: 10px;
        color: var(--muted);
        text-transform: capitalize;
      }
    }
  }

  .state-content {
    display: flex;
    align-items: center;
    gap: 3px;

    .meta-icons {
      display: flex;
      gap: 3px;
      padding-left: 2px;
    }
  }
}
</style>
