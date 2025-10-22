use crate::error::*;
use crate::models::*;
use serde::de::DeserializeOwned;
use tauri::plugin::PluginHandle;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<ContactsImporter<R>> {
    Ok(ContactsImporter(app.clone()))
}

/// Access to the contacts-importer APIs.
pub struct ContactsImporter<R: Runtime>(AppHandle<R>);

impl<R: Runtime> ContactsImporter<R> {
    pub fn import_contacts(&self) -> crate::Result<ImportContactsResult> {
        Err(Error::NotOnDesktop)
    }

    pub fn check_permissions(&self) -> crate::Result<PermissionStatus> {
        Ok(PermissionStatus::default())
    }

    pub fn request_permissions(
        &self,
        permissions: Option<Vec<PermissionType>>,
    ) -> crate::Result<PermissionStatus> {
        Ok(PermissionStatus::default())
    }
}
