<script>
import { marked } from 'marked';
import { LabeledInput } from '@components/Form/LabeledInput';
import { Checkbox } from '@components/Form/Checkbox';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import FormValidation from '@shell/mixins/form-validation';

export default {
  name: 'SettingsForm',

  components: {
    LabeledInput,
    Checkbox,
    LabeledSelect,
    Tabbed,
    Tab,
  },

  mixins: [FormValidation],

  props: {
    settings: {
      type: Object,
      required: true,
    },
    groups: {
      type: Array,
      default: () => [],
    },
    values: {
      type: Object,
      required: true,
    },
    showNoMatches: {
      type: Boolean,
      default: false,
    },
    noMatchesMessage: {
      type: String,
      default: '',
    },
    mode: {
      type: String,
      default: 'edit',
    },
  },

  data() {
    return {
      fvFormRuleSets: [],
      shouldValidate: false,
      touchedSettings: {},
    };
  },

  computed: {
    value() {
      return this.values;
    },

    inlineErrors() {
      return this.fvFormRuleSets.reduce((acc, { path }) => {
        const error = this.fvGetPathErrors([path])[0];

        if (error) {
          acc[path] = this.formatInlineError(error);
        }

        return acc;
      }, {});
    },

    fvValidationErrors() {
      return this.fvFormRuleSets.reduce((acc, ruleset) => {
        const fieldLabel = ruleset.translationKey || this.settings[ruleset.path]?.label || ruleset.path;
        const fieldErrors = this.fvGetPathErrors([ruleset.path]);

        fieldErrors.forEach((error) => {
          acc.push(`"${fieldLabel}" ${error}`);
        });

        return acc;
      }, []);
    },

    fvExtraRules() {
      return {
        required: (val) => (val === undefined || val === null || val === '' ? 'value is required' : undefined),
        requiredInt: (val) => (isNaN(parseInt(val, 10)) ? 'value must be integer' : undefined),
        isInteger: (val) => {
          const hasDecimals = `${val}`.match(/\.+/g);

          return !Number.isInteger(+val) || hasDecimals ? 'value must be integer' : undefined;
        },
      };
    },
  },

  watch: {
    values: {
      handler: 'setupValidationRules',
      deep: true,
    },
    settings: {
      handler: 'setupValidationRules',
      immediate: true,
    },
  },

  mounted() {
    this.initMarkdownRenderer();
  },

  methods: {
    initMarkdownRenderer() {
      const renderer = new marked.Renderer();
      const linkRenderer = renderer.link;

      renderer.link = (href, title, text) => {
        const rendered = linkRenderer.call(renderer, href, title, text);

        return rendered.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
      };

      this.$markdownRenderer = renderer;
    },

    markSettingTouched(settingId) {
      if (settingId && !this.touchedSettings[settingId]) {
        this.touchedSettings = { ...this.touchedSettings, [settingId]: true };
      }
    },

    updateValue(settingId, value) {
      this.shouldValidate = true;
      this.markSettingTouched(settingId);
      this.$emit('update:value', { ...this.values, [settingId]: value });
    },

    updateJsonField(settingId, key, value) {
      const currentValue = this.values[settingId] || {};

      this.updateValue(settingId, { ...currentValue, [key]: value });
    },

    setupValidationRules() {
      const ruleSets = [];

      Object.entries(this.settings).forEach(([settingId, setting]) => {
        if (!setting.required) return;

        const rootRules = setting.type === 'int' ? ['requiredInt', 'isInteger'] : ['required'];
        const isJsonObject = setting.isJsonObject && Array.isArray(setting.jsonKeys);

        if (!isJsonObject) {
          ruleSets.push({
            path: settingId,
            rules: rootRules,
            rootObject: this.values,
            translationKey: setting.label || settingId,
          });
        }

        if (isJsonObject) {
          const childRules = setting.type === 'int' ? ['requiredInt', 'isInteger'] : ['required'];

          setting.jsonKeys.forEach((key) => {
            ruleSets.push({
              path: `${settingId}.${key}`,
              rules: childRules,
              rootObject: this.values,
              translationKey: `${setting.label} - ${key.toUpperCase()}`,
            });
          });
        }
      });
      this.fvFormRuleSets = ruleSets;
    },

    hasGroupError(group) {
      if (!this.shouldValidate || !group?.children?.length) return false;

      const groupTouched = group.children.some((id) => this.touchedSettings[id]);

      if (!groupTouched) return false;

      return group.children.some((settingId) => {
        if (this.inlineErrors[settingId]) return true;

        const setting = this.settings[settingId];

        return (
          setting?.isJsonObject && (setting.jsonKeys || []).some((key) => this.inlineErrors[`${settingId}.${key}`])
        );
      });
    },

    toggleBoolByLabel(settingId) {
      const setting = this.settings[settingId];

      if (setting?.type === 'bool' && !setting.readOnly && this.mode === 'edit') {
        this.updateValue(settingId, !this.values[settingId]);
      }
    },

    formatInlineError(error) {
      return error ? error.charAt(0).toUpperCase() + error.slice(1) : '';
    },

    getInputWrapperClass(setting) {
      if (!setting) return '';
      if (setting.type === 'bool') return 'input-wrapper--bool';
      if (setting.options) return 'input-wrapper--select';

      return `input-wrapper--${setting.type === 'int' ? 'int' : 'text'}`;
    },

    formatDescription(text) {
      const fallback = (val) => (val || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      if (!text) return '';
      if (!this.$markdownRenderer) return fallback(text);

      try {
        return marked(text, {
          renderer: this.$markdownRenderer,
          breaks: true,
        });
      } catch (e) {
        return fallback(text);
      }
    },
  },
};
</script>

<template>
  <div class="settings-container">
    <Tabbed :side-tabs="true">
      <Tab
        v-for="group in groups"
        :key="group.name"
        :name="group.name"
        :weight="group.weight"
        :label="group.label"
        :error="hasGroupError(group)"
      >
        <div v-for="settingId in group.children" :key="settingId" class="setting-item">
          <template v-if="settings[settingId]?.isJsonObject">
            <div class="json-object-section">
              <h3 class="label">
                <span v-if="settings[settingId].required" class="text-error">* </span>
                {{ settings[settingId].label }}:
              </h3>
              <div v-for="key in settings[settingId].jsonKeys" :key="key" class="json-field-row">
                <div class="responsive-field-row">
                  <h4 class="json-key-label">{{ key.toUpperCase() }}:</h4>
                  <div class="input-wrapper" :class="getInputWrapperClass(settings[settingId])">
                    <component
                      :is="settings[settingId].options ? 'LabeledSelect' : 'LabeledInput'"
                      :value="(values[settingId] || {})[key]"
                      :mode="mode"
                      :options="settings[settingId].options"
                      :disabled="settings[settingId].readOnly"
                      @update:value="updateJsonField(settingId, key, $event)"
                    />
                  </div>
                  <div v-if="inlineErrors[`${settingId}.${key}`]" class="text-error error-text">
                    {{ inlineErrors[`${settingId}.${key}`] }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="responsive-field-row">
              <h3
                class="label"
                :class="{
                  'clickable-label':
                    settings[settingId].type === 'bool' && !settings[settingId].readOnly && mode === 'edit',
                }"
                @click="toggleBoolByLabel(settingId)"
              >
                <span v-if="settings[settingId].required" class="text-error">* </span>
                {{ settings[settingId].label }}:
              </h3>

              <div class="input-wrapper" :class="getInputWrapperClass(settings[settingId])">
                <template v-if="settings[settingId].type === 'bool'">
                  <Checkbox
                    :value="values[settingId]"
                    :mode="mode"
                    :disabled="settings[settingId].readOnly"
                    @update:value="updateValue(settingId, $event)"
                  />
                </template>

                <template v-else>
                  <LabeledSelect
                    v-if="settings[settingId].options"
                    :value="values[settingId]"
                    :mode="mode"
                    :options="settings[settingId].options"
                    :disabled="settings[settingId].readOnly"
                    @update:value="updateValue(settingId, $event)"
                  />
                  <LabeledInput
                    v-else
                    :value="values[settingId]"
                    :mode="mode"
                    :type="settings[settingId].type === 'int' ? 'number' : 'text'"
                    :disabled="settings[settingId].readOnly"
                    @update:value="updateValue(settingId, $event)"
                  />
                </template>
              </div>

              <div v-if="inlineErrors[settingId]" class="text-error error-text">
                {{ inlineErrors[settingId] }}
              </div>
            </div>
          </template>

          <!-- eslint-disable vue/no-v-html -->
          <p v-if="settings[settingId].description" class="description">
            <span v-html="formatDescription(settings[settingId].description)"></span>
          </p>
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </Tab>

      <div v-if="showNoMatches" class="no-matches-message text-muted">
        {{ noMatchesMessage }}
      </div>
    </Tabbed>
  </div>
</template>

<style lang="scss" scoped>
.settings-container {
  margin-top: 20px;

  ::v-deep .tabbed-container.side-tabs > .tab-container {
    max-height: var(--settings-tab-content-max-height, none);
    overflow-y: auto;
  }

  ::v-deep .tabbed-container.side-tabs > .tabs.vertical {
    position: sticky;
    top: 0;
    max-height: 100%;
    overflow-y: auto;
    align-self: flex-start;
    z-index: 1;
  }

  .setting-item {
    margin-bottom: 20px;
  }

  .responsive-field-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;

    .label {
      margin: 0 10px 0 0;
      white-space: nowrap;
    }

    .clickable-label {
      cursor: pointer;
      user-select: none;
    }

    .input-wrapper {
      flex: 0 1 auto;

      ::v-deep .labeled-select,
      .labeled-input {
        width: 100%;
      }

      &.input-wrapper--int {
        flex: 0 0 100px;
        min-width: 100px;
        max-width: 100px;
      }

      &.input-wrapper--select {
        flex: 0 0 250px;
        min-width: 250px;
        max-width: 250px;
      }

      &.input-wrapper--text {
        flex: 0 0 400px;
        min-width: 400px;
        max-width: 400px;
      }

      &.input-wrapper--bool {
        flex: 0 0 auto;
        min-width: auto;
        max-width: none;
      }

      .checkbox-outer-container {
        display: flex;
        flex-direction: row;
        .checkbox-outer-container-extra {
          margin: 0;
        }
      }
    }

    .error-text {
      flex: 1 1 auto;
      font-size: 12px;
      white-space: nowrap;
      min-width: fit-content;
      margin-left: 10px;
    }
  }

  .json-field-row {
    margin-bottom: 10px;

    .responsive-field-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;

      .json-key-label {
        font-size: 14px;
        white-space: nowrap;
        margin: 0;
      }

      .error-text {
        margin-left: 0px;
      }
    }
  }
  .description {
    white-space: pre-line;
    font-size: 13px;
    margin-top: 5px;
    color: var(--input-label);
    max-width: 960px;

    :deep() {
      * {
        font-size: 13px;
      }

      p {
        margin: 0;
      }

      ul,
      ol {
        margin: 0;
      }
    }
  }

  .no-matches-message {
    padding: 10px;
    text-align: center;
  }
}
</style>
