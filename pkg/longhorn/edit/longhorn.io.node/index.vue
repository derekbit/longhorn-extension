<script>
import Loading from '@shell/components/Loading';
import CruResource from '@shell/components/CruResource';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import CreateEditView from '@shell/mixins/create-edit-view';
import FormValidation from '@shell/mixins/form-validation';
import { _EDIT, _VIEW } from '@shell/config/query-params';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { get } from '@shell/utils/object';
import { randomStr } from '@shell/utils/string';
import { CONDITION_STATUS, NODE_BADGE } from '@longhorn/types/node';

import Basics from './Basics';
import Disks from './Disks';

export default {
  name: 'EditNode',
  components: {
    Loading,
    CruResource,
    NameNsDescription,
    Tabbed,
    Tab,
    Basics,
    Disks,
  },
  mixins: [CreateEditView, FormValidation],

  props: {
    mode: {
      type: String,
      default: _EDIT,
    },
    value: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      _VIEW,
      fvFormRuleSets: [],
      fvReportedValidationPaths: [],
    };
  },

  computed: {
    validationSchema() {
      const disks = this.value.disks || [];

      return {
        basics: [
          {
            key: 'instanceManagerCPURequest',
            path: 'spec.instanceManagerCPURequest',
            rules: ['requiredInt', 'isInteger', 'isPositive'],
            translationKey: 'longhorn.node.form.instanceManagerCPURequest',
          },
        ],
        disks: disks.flatMap((disk) => [
          {
            key: disk.id,
            field: 'name',
            path: `spec.disks.${disk.id}.name`,
            rules: ['required', 'diskNameUnique'],
            translationKey: 'longhorn.node.form.name',
          },
          {
            key: disk.id,
            field: 'path',
            path: `spec.disks.${disk.id}.path`,
            rules: ['required'],
            translationKey: 'longhorn.node.form.diskPath',
          },
          {
            key: disk.id,
            field: 'storageReserved',
            path: `spec.disks.${disk.id}.storageReserved`,
            rules: ['requiredInt', 'isInteger', 'isPositive'],
            translationKey: 'longhorn.node.form.storageReserved',
          },
        ]),
      };
    },

    fvExtraRules() {
      return {
        diskNameUnique: (diskName) => {
          const disks = Object.values(this.value.spec?.disks || {});

          return disks.filter((disk) => disk.name === diskName).length > 1
            ? this.t('validation.duplicate', { key: this.t('longhorn.node.form.name') })
            : undefined;
        },
      };
    },

    tabErrors() {
      const hasError = (fields) =>
        fields.some((field) => {
          const fieldValue = get(this.value, field.path);
          const rules = this.fvGetPathRules(field.path) || [];

          return rules.some((rule) => typeof rule(fieldValue) === 'string');
        });

      return {
        basics: hasError(this.validationSchema.basics),
        disks: hasError(this.validationSchema.disks),
      };
    },

    isFormValid() {
      return !this.tabErrors.basics && !this.tabErrors.disks;
    },

    basicValidationRules() {
      return this.validationSchema.basics.reduce((acc, field) => {
        acc[field.key] = this.fvGetAndReportPathRules(field.path);

        return acc;
      }, {});
    },

    diskValidationRules() {
      return this.validationSchema.disks.reduce((acc, field) => {
        acc[field.key] = acc[field.key] || {};
        acc[field.key][field.field] = this.fvGetAndReportPathRules(field.path);

        return acc;
      }, {});
    },
    nodeConditions() {
      return this.mapConditions(this.value?.status?.conditions);
    },

    diskConditions() {
      return (this.value.disks || []).reduce((acc, disk) => {
        if (disk.id && disk.conditions) acc[disk.id] = this.mapConditions(disk.conditions);

        return acc;
      }, {});
    },
  },

  methods: {
    buildRuleSetConfig(fields) {
      return fields.map((field) => ({
        path: field.path,
        rules: field.rules,
        translationKey: field.translationKey,
      }));
    },

    normalizeDisks(disks) {
      let hasChanged = false;
      const normalizedDisks = { ...disks };

      Object.entries(normalizedDisks).forEach(([id, disk]) => {
        if (!Object.prototype.hasOwnProperty.call(disk, 'name') || disk.isNew === undefined) {
          normalizedDisks[id] = {
            ...disk,
            name: disk.name || id,
            isNew: disk.isNew ?? false,
          };
          hasChanged = true;
        }
      });

      return { hasChanged, normalizedDisks };
    },

    mapConditions(conditions = []) {
      return (Array.isArray(conditions) ? conditions : []).map((condition) => {
        const isError = condition.error || condition.status === CONDITION_STATUS.FALSE;
        const isSuccess = condition.status === CONDITION_STATUS.TRUE && !isError;

        return {
          key: condition.type,
          tooltip: condition.message,
          value: {
            stateBackground: isError
              ? NODE_BADGE.ERROR
              : condition.transitioning
                ? NODE_BADGE.WARNING
                : isSuccess
                  ? NODE_BADGE.SUCCESS
                  : NODE_BADGE.INFO,
            stateDisplay: condition.type,
          },
          icon: isError
            ? 'icon-error'
            : condition.transitioning
              ? 'icon-warning'
              : isSuccess
                ? 'icon-checkmark'
                : 'icon-info',
        };
      });
    },

    addDisk() {
      const id = `disk-${randomStr(6)}`;
      const newDisk = {
        id,
        name: id,
        isNew: true,
        path: '',
        storageReserved: 0,
        allowScheduling: false,
        evictionRequested: false,
        diskDriver: '',
        diskType: 'filesystem',
        tags: [],
      };

      this.value.spec.disks = {
        ...(this.value.spec.disks || {}),
        [id]: newDisk,
      };
    },

    removeDisk(id) {
      const diskId = typeof id === 'string' ? id : id?.id;
      const { [diskId]: _, ...remainingDisks } = this.value.spec?.disks || {};

      if (diskId) this.value.spec.disks = remainingDisks;
    },

    async save(buttonDone) {
      try {
        if (!this.isFormValid) {
          return buttonDone(false);
        }

        await this.actuallySave();
        buttonDone(true);
        this.done();
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
    },
  },

  watch: {
    validationSchema: {
      handler(newValidationSchema) {
        const allValidationFields = [...newValidationSchema.basics, ...newValidationSchema.disks];

        this.fvFormRuleSets = this.buildRuleSetConfig(allValidationFields);

        this.fvReportedValidationPaths = allValidationFields.map((field) => field.path);
      },
      immediate: true,
      deep: true,
    },

    'value.spec.disks': {
      handler(newDisks) {
        if (!newDisks) return;
        const { hasChanged, normalizedDisks } = this.normalizeDisks(newDisks);

        if (hasChanged) {
          this.value.spec = { ...this.value.spec, disks: normalizedDisks };
        }
      },
      immediate: true,
      deep: true,
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <CruResource
      :done-route="doneRoute"
      :mode="mode"
      :resource="value"
      :validation-passed="isFormValid"
      :errors="fvUnreportedValidationErrors"
      @finish="save"
      @cancel="done"
    >
      <NameNsDescription :value="value" :mode="mode" :namespaced="false" />

      <Tabbed side-tabs :resource="value">
        <Tab name="basics" label-key="longhorn.node.tab.basics" :error="tabErrors.basics">
          <Basics :mode="mode" :value="value" :conditions="nodeConditions" :rules="basicValidationRules" />
        </Tab>

        <Tab name="disk" label-key="longhorn.node.tab.disks" :error="tabErrors.disks">
          <Disks
            :mode="mode"
            :value="value"
            :conditions="diskConditions"
            :rules="diskValidationRules"
            @add="addDisk"
            @remove="removeDisk"
          />
        </Tab>
      </Tabbed>
    </CruResource>
  </div>
</template>
