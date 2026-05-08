<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { BadgeState } from '@components/BadgeState';
import { useI18n } from '@shell/composables/useI18n';
import { LONGHORN_RESOURCES, LONGHORN_SETTINGS } from '@longhorn/types/resources';
import { filterReplicasByVolumeName, getReplicaHostIds, shouldShowDataLocalityWarning } from '@longhorn/utils/volume';

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
const { t } = useI18n(store);

const volumeStatus = computed(() => props.row.volumeStatus || props.value);
const state = computed(() => props.row.state);
const robustness = computed(() => props.row.robustness);
const isFaulted = computed(() => props.row.isFaulted);
const readyStatus = computed(() => props.row.readyStatus || { ready: true, msg: '' });

const status = computed(() => props.row.status || {});
const spec = computed(() => props.row.spec || {});
const replicas = computed(() => status.value.replicas || props.row.replicas || []);
const volumeNameCandidates = computed(() => {
  const id = String(props.row.id || '');
  const candidates = [props.row.metadata?.name, props.row.name, id].filter(Boolean);

  return [...new Set(candidates)];
});

const isV2 = computed(() => spec.value.dataEngine === 'v2');
const isEncrypted = computed(() => !!(spec.value.encrypted || status.value.encrypted || status.value.isEncrypted));
const isStandby = computed(() => !!(status.value.isStandby ?? spec.value.standby ?? props.row.standby));
const dataLocality = computed(() => String(props.row.dataLocality || spec.value.dataLocality || '').toLowerCase());
const attachedNode = computed(() => {
  return (
    props.row.controllers?.[0]?.hostId ||
    props.row.controllers?.[0]?.hostID ||
    props.row.status?.currentNodeID ||
    props.row.status?.currentNodeId ||
    ''
  );
});
const replicaHostsFromRow = computed(() => {
  return getReplicaHostIds(replicas.value);
});
const replicaHostsFromStore = computed(() => {
  const inStore = store.getters['currentProduct']?.inStore;

  if (!inStore || !volumeNameCandidates.value.length) {
    return [];
  }

  const allReplicas = store.getters[`${inStore}/all`]?.(LONGHORN_RESOURCES.REPLICAS) || [];
  const matchedReplicas = filterReplicasByVolumeName(allReplicas, volumeNameCandidates.value);

  return getReplicaHostIds(matchedReplicas);
});
const effectiveReplicaHosts = computed(() => {
  if (replicaHostsFromRow.value.length) {
    return replicaHostsFromRow.value;
  }

  return replicaHostsFromStore.value;
});
const showDataLocalityWarning = computed(() => {
  return shouldShowDataLocalityWarning({
    dataLocality: dataLocality.value,
    state: state.value,
    attachedNode: attachedNode.value,
    replicaHosts: effectiveReplicaHosts.value,
  });
});

const notReadyTooltip = computed(() => {
  if (!readyStatus.value.msg) {
    return t('longhorn.volume.tooltip.notReady');
  }

  return `${t('longhorn.volume.tooltip.notReady')}<br/>${readyStatus.value.msg}`;
});

const haTooltip = computed(() => {
  if (haType.value === 'danger') {
    return t('longhorn.volume.tooltip.replicasShareSingleNode');
  }

  return t('longhorn.volume.tooltip.replicasShareNodes');
});

const engineUpgradeTooltip = computed(() => {
  return t('longhorn.volume.tooltip.engineUpgradeAvailable', {
    version: engineUpgrade.value?.latest || '',
  });
});

const standbyTooltip = computed(() => t('longhorn.volume.tooltip.disasterRecoveryVolume'));
const encryptedTooltip = computed(() => t('longhorn.volume.tooltip.encryptedVolume'));

// HA Logic
const nodeAnalysis = computed(() => {
  const activeReplicas = replicas.value.filter((replica) => replica.running && replica.mode?.toLowerCase() !== 'err');
  const hosts = new Set(
    activeReplicas.map((replica) => replica.hostId || replica.spec?.nodeID || replica.spec?.nodeId).filter(Boolean)
  );

  return {
    uniqueNodes: hosts.size,
    totalActive: activeReplicas.length,
    hasNoHost: activeReplicas.some((replica) => !(replica.hostId || replica.spec?.nodeID)),
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
  const byIdGetter = inStore ? store.getters[`${inStore}/byId`] : null;
  const latest = byIdGetter?.(LONGHORN_RESOURCES.SETTINGS, LONGHORN_SETTINGS.DEFAULT_ENGINE_IMAGE)?.value;
  const current = status.value.currentImage;

  if (!latest || isV2.value || current === latest) return null;

  const isSafe =
    (state.value === VOL_STATE.ATTACHED && robustness.value === 'healthy') ||
    (state.value === VOL_STATE.DETACHED && !isFaulted.value);

  return isSafe ? { latest } : null;
});

const showLoading = computed(() => {
  return (
    String(state.value || '').endsWith('ing') || replicas.value.some((replica) => replica.mode?.toLowerCase() === 'wo')
  );
});

// Progress Logic
const getProgress = (type) => {
  const list = status.value[`${type}Status`] || [];
  const key = `is${type.charAt(0).toUpperCase() + type.slice(1)}ing`;
  const count = list.filter((item) => item[key]).length;

  return count > 0 ? { label: type, percent: Math.floor((count / list.length) * 100) } : null;
};

const progressBars = computed(() => [getProgress('restore'), getProgress('rebuild')].filter(Boolean));
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
      <i v-if="!readyStatus.ready" v-clean-tooltip="notReadyTooltip" class="icon icon-error icon-fw text-error" />

      <BadgeState :value="volumeStatus" />

      <i
        v-if="haType"
        v-clean-tooltip="haTooltip"
        :class="['icon icon-warning icon-fw', haType === 'danger' ? 'text-error' : 'text-warning']"
      />

      <div class="meta-icons">
        <i
          v-if="showDataLocalityWarning"
          v-clean-tooltip="t('longhorn.volume.tooltip.dataLocalityNotMet')"
          class="icon icon-warning text-warning"
        />
        <i v-if="showLoading" class="icon icon-spinner icon-spin text-muted" />
        <i v-if="engineUpgrade" v-clean-tooltip="engineUpgradeTooltip" class="icon icon-upgrade-alt text-muted" />
        <i v-if="isStandby" v-clean-tooltip="standbyTooltip" class="icon icon-archive text-muted" />
        <i v-if="isEncrypted" v-clean-tooltip="encryptedTooltip" class="icon icon-lock text-muted" />
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
