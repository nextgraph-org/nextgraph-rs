use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::plugin::PermissionState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
pub struct ImportContactsResult {
    pub contacts: Vec<Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[serde(rename_all = "camelCase")]
pub struct PermissionStatus {
    pub read_contacts: PermissionState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "specta", derive(specta::Type))]
#[serde(rename_all = "camelCase")]
pub enum PermissionType {
    ReadContacts,
}
