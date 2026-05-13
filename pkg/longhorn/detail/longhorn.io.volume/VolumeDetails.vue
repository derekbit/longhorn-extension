<script>
import LabelValue from '@shell/components/LabelValue';
import { BadgeState } from '@components/BadgeState';
import { formatSi } from '@shell/utils/units';
import { DATE_FORMAT, TIME_FORMAT } from '@shell/store/prefs';
import { escapeHtml } from '@shell/utils/string';
import { diffFrom } from '@shell/utils/time';
import {
  VOLUME_CONDITION_ORDER,
  VOLUME_CONDITION_TYPE,
  VOLUME_DEFAULT_SNAPSHOT_MAX_COUNT,
} from '@longhorn/types/volume';
import { BADGE_COLOR, EMPTY_DISPLAY } from '@longhorn/types/general';
import { parseVolumeDataSource, getFrontendDisplayMap } from '@longhorn/utils/volume';
import dayjs from 'dayjs';

const CONDITION_BADGE = {
  SUCCESS: BADGE_COLOR.SUCCESS,
  ERROR: BADGE_COLOR.ERROR,
  WARNING: BADGE_COLOR.WARNING,
  DISABLED: BADGE_COLOR.DISABLED,
};

const CONDITION_ICON = {
  CHECK: 'icon-checkmark',
  ERROR: 'icon-error',
  WARNING: 'icon-warning',
};

export default {
  name: 'VolumeDetails',

  components: {
    LabelValue,
    BadgeState,
  },

  props: {
    value: {
      type: Object,
      required: true,
    },
    allBackingImagesRaw: {
      type: Array,
      default: () => [],
    },
  },

  computed: {
    EMPTY_DISPLAY() {
      return EMPTY_DISPLAY;
    },
    isV2() {
      return this.value.spec?.dataEngine === 'v2';
    },
    readyStatus() {
      return this.value.readyStatus;
    },

    conditions() {
      const rawConditions = this.value?.status?.conditions || [];

      return VOLUME_CONDITION_ORDER.map((type) => {
        const condition = rawConditions.find((item) => item.type === type);

        if (!condition) return null;

        const statusLower = (condition.status || '').toLowerCase();
        const conditionDisplayMap = {
          [VOLUME_CONDITION_TYPE.RESTORE]: this.t('longhorn.volume.detail.condition.display.restore'),
          [VOLUME_CONDITION_TYPE.SCHEDULED]: this.t('longhorn.volume.detail.condition.display.scheduled'),
          [VOLUME_CONDITION_TYPE.TOO_MANY_SNAPSHOTS]: this.t(
            'longhorn.volume.detail.condition.display.tooManySnapshots'
          ),
          [VOLUME_CONDITION_TYPE.OFFLINE_REBUILDING]: this.t(
            'longhorn.volume.detail.condition.display.offlineRebuilding'
          ),
        };
        const stateDisplay = conditionDisplayMap[condition.type] || condition.type.replace(/([A-Z])/g, ' $1').trim();
        let stateBackground, icon, tooltipContent;

        const commonRows = [
          this.tooltipRow(this.t('longhorn.volume.detail.condition.label.name'), stateDisplay),
          this.tooltipRow(
            this.t('longhorn.volume.detail.condition.label.lastProbeTime'),
            this.getFullTimestamp(condition.lastProbeTime)
          ),
          this.tooltipRow(
            this.t('longhorn.volume.detail.condition.label.lastTransitionTime'),
            this.getFullTimestamp(condition.lastTransitionTime)
          ),
          this.tooltipRow(this.t('longhorn.volume.detail.condition.label.message'), condition.message),
          this.tooltipRow(this.t('longhorn.volume.detail.condition.label.reason'), condition.reason),
          this.tooltipRow(this.t('longhorn.volume.detail.condition.label.status'), condition.status),
        ].join('');

        if (type === VOLUME_CONDITION_TYPE.TOO_MANY_SNAPSHOTS) {
          const notExceeded = statusLower === 'false' || condition.reason === '';

          if (notExceeded) {
            stateBackground = CONDITION_BADGE.WARNING;
            icon = CONDITION_ICON.WARNING;
            const snapshotMaxCount = this.value.spec?.snapshotMaxCount;
            const thresholdMsg = snapshotMaxCount
              ? this.t('longhorn.volume.detail.condition.value.snapshotThresholdNotExceededWithCount', {
                  count: snapshotMaxCount,
                })
              : this.t('longhorn.volume.detail.condition.value.snapshotThresholdNotExceeded');

            tooltipContent = [
              this.tooltipRow(this.t('longhorn.volume.detail.condition.label.name'), stateDisplay),
              this.tooltipRow(
                this.t('longhorn.volume.detail.condition.label.lastTransitionTime'),
                this.getFullTimestamp(condition.lastTransitionTime)
              ),
              this.tooltipRow(this.t('longhorn.volume.detail.condition.label.status'), thresholdMsg),
            ].join('');
          } else {
            stateBackground = CONDITION_BADGE.ERROR;
            icon = CONDITION_ICON.ERROR;
            tooltipContent = [
              this.tooltipRow(this.t('longhorn.volume.detail.condition.label.name'), stateDisplay),
              this.tooltipRow(
                this.t('longhorn.volume.detail.condition.label.lastProbeTime'),
                this.getFullTimestamp(condition.lastProbeTime)
              ),
              this.tooltipRow(
                this.t('longhorn.volume.detail.condition.label.lastTransitionTime'),
                this.getFullTimestamp(condition.lastTransitionTime)
              ),
              this.tooltipRow(this.t('longhorn.volume.detail.condition.label.message'), condition.message),
              this.tooltipRow(this.t('longhorn.volume.detail.condition.label.reason'), condition.reason),
              this.tooltipRow(
                this.t('longhorn.volume.detail.condition.label.suggestion'),
                this.t('longhorn.volume.detail.condition.value.cleanupUnusedSnapshotsSuggestion')
              ),
              this.tooltipRow(this.t('longhorn.volume.detail.condition.label.status'), condition.status),
            ].join('');
          }
        } else if (type === VOLUME_CONDITION_TYPE.RESTORE || type === VOLUME_CONDITION_TYPE.OFFLINE_REBUILDING) {
          const isInactive = condition.reason === '' && statusLower === 'false';

          stateBackground = isInactive ? CONDITION_BADGE.DISABLED : CONDITION_BADGE.SUCCESS;
          icon = CONDITION_ICON.CHECK;
          tooltipContent = commonRows;
        } else if (type === VOLUME_CONDITION_TYPE.SCHEDULED) {
          const isScheduled = statusLower === 'true';

          stateBackground = isScheduled ? CONDITION_BADGE.SUCCESS : CONDITION_BADGE.ERROR;
          icon = isScheduled ? CONDITION_ICON.CHECK : CONDITION_ICON.ERROR;
          tooltipContent = commonRows;
        }

        return {
          key: condition.type,
          value: { stateBackground, stateDisplay },
          icon,
          tooltip: { content: tooltipContent, html: true },
        };
      }).filter(Boolean);
    },

    localSourceType() {
      const { sourceType } = parseVolumeDataSource(this.value.spec?.dataSource || '');

      return sourceType;
    },

    dataSourceDetails() {
      const { volume, snapshot } = parseVolumeDataSource(this.value.spec?.dataSource || '');

      return {
        volume: volume || EMPTY_DISPLAY,
        snapshot: snapshot || EMPTY_DISPLAY,
      };
    },

    snapshotMaxCountDisplay() {
      return this.value.spec.snapshotMaxCount || String(VOLUME_DEFAULT_SNAPSHOT_MAX_COUNT);
    },

    backingImageInfo() {
      const name = this.value.spec?.backingImage;
      const backingImage = this.allBackingImagesRaw.find(
        (backingImageResource) => (backingImageResource.name || backingImageResource.metadata?.name) === name
      );

      return {
        name: name || this.t('longhorn.volume.detail.value.none'),
        size: backingImage?.spec?.size ? this.formatBinary(backingImage.spec.size) : EMPTY_DISPLAY,
      };
    },

    accessModeDisplay() {
      const accessModeMap = {
        rwo: this.t('longhorn.volume.detail.value.readWriteOnce'),
        rwop: this.t('longhorn.volume.detail.value.readWriteOncePod'),
        rwx: this.t('longhorn.volume.detail.value.readWriteMany'),
      };

      return accessModeMap[(this.value.spec?.accessMode || '').toLowerCase()] || this.value.spec?.accessMode;
    },

    engine() {
      return this.value.currentEngine;
    },
    engineImage() {
      return this.engine?.status?.currentImage || this.value.status?.currentImage || EMPTY_DISPLAY;
    },
    nodeTags() {
      return (this.value.spec?.nodeSelector || []).join(', ') || EMPTY_DISPLAY;
    },
    diskTags() {
      return (this.value.spec?.diskSelector || []).join(', ') || EMPTY_DISPLAY;
    },
    k8sStatus() {
      return this.value.status?.kubernetesStatus || {};
    },
    formattedSize() {
      return this.formatBinary(this.value.spec?.size);
    },
    formattedActualSize() {
      return this.formatBinary(this.value?.status?.actualSize || 0);
    },

    frontendDisplay() {
      const frontendDisplayMap = getFrontendDisplayMap((key) => this.t(key));

      return (
        frontendDisplayMap[(this.value.spec?.frontend || '').toLowerCase()] ||
        this.value.spec?.frontend ||
        EMPTY_DISPLAY
      );
    },

    dataLocalityDisplay() {
      const dataLocalityMap = {
        disabled: this.t('longhorn.volume.detail.value.dataLocalityDisabled'),
        'best-effort': this.t('longhorn.volume.detail.value.dataLocalityBestEffort'),
        'strict-local': this.t('longhorn.volume.detail.value.dataLocalityStrictLocal'),
      };

      return dataLocalityMap[(this.value.spec?.dataLocality || '').toLowerCase()] || this.value.spec?.dataLocality;
    },

    frontendDisabledTooltip() {
      return this.t('longhorn.volume.detail.tooltip.frontendDisabled');
    },
  },

  methods: {
    tooltipRow(label, value) {
      if (!value) return '';

      return `<div style="margin-bottom:4px">${label}: ${value}</div>`;
    },
    getFullTimestamp(date) {
      if (!date) return '';
      const dateFormat = escapeHtml(this.$store.getters['prefs/get'](DATE_FORMAT));
      const timeFormat = escapeHtml(this.$store.getters['prefs/get'](TIME_FORMAT));

      return dayjs(date).format(`${dateFormat} ${timeFormat}`);
    },
    getLiveDateLabel(date) {
      if (!date) return EMPTY_DISPLAY;
      const diff = diffFrom(dayjs(date), dayjs());

      return `${diff.label} ${this.t(diff.unitsKey, { count: diff.label })} ${this.t('longhorn.volume.detail.value.ago')}`;
    },
    formatBinary(bytes) {
      if (!bytes || bytes === '0') return '0 Bi';

      return formatSi(bytes, {
        suffix: 'iB',
        firstSpread: 1024,
        increment: 1024,
      });
    },
    capitalize(value) {
      if (!value) return EMPTY_DISPLAY;

      return value === 'ignored'
        ? this.t('longhorn.volume.detail.value.ignoredGlobalSetting')
        : value.charAt(0).toUpperCase() + value.slice(1);
    },
    booleanLabel(value) {
      return value ? this.t('longhorn.volume.detail.value.true') : this.t('longhorn.volume.detail.value.false');
    },
  },
};
</script>

<template>
  <div class="volume-details">
    <div v-if="conditions.length" class="row mb-10">
      <div class="col span-12">
        <BadgeState
          v-for="conditionBadge in conditions"
          :key="conditionBadge.key"
          v-clean-tooltip="conditionBadge.tooltip"
          class="mr-10 mb-10"
          :value="conditionBadge.value"
          :icon="conditionBadge.icon"
        />
      </div>
    </div>

    <h3 class="mb-10">{{ t('longhorn.volume.detail.section.basic') }}</h3>
    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.size')">
          <template #name>
            <span
              >{{ t('longhorn.volume.detail.field.size') }}
              <i
                v-clean-tooltip="t('longhorn.volume.detail.tooltip.sizeDescription')"
                class="icon icon-info ml-5 text-muted"
            /></span>
          </template>
          <template #value
            ><span v-clean-tooltip="value.spec.size">{{ formattedSize }}</span></template
          >
        </LabelValue>
      </div>
      <div class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.numberOfReplicas')" :value="value.spec.numberOfReplicas" />
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.dataEngine')"
          :value="value.spec.dataEngine?.toUpperCase()"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.frontend')">
          <template #value>
            <span v-if="value.spec.disableFrontend">
              <span>{{ t('longhorn.volume.detail.value.disconnect') }}</span>
              <i v-clean-tooltip="frontendDisabledTooltip" class="icon icon-notify-info ml-5" />
            </span>
            <span v-else>{{ frontendDisplay }}</span>
          </template>
        </LabelValue>
      </div>
      <template v-if="value.spec.frontend === 'ublk'">
        <div class="col span-4">
          <LabelValue
            :name="t('longhorn.volume.detail.field.ublkNumberOfQueue')"
            :value="value.spec.ublkNumberOfQueue"
          />
        </div>
        <div class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.ublkQueueDepth')" :value="value.spec.ublkQueueDepth" />
        </div>
      </template>
      <div v-else class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.encrypted')" :value="booleanLabel(value.spec.encrypted)" />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.dataLocality')" :value="dataLocalityDisplay" />
      </div>
      <div class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.accessMode')" :value="accessModeDisplay" />
      </div>
      <div v-if="value.spec.frontend === 'ublk'" class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.encrypted')" :value="booleanLabel(value.spec.encrypted)" />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.dataSource')"
          :value="localSourceType ? capitalize(localSourceType) : t('longhorn.volume.detail.value.none')"
        />
      </div>
      <template v-if="localSourceType">
        <div class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.sourceVolume')" :value="dataSourceDetails.volume" />
        </div>
        <div v-if="localSourceType === 'snapshot'" class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.sourceSnapshot')" :value="dataSourceDetails.snapshot" />
        </div>
      </template>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.backingImage')" :value="backingImageInfo.name" />
      </div>
      <div v-if="value.spec.backingImage" class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.backingImageSize')" :value="backingImageInfo.size" />
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.backupTarget')"
          :value="value.spec.backupTargetName || t('longhorn.volume.detail.value.default')"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4"><LabelValue :name="t('longhorn.volume.detail.field.nodeTags')" :value="nodeTags" /></div>
      <div class="col span-4"><LabelValue :name="t('longhorn.volume.detail.field.diskTags')" :value="diskTags" /></div>
    </div>

    <div class="spacer" />

    <h3 class="mb-10">{{ t('longhorn.volume.detail.section.runtimeAndKubernetes') }}</h3>
    <div class="row mb-20">
      <div class="col span-6">
        <LabelValue :name="t('longhorn.volume.detail.field.readyForWorkload')">
          <template #value>
            <span v-if="readyStatus.ready" class="text-success">{{ t('longhorn.volume.detail.value.ready') }}</span>
            <span
              v-else
              v-clean-tooltip="
                `${t('longhorn.volume.detail.tooltip.notReadyPrefix')} ${
                  value.robustness === 'faulted'
                    ? t('longhorn.volume.detail.tooltip.volumeFaulted')
                    : t('longhorn.volume.detail.tooltip.volumeMaintenance')
                }`
              "
              class="text-error"
              >{{ t('longhorn.volume.detail.value.notReady') }} <i class="icon icon-error text-error ml-5"
            /></span>
          </template>
        </LabelValue>
      </div>
      <div class="col span-6">
        <LabelValue :name="t('longhorn.volume.detail.field.actualSize')">
          <template #name>
            <span
              >{{ t('longhorn.volume.detail.field.actualSize') }}
              <i
                v-clean-tooltip="t('longhorn.volume.detail.tooltip.actualSizeDescription')"
                class="icon icon-info text-muted ml-5"
            /></span>
          </template>
          <template #value
            ><span v-clean-tooltip="value?.status?.actualSize || 0">{{ formattedActualSize }}</span></template
          >
        </LabelValue>
      </div>
    </div>

    <div v-if="value.status.kubernetesStatus">
      <div class="row mb-20">
        <div v-if="k8sStatus.lastPVCRefAt" class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.lastTimeBoundWithPvc')"
            ><template #value>{{ getLiveDateLabel(k8sStatus.lastPVCRefAt) }}</template></LabelValue
          >
        </div>
        <div v-if="k8sStatus.lastPodRefAt" class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.lastTimeUsedByPod')"
            ><template #value>{{ getLiveDateLabel(k8sStatus.lastPodRefAt) }}</template></LabelValue
          >
        </div>
        <div class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.createdAt')">
            <template #value
              ><span v-clean-tooltip="getFullTimestamp(value.metadata.creationTimestamp)">{{
                getLiveDateLabel(value.metadata.creationTimestamp)
              }}</span></template
            >
          </LabelValue>
        </div>
      </div>

      <div class="row mb-20">
        <div class="col span-4">
          <LabelValue
            :name="
              (k8sStatus.lastPVCRefAt ? t('longhorn.volume.detail.value.lastPrefix') : '') +
              t('longhorn.volume.detail.field.namespace')
            "
            :value="k8sStatus.namespace || EMPTY_DISPLAY"
          />
        </div>
        <div class="col span-4">
          <LabelValue
            :name="
              (k8sStatus.lastPVCRefAt ? t('longhorn.volume.detail.value.lastBoundPrefix') : '') +
              t('longhorn.volume.detail.field.pvcName')
            "
            :value="k8sStatus.pvcName || EMPTY_DISPLAY"
          />
        </div>
        <div class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.pvName')" :value="k8sStatus.pvName || EMPTY_DISPLAY" />
        </div>
      </div>

      <div class="row mb-20">
        <div class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.pvStatus')" :value="k8sStatus.pvStatus || EMPTY_DISPLAY" />
        </div>
        <div class="col span-4">
          <LabelValue
            :name="t('longhorn.volume.detail.field.lastBackup')"
            :value="value.status.lastBackup || EMPTY_DISPLAY"
          />
        </div>
        <div class="col span-4">
          <LabelValue :name="t('longhorn.volume.detail.field.lastBackupAt')"
            ><template #value>{{
              value.status.lastBackupAt ? getLiveDateLabel(value.status.lastBackupAt) : EMPTY_DISPLAY
            }}</template></LabelValue
          >
        </div>
      </div>

      <div v-for="(workload, index) in k8sStatus.workloadsStatus" :key="index" class="mb-20">
        <div class="row">
          <div class="col span-4">
            <LabelValue
              :name="
                (k8sStatus.lastPodRefAt ? t('longhorn.volume.detail.value.lastPrefix') : '') +
                t('longhorn.volume.detail.field.podName')
              "
              :value="workload.podName || EMPTY_DISPLAY"
            />
          </div>
          <div class="col span-4">
            <LabelValue
              :name="
                (k8sStatus.lastPodRefAt ? t('longhorn.volume.detail.value.lastPrefix') : '') +
                t('longhorn.volume.detail.field.workloadName')
              "
              :value="workload.workloadName || EMPTY_DISPLAY"
            />
          </div>
          <div class="col span-4">
            <LabelValue
              :name="
                (k8sStatus.lastPodRefAt ? t('longhorn.volume.detail.value.lastPrefix') : '') +
                t('longhorn.volume.detail.field.workloadType')
              "
              :value="workload.workloadType || EMPTY_DISPLAY"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabelValue
          :name="t('longhorn.volume.detail.field.attachedNode')"
          :value="engine?.spec?.nodeID || EMPTY_DISPLAY"
        />
      </div>
      <div class="col span-6">
        <LabelValue :name="t('longhorn.volume.detail.field.endpoint')"
          ><template #value
            ><span v-if="engine?.status?.endpoint">{{ engine.status.endpoint }}</span
            ><span v-else>{{ EMPTY_DISPLAY }}</span></template
          ></LabelValue
        >
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabelValue :name="t('longhorn.volume.detail.field.instanceManager')">
          <template #name
            ><span
              >{{ t('longhorn.volume.detail.field.instanceManager') }}
              <i
                v-clean-tooltip="t('longhorn.volume.detail.tooltip.instanceManagerDescription')"
                class="icon icon-info text-muted ml-5" /></span
          ></template>
          <template #value>{{ engine?.status?.instanceManagerName || EMPTY_DISPLAY }}</template>
        </LabelValue>
      </div>
      <div class="col span-6">
        <LabelValue :name="t('longhorn.volume.detail.field.engineImage')">
          <template #name
            ><span
              >{{ t('longhorn.volume.detail.field.engineImage') }}
              <i
                v-clean-tooltip="t('longhorn.volume.detail.tooltip.engineImageDescription')"
                class="icon icon-info text-muted ml-5" /></span
          ></template>
          <template #value>{{ engineImage }}</template>
        </LabelValue>
      </div>
    </div>

    <div class="spacer" />

    <h3 class="mb-10">{{ t('longhorn.volume.detail.section.advanced') }}</h3>
    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.backupBlockSize')"
          :value="
            value.spec.backupBlockSize === '0'
              ? t('longhorn.volume.detail.value.ignored')
              : formatBinary(value.spec.backupBlockSize)
          "
        />
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.snapshotDataIntegrity')"
          :value="capitalize(value.spec.snapshotDataIntegrity)"
        />
      </div>
      <div class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.snapshotMaxCount')" :value="snapshotMaxCountDisplay" />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.snapshotMaxSize')"
          ><template #value>{{ formatBinary(value.spec.snapshotMaxSize) }}</template></LabelValue
        >
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.replicasAutoBalance')"
          :value="capitalize(value.spec.replicaAutoBalance)"
        />
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.snapshotRemovalDuringTrim')"
          :value="capitalize(value.spec.unmapMarkSnapChainRemoved)"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.replicaSoftAntiAffinity')"
          :value="capitalize(value.spec.replicaSoftAntiAffinity)"
        />
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.replicaZoneSoftAntiAffinity')"
          :value="capitalize(value.spec.replicaZoneSoftAntiAffinity)"
        />
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.replicaDiskSoftAntiAffinity')"
          :value="capitalize(value.spec.replicaDiskSoftAntiAffinity)"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.freezeFilesystemForSnapshot')"
          :value="capitalize(value.spec.freezeFilesystemForSnapshot)"
        />
      </div>
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.offlineReplicaRebuilding')"
          :value="capitalize(value.spec.offlineRebuilding)"
        />
      </div>
      <div v-if="isV2" class="col span-4">
        <LabelValue :name="t('longhorn.volume.detail.field.rebuildingBandwidthLimit')"
          ><template #value>{{ formatBinary(value.spec.replicaRebuildingBandwidthLimit) }}</template></LabelValue
        >
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-4">
        <LabelValue
          :name="t('longhorn.volume.detail.field.revisionCounterDisabled')"
          :value="booleanLabel(value.spec.revisionCounterDisabled)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
