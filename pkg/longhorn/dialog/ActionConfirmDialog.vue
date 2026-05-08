<script>
import { Card } from '@components/Card';

export default {
  name: 'ActionConfirmDialog',

  components: {
    Card,
  },

  emits: ['close'],

  props: {
    title: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    confirmLabel: {
      type: String,
      default: '',
    },
    confirmButtonClass: {
      type: String,
      default: 'role-primary',
    },
    onConfirm: {
      type: Function,
      default: null,
    },
  },

  data() {
    return {
      isSubmitting: false,
    };
  },

  computed: {
    isConfirmMode() {
      return !!this.confirmLabel && typeof this.onConfirm === 'function';
    },
  },

  methods: {
    close() {
      if (this.isSubmitting) {
        return;
      }

      this.$emit('close');
    },

    async confirm() {
      if (!this.isConfirmMode || this.isSubmitting) {
        return;
      }

      this.isSubmitting = true;

      try {
        await this.onConfirm();
        this.$emit('close');
      } catch (err) {
        this.$store.dispatch('growl/fromError', { err });
      } finally {
        this.isSubmitting = false;
      }
    },
  },
};
</script>

<template>
  <Card class="action-confirm-dialog" :show-highlight-border="false">
    <template #title>
      <h4 class="dialog-title">{{ title }}</h4>
    </template>

    <template #body>
      <p class="dialog-message">{{ message }}</p>
    </template>

    <template #actions>
      <button type="button" class="btn role-secondary" :disabled="isSubmitting" @click="close">
        {{ isConfirmMode ? t('generic.cancel') : t('generic.close') }}
      </button>
      <button
        v-if="isConfirmMode"
        type="button"
        class="btn ml-10"
        :class="confirmButtonClass"
        :disabled="isSubmitting"
        @click="confirm"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </Card>
</template>

<style lang="scss" scoped>
.dialog-title {
  margin: 0;
}

.dialog-message {
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
}
</style>
