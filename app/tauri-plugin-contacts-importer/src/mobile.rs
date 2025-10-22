use serde::{de::DeserializeOwned, Serialize};
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_contacts_importer);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<ContactsImporter<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("com.plugin.contactsImporter", "ImportContactsPlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_contacts_importer)?;
  Ok(ContactsImporter(handle))
}

/// Access to the contacts-importer APIs.
pub struct ContactsImporter<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> ContactsImporter<R> {
  pub fn import_contacts(&self) -> crate::Result<ImportContactsResult> {
    self
      .0
      .run_mobile_plugin("importContacts", ())
      .map_err(Into::into)
  }

    pub fn check_permissions(&self) -> crate::Result<PermissionStatus> {
        self.0
            .run_mobile_plugin("checkPermissions", ())
            .map_err(Into::into)
    }

    pub fn request_permissions(
        &self,
        permissions: Option<Vec<PermissionType>>,
    ) -> crate::Result<PermissionStatus> {
        self.0
            .run_mobile_plugin(
                "requestPermissions",
                serde_json::json!({ "permissions": permissions }),
            )
            .map_err(Into::into)
    }
}
