<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Tag from '@shell/components/Tag';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { getBasePath } from '@longhorn/utils/route';

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

const route = useRoute();
const router = useRouter();

const podList = computed(() => {
  const value = props.value || {};

  if (Array.isArray(value.podList)) {
    return value.podList;
  }

  if (Array.isArray(value.workloadsStatus)) {
    return value.workloadsStatus;
  }

  return [];
});

const hostIds = computed(() => {
  const state = props.row?.status?.state;

  // Only show host ID when volume is attached
  if (state !== 'attached') {
    return [];
  }

  const currentNodeId = props.row?.spec?.nodeId || props.row?.status?.ownerID;

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
    <div class="pod-list">
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
