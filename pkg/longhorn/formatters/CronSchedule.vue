<script>
import cronstrue from 'cronstrue';

export default {
  props: {
    value: {
      type: String,
      default: '',
    },
  },
  computed: {
    friendly() {
      if (!this.value) return '—';
      try {
        return cronstrue.toString(this.value, { use24HourTimeFormat: true });
      } catch (e) {
        return this.value;
      }
    },
  },
};
</script>

<template>
  <div class="cron-display">
    <span class="text-secondary">{{ friendly }}</span>
    <span v-if="value" class="raw-cron">{{ value }}</span>
  </div>
</template>

<style lang="scss" scoped>
.cron-display {
  display: flex;
  flex-direction: column;

  .raw-cron {
    font-size: 12px;
    display: inline-block;
    width: fit-content;
    color: var(--muted);
    margin-top: 2px;
    background-color: var(--box-bg);
    padding: 5px;
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
  }
}
</style>
