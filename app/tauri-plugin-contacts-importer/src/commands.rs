use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::ContactsImporterExt;
use crate::{PermissionStatus, PermissionType, Result};

#[command]
pub(crate) async fn import_contacts<R: Runtime>(app: AppHandle<R>) -> Result<ImportContactsResult> {
    app.contacts_importer().import_contacts()
}

#[command]
pub(crate) async fn check_permissions<R: Runtime>(app: AppHandle<R>) -> Result<PermissionStatus> {
    app.contacts_importer().check_permissions()
}

#[command]
pub(crate) async fn request_permissions<R: Runtime>(
    app: AppHandle<R>,
    permissions: Option<Vec<PermissionType>>,
) -> Result<PermissionStatus> {
    app.contacts_importer().request_permissions(permissions)
}
