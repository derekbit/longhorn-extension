export function getBackupVolumeNameFromBackup(backup: any): string {
  return backup?.status?.volumeName || backup?.spec?.volumeName || backup?.metadata?.labels?.['backup-volume'] || '';
}

export function getBackupTargetNameFromBackup(backup: any): string {
  return (
    backup?.spec?.backupTargetName ||
    backup?.status?.backupTargetName ||
    backup?.metadata?.labels?.['backup-target'] ||
    ''
  );
}

export function getBackupUrl(backup: any): string {
  return backup?.status?.url || backup?.url || '';
}
