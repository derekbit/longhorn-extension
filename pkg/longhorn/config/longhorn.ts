import { PRODUCT_NAME, LONGHORN_PAGES, LONGHORN_GROUP, LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import {
  ENGINE_IMAGES_HEADER,
  NODES_HEADER,
  RECURRING_JOBS_HEADER,
  BACKUP_TARGETS_HEADER,
  BACKUP_VOLUMES_HEADER,
  SYSTEM_BACKUPS_HEADER,
  SYSTEM_RESTORE_HEADER,
  VOLUMES_HEADER,
  INSTANCE_MANAGERS_HEADER,
  ORPHANS_HEADER,
  BACKING_IMAGES_HEADER,
  BACKING_IMAGE_BACKUPS_HEADER,
} from './table-headers';

// Navigation configuration - list items to control order and weight
const NAV_TOP_LEVEL = [
  { type: LONGHORN_PAGES.DASHBOARD, weight: 999 },
  { type: LONGHORN_RESOURCES.NODES, weight: 800 },
  { type: LONGHORN_RESOURCES.VOLUMES, weight: 700 },
  { type: LONGHORN_RESOURCES.RECURRING_JOBS, weight: 600 },
];

const NAV_BACKUP_AND_RESTORE = [
  { type: LONGHORN_RESOURCES.BACKUP_VOLUMES, weight: 450 },
  { type: LONGHORN_RESOURCES.BACKING_IMAGE_BACKUPS, weight: 400 },
  { type: LONGHORN_RESOURCES.BACKUP_TARGETS, weight: 350 },
  { type: LONGHORN_RESOURCES.SYSTEM_BACKUPS, weight: 300 },
  { type: LONGHORN_RESOURCES.SYSTEM_RESTORE, weight: 250 },
];

const NAV_ADVANCED = [
  { type: LONGHORN_RESOURCES.BACKING_IMAGES, weight: 400 },
  { type: LONGHORN_RESOURCES.ORPHANS, weight: 380 },
  { type: LONGHORN_RESOURCES.ENGINE_IMAGES, weight: 360 },
  { type: LONGHORN_RESOURCES.INSTANCE_MANAGERS, weight: 340 },
  { type: LONGHORN_RESOURCES.SETTINGS, weight: 320 },
];

export function init($plugin: any, store: any) {
  const { product, basicType, configureType, virtualType, mapType, headers, weightType, weightGroup } = $plugin.DSL(
    store,
    PRODUCT_NAME
  );

  // ----- Product Configuration ----- //
  product({
    ifHaveGroup: 'longhorn.io',
    removable: true,
    public: true,
    icon: 'longhorn',
    inStore: 'cluster',
    inExplorer: false,
    namespace: LONGHORN_NAMESPACE,
  });

  // ----- Pages ----- //
  // Dashboard
  virtualType({
    name: LONGHORN_PAGES.DASHBOARD,
    route: {
      name: `c-cluster-${PRODUCT_NAME}-dashboard`,
      params: { product: PRODUCT_NAME },
      meta: {
        pkg: PRODUCT_NAME,
        product: PRODUCT_NAME,
      },
    },
    exact: true,
  });

  // Nodes
  configureType(LONGHORN_RESOURCES.NODES, {
    isCreatable: false,
    isEditable: true,
    canYaml: false,
  });
  mapType(LONGHORN_RESOURCES.NODES, LONGHORN_PAGES.NODES);
  headers(LONGHORN_RESOURCES.NODES, NODES_HEADER);

  // Volumes
  configureType(LONGHORN_RESOURCES.VOLUMES, {
    isCreatable: true,
    isEditable: true,
  });
  mapType(LONGHORN_RESOURCES.VOLUMES, LONGHORN_PAGES.VOLUMES);
  headers(LONGHORN_RESOURCES.VOLUMES, VOLUMES_HEADER);

  // Recurring Jobs
  configureType(LONGHORN_RESOURCES.RECURRING_JOBS, {
    isCreatable: true,
    isEditable: true,
  });
  mapType(LONGHORN_RESOURCES.RECURRING_JOBS, LONGHORN_PAGES.RECURRING_JOBS);
  headers(LONGHORN_RESOURCES.RECURRING_JOBS, RECURRING_JOBS_HEADER);

  // Settings
  configureType(LONGHORN_RESOURCES.SETTINGS, {
    isCreatable: false,
    isEditable: true,
    canYaml: false,
    showListMasthead: false,
  });
  mapType(LONGHORN_RESOURCES.SETTINGS, LONGHORN_PAGES.SETTINGS);

  // ----- Backup and Restore group pages ----- //
  // Backup Targets
  configureType(LONGHORN_RESOURCES.BACKUP_TARGETS);
  mapType(LONGHORN_RESOURCES.BACKUP_TARGETS, LONGHORN_PAGES.BACKUP_TARGETS);
  headers(LONGHORN_RESOURCES.BACKUP_TARGETS, BACKUP_TARGETS_HEADER);

  // Backup Volumes
  configureType(LONGHORN_RESOURCES.BACKUP_VOLUMES, { isCreatable: false, isEditable: false });
  mapType(LONGHORN_RESOURCES.BACKUP_VOLUMES, LONGHORN_PAGES.BACKUP_VOLUMES);
  headers(LONGHORN_RESOURCES.BACKUP_VOLUMES, BACKUP_VOLUMES_HEADER);

  // Backing Image Backups
  configureType(LONGHORN_RESOURCES.BACKING_IMAGE_BACKUPS, { isCreatable: false, isEditable: false });
  mapType(LONGHORN_RESOURCES.BACKING_IMAGE_BACKUPS, LONGHORN_PAGES.BACKING_IMAGE_BACKUPS);
  headers(LONGHORN_RESOURCES.BACKING_IMAGE_BACKUPS, BACKING_IMAGE_BACKUPS_HEADER);

  // System Backups
  configureType(LONGHORN_RESOURCES.SYSTEM_BACKUPS, { canYaml: false });
  mapType(LONGHORN_RESOURCES.SYSTEM_BACKUPS, LONGHORN_PAGES.SYSTEM_BACKUPS);
  headers(LONGHORN_RESOURCES.SYSTEM_BACKUPS, SYSTEM_BACKUPS_HEADER);

  // System Restore
  configureType(LONGHORN_RESOURCES.SYSTEM_RESTORE, {
    isEditable: false,
    canYaml: false,
  });
  mapType(LONGHORN_RESOURCES.SYSTEM_RESTORE, LONGHORN_PAGES.SYSTEM_RESTORE);
  headers(LONGHORN_RESOURCES.SYSTEM_RESTORE, SYSTEM_RESTORE_HEADER);

  // ----- Advanced group pages ----- //
  // Backing Images
  configureType(LONGHORN_RESOURCES.BACKING_IMAGES);
  mapType(LONGHORN_RESOURCES.BACKING_IMAGES, LONGHORN_PAGES.BACKING_IMAGES);
  headers(LONGHORN_RESOURCES.BACKING_IMAGES, BACKING_IMAGES_HEADER);

  // Engine Images
  configureType(LONGHORN_RESOURCES.ENGINE_IMAGES, { isEditable: false });
  mapType(LONGHORN_RESOURCES.ENGINE_IMAGES, LONGHORN_PAGES.ENGINE_IMAGES);
  headers(LONGHORN_RESOURCES.ENGINE_IMAGES, ENGINE_IMAGES_HEADER);

  // Instance Managers
  configureType(LONGHORN_RESOURCES.INSTANCE_MANAGERS, {
    isEditable: false,
    isRemovable: false,
    canYaml: false,
  });
  mapType(LONGHORN_RESOURCES.INSTANCE_MANAGERS, LONGHORN_PAGES.INSTANCE_MANAGERS);
  headers(LONGHORN_RESOURCES.INSTANCE_MANAGERS, INSTANCE_MANAGERS_HEADER);

  // Orphans
  configureType(LONGHORN_RESOURCES.ORPHANS, {
    isCreatable: false,
    isEditable: false,
  });
  mapType(LONGHORN_RESOURCES.ORPHANS, LONGHORN_PAGES.ORPHANS);
  headers(LONGHORN_RESOURCES.ORPHANS, ORPHANS_HEADER);

  // ----- Sidebar configuration ----- //
  basicType(NAV_TOP_LEVEL.map((item) => item.type));
  basicType(
    NAV_BACKUP_AND_RESTORE.map((item) => item.type),
    LONGHORN_GROUP.BACKUP_AND_RESTORE
  );
  basicType(
    NAV_ADVANCED.map((item) => item.type),
    LONGHORN_GROUP.ADVANCED
  );

  // Apply weights
  NAV_TOP_LEVEL.forEach((item) => {
    weightType(item.type, item.weight, true);
  });

  weightGroup(LONGHORN_GROUP.BACKUP_AND_RESTORE, 500, true);
  NAV_BACKUP_AND_RESTORE.forEach((item) => {
    weightType(item.type, item.weight, true);
  });

  weightGroup(LONGHORN_GROUP.ADVANCED, 200, true);
  NAV_ADVANCED.forEach((item) => {
    weightType(item.type, item.weight, true);
  });
}
