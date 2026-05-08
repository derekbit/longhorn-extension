export const BACKING_IMAGE_SOURCE_TYPE = {
  DOWNLOAD: 'download',
  UPLOAD: 'upload',
  EXPORT_FROM_VOLUME: 'export-from-volume',
  CLONE: 'clone',
} as const;

export const BACKING_IMAGE_ENCRYPTION_TYPE = {
  ENCRYPT: 'encrypt',
  DECRYPT: 'decrypt',
  IGNORE: 'ignore',
} as const;

export const BACKING_IMAGE_EXPORT_TYPE = {
  RAW: 'raw',
  QCOW2: 'qcow2',
} as const;

export const BACKING_IMAGE_SOURCE_TYPE_OPTIONS = Object.freeze([
  { labelKey: 'longhorn.backingImage.options.sourceType.downloadFromURL', value: BACKING_IMAGE_SOURCE_TYPE.DOWNLOAD },
  { labelKey: 'longhorn.backingImage.options.sourceType.uploadFromLocal', value: BACKING_IMAGE_SOURCE_TYPE.UPLOAD },
  {
    labelKey: 'longhorn.backingImage.options.sourceType.exportFromLonghornVolume',
    value: BACKING_IMAGE_SOURCE_TYPE.EXPORT_FROM_VOLUME,
  },
  {
    labelKey: 'longhorn.backingImage.options.sourceType.cloneFromExistingBackingImage',
    value: BACKING_IMAGE_SOURCE_TYPE.CLONE,
  },
]);

export const BACKING_IMAGE_CREATE_SOURCE_TYPE_OPTIONS = Object.freeze(
  BACKING_IMAGE_SOURCE_TYPE_OPTIONS.filter((option) => option.value !== BACKING_IMAGE_SOURCE_TYPE.CLONE)
);

export const BACKING_IMAGE_EXPORT_TYPE_OPTIONS = Object.freeze([
  { labelKey: 'longhorn.backingImage.options.exportType.raw', value: BACKING_IMAGE_EXPORT_TYPE.RAW },
  { labelKey: 'longhorn.backingImage.options.exportType.qcow2', value: BACKING_IMAGE_EXPORT_TYPE.QCOW2 },
]);

export const BACKING_IMAGE_ENCRYPTION_TYPE_OPTIONS = Object.freeze([
  { labelKey: 'longhorn.backingImage.options.encryption.encrypt', value: BACKING_IMAGE_ENCRYPTION_TYPE.ENCRYPT },
  { labelKey: 'longhorn.backingImage.options.encryption.decrypt', value: BACKING_IMAGE_ENCRYPTION_TYPE.DECRYPT },
  { labelKey: 'longhorn.backingImage.options.encryption.ignore', value: BACKING_IMAGE_ENCRYPTION_TYPE.IGNORE },
]);
