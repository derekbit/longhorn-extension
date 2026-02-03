import { PRODUCT_NAME, LONGHORN_PAGES, LONGHORN_GROUP, LONGHORN_NAMESPACE } from '@longhorn/types/longhorn';
import { LONGHORN_RESOURCES } from '@longhorn/types/resources';
import {
  ENGINE_IMAGES_HEADER,
  NODES_HEADER,
  RECURRING_JOBS_HEADER,
  BACKUP_TARGETS_HEADER,
  SYSTEM_BACKUPS_HEADER,
  SYSTEM_RESTORE_HEADER,
} from './table-headers';

export function init($plugin: any, store: any) {
  const { product, basicType, configureType, virtualType, mapType, headers, weightType } = $plugin.DSL(
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
  configureType(LONGHORN_RESOURCES.BACKUP_VOLUMES);
  mapType(LONGHORN_RESOURCES.BACKUP_VOLUMES, LONGHORN_PAGES.BACKUP_VOLUMES);

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

  // ----- Sidebar configuration ----- //
  basicType([
    LONGHORN_PAGES.DASHBOARD,
    LONGHORN_RESOURCES.NODES,
    LONGHORN_RESOURCES.RECURRING_JOBS,
    LONGHORN_RESOURCES.SETTINGS,
  ]);
  basicType(
    [
      // LONGHORN_RESOURCES.BACKUP_VOLUMES,
      LONGHORN_RESOURCES.BACKUP_TARGETS,
      LONGHORN_RESOURCES.SYSTEM_BACKUPS,
      LONGHORN_RESOURCES.SYSTEM_RESTORE,
    ],
    LONGHORN_GROUP.BACKUP_AND_RESTORE
  );
  basicType([LONGHORN_RESOURCES.ENGINE_IMAGES, LONGHORN_RESOURCES.INSTANCE_MANAGERS], LONGHORN_GROUP.ADVANCED);
  weightType(LONGHORN_PAGES.DASHBOARD, 999, true);
  weightType(LONGHORN_RESOURCES.NODES, 800, true);
  weightType(LONGHORN_RESOURCES.RECURRING_JOBS, 700, true);
  weightType(LONGHORN_RESOURCES.SETTINGS, 100, true);
}
