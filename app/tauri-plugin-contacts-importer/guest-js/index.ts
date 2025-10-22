import {invoke, checkPermissions as checkPluginPermissions} from '@tauri-apps/api/core'

export type PermissionState = 'granted' | 'denied' | 'prompt'

export type PermissionType = 'readContacts'

export type PermissionStatus = {
  readContacts: PermissionState
}

export type ImportContactsResult = {
  contacts: any[]
}

export async function importContacts(): Promise<ImportContactsResult> {
  return invoke('plugin:contacts-importer|import_contacts');
}

export async function checkPermissions(): Promise<PermissionStatus> {
  return await checkPluginPermissions('contacts-importer')
}

export async function requestPermissions(
  permissions: PermissionType[] | null
): Promise<PermissionStatus> {
  return await invoke('plugin:contacts-importer|request_permissions', {
    permissions
  })
}