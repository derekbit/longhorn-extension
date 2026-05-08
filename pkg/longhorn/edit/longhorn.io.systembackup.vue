<script>
import Loading from '@shell/components/Loading';
import CruResource from '@shell/components/CruResource';
import NameNsDescription from '@shell/components/form/NameNsDescription';
import Tabbed from '@shell/components/Tabbed';
import Tab from '@shell/components/Tabbed/Tab';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import CreateEditView from '@shell/mixins/create-edit-view';
import FormValidation from '@shell/mixins/form-validation';
import { _CREATE, _VIEW } from '@shell/config/query-params';
import { exceptionToErrorsArray } from '@shell/utils/error';
import { LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';

const VOLUME_BACKUP_POLICY_OPTIONS = (translate) => [
  { label: translate('longhorn.systemBackup.options.volumeBackupPolicy.ifNotPresent'), value: 'if-not-present' },
  { label: translate('longhorn.systemBackup.options.volumeBackupPolicy.always'), value: 'always' },
  { label: translate('longhorn.systemBackup.options.volumeBackupPolicy.disabled'), value: 'disabled' },
];

export default {
  name: 'EditSystemBackup',

  components: {
    Loading,
    CruResource,
    NameNsDescription,
    Tabbed,
    Tab,
    LabeledSelect,
  },

  mixins: [CreateEditView, FormValidation],

  props: {
    mode: {
      type: String,
      default: _CREATE,
    },
    value: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      LONGHORN_NAMESPACE,
      _VIEW,
      volumeBackupPolicyOptions: [],
      fvFormRuleSets: [
        {
          path: 'spec.volumeBackupPolicy',
          rules: ['required'],
        },
      ],
    };
  },

  created() {
    this.volumeBackupPolicyOptions = VOLUME_BACKUP_POLICY_OPTIONS(this.t);

    if (!this.value.spec) {
      this.value.spec = {};
    }

    if (!this.value.spec.volumeBackupPolicy) {
      this.value.spec.volumeBackupPolicy = 'if-not-present';
    }
  },

  methods: {
    onError(errors) {
      this.errors = Array.isArray(errors) ? errors : [errors];
    },

    async save(buttonDone) {
      this.errors = [];

      try {
        await this.actuallySave();
        buttonDone(true);
        this.done();
      } catch (err) {
        this.errors = exceptionToErrorsArray(err);
        buttonDone(false);
      }
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
      :validation-passed="fvFormIsValid"
      :errors="fvUnreportedValidationErrors"
      @finish="save"
      @cancel="done"
      @error="onError"
    >
      <NameNsDescription :value="value" :mode="mode" :force-namespace="LONGHORN_NAMESPACE" />

      <Tabbed side-tabs :resource="value">
        <Tab name="basics" :label="t('longhorn.systemBackup.tab.basics')">
          <div class="row mb-20">
            <div class="col span-6">
              <LabeledSelect
                v-model:value="value.spec.volumeBackupPolicy"
                :label="t('longhorn.systemBackup.fields.volumeBackupPolicy')"
                :options="volumeBackupPolicyOptions"
                :mode="mode"
                :rules="fvGetAndReportPathRules('spec.volumeBackupPolicy')"
                required
              />
            </div>
          </div>
        </Tab>
      </Tabbed>
    </CruResource>
  </div>
</template>
