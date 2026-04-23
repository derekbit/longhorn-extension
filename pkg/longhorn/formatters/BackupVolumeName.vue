<script>
export default {
  name: 'BackupVolumeName',

  props: {
    value: {
      type: String,
      default: '',
    },
    col: {
      type: Object,
      default: () => ({}),
    },
    row: {
      type: Object,
      default: () => ({}),
    },
  },

  computed: {
    to() {
      return this.row?.detailLocation || null;
    },
  },
};
</script>

<template>
  <span>
    <router-link v-if="to" :to="to">
      {{ value }}
    </router-link>
    <span v-else>
      {{ value }}
      <template v-if="!value && col.dashIfEmpty">
        <span class="text-muted">&mdash;</span>
      </template>
    </span>
  </span>
</template>
