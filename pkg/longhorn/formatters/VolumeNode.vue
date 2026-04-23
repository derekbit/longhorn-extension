<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Tag from '@shell/components/Tag';
import { EMPTY_DISPLAY } from '@longhorn/types/display';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { getBasePath } from '@longhorn/utils/route';
import { parseJsonObject } from '@longhorn/utils/json';

dayjs.extend(relativeTime);

const props = defineProps({
  value: {
    type: [Object, String],
    default: () => ({}),
  },
  row: {
    type: Object,
    default: () => ({}),
  },
});

const route = useRoute();
const router = useRouter();

const kubernetesStatus = computed(() => {
  return parseJsonObject(props.value);
});

const podList = computed(() => {
  const value = kubernetesStatus.value || {};

  if (Array.isArray(value.podList)) {
    return value.podList;
  }

  if (Array.isArray(value.workloadsStatus)) {
    return value.workloadsStatus;
  }

  return [];
});

const podTooltip = computed(() => {
  if (!podList.value.length) {
    return '';
  }

  const status = kubernetesStatus.value || {};
  const latest = podList.value[0] || {};
  const lastTimeUsed = status.lastPodRefAt ? dayjs(status.lastPodRefAt).fromNow() : EMPTY_DISPLAY;
  const lastWorkloadName = latest.workloadName || EMPTY_DISPLAY;
  const lastWorkloadType = latest.workloadType || EMPTY_DISPLAY;
  const lastPodName = latest.podName || latest.name || EMPTY_DISPLAY;

  return {
    content: [
      `<div>Last time used by Pod : ${lastTimeUsed}</div>`,
      `<div>Last Workload Name : ${lastWorkloadName}</div>`,
      `<div>Last Workload Type : ${lastWorkloadType}</div>`,
      `<div>Last Pod Name : ${lastPodName}</div>`,
    ].join(''),
    html: true,
  };
});

const hostIds = computed(() => {
  const state = props.row?.status?.state;

  // Only show host ID when volume is attached
  if (state !== 'attached') {
    return [];
  }

  const currentNodeId =
    props.row?.spec?.nodeId || props.row?.spec?.nodeID || props.row?.status?.ownerID || props.row?.ownerID;

  return currentNodeId ? [currentNodeId] : [];
});

const clusterId = computed(() => route.params.cluster);
const basePath = computed(() => getBasePath(router, clusterId.value));

const getNodeLink = (hostId) => {
  if (!basePath.value || !hostId) return '';

  return `${basePath.value}/${LONGHORN_RESOURCES.NODES}/${LONGHORN_NAMESPACE}/${hostId}`;
};
</script>

<template>
  <div class="volume-node">
    <div v-clean-tooltip="podTooltip" class="pod-list">
      <template v-if="podList.length">
        <Tag v-for="(item, index) in podList" :key="index">
          {{ item.podName || item.name || item }}
        </Tag>
      </template>
      <div v-else-if="!hostIds.length" class="text-muted">&mdash;</div>
    </div>
    <div v-if="hostIds.length" class="host-list">
      <div v-for="(hostId, index) in hostIds" :key="index" class="host-item">
        <router-link v-if="getNodeLink(hostId)" :to="getNodeLink(hostId)">
          {{ hostId }}
        </router-link>
        <span v-else>
          {{ hostId }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.volume-node {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.host-item {
  margin: 2px 0;
}
</style>
