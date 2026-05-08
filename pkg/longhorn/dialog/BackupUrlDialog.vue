<script>
import { Card } from '@components/Card';
import CopyToClipboard from '@shell/components/CopyToClipboard';

export default {
  name: 'BackupUrlDialog',

  emits: ['close'],

  components: {
    Card,
    CopyToClipboard,
  },

  props: {
    url: {
      type: String,
      default: '',
    },
  },

  methods: {
    close() {
      this.$emit('close');
    },
  },
};
</script>

<template>
  <Card class="backup-url-dialog" :show-highlight-border="false">
    <template #title>
      <h4 class="title-text">{{ t('longhorn.backupVolume.dialog.backupUrl.title') }}</h4>
    </template>

    <template #body>
      <div class="url-input-group">
        <input :value="url" readonly class="url-input" type="text" />
      </div>
    </template>

    <template #actions>
      <button type="button" class="btn role-secondary" @click="close">{{ t('generic.cancel') }}</button>
      <div class="spacer" />
      <CopyToClipboard :text="url" action-color="bg-primary" :disabled="!url" />
    </template>
  </Card>
</template>

<style lang="scss" scoped>
.title-text {
  margin: 0;
}

.url-input-group {
  .url-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
    background-color: var(--input-bg);
    color: var(--input-text);
    font-family: monospace;
    font-size: 13px;
  }
}

:deep(.card-actions) {
  .spacer {
    flex: 1;
  }
}
</style>
