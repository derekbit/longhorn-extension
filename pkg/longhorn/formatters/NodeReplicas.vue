<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({
  value: {
    type: [Number, String],
    default: 0,
  },
  row: {
    type: Object,
    default: () => ({}),
  },
});

const store = useStore();

const replicaCount = computed(() => {
  const val = props.value;

  return typeof val === 'number' ? val : parseInt(val, 10) || 0;
});

const nodeName = computed(() => {
  return props.row?.metadata?.name || props.row?.nodeId || props.row?.id || props.row?.name || '';
});

const canOpen = computed(() => !!nodeName.value && replicaCount.value > 0);

const openReplicasModal = () => {
  if (!canOpen.value) {
    return;
  }

  store.dispatch('management/promptModal', {
    component: 'NodeReplicasList',
    resources: [props.row],
    modalWidth: '860px',
  });
};
</script>

<template>
  <div class="node-replicas-formatter">
    <button v-if="canOpen" type="button" class="btn role-link replicas-link" @click="openReplicasModal">
      {{ replicaCount }}
    </button>
    <span v-else class="replicas-text">
      {{ replicaCount }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.node-replicas-formatter {
  text-align: center;

  .replicas-link {
    color: #0075e0;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .replicas-text {
    color: inherit;
  }
}
</style>
