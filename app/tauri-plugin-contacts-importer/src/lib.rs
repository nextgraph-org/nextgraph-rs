use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::ContactsImporter;
#[cfg(mobile)]
use mobile::ContactsImporter;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the contacts-importer APIs.
pub trait ContactsImporterExt<R: Runtime> {
  fn contacts_importer(&self) -> &ContactsImporter<R>;
}

impl<R: Runtime, T: Manager<R>> crate::ContactsImporterExt<R> for T {
  fn contacts_importer(&self) -> &ContactsImporter<R> {
    self.state::<ContactsImporter<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("contacts-importer")
    .invoke_handler(tauri::generate_handler![commands::import_contacts,  commands::check_permissions, commands::request_permissions])
    .setup(|app, api| {
      #[cfg(mobile)]
      let contacts_importer = mobile::init(app, api)?;
      #[cfg(desktop)]
      let contacts_importer = desktop::init(app, api)?;
      app.manage(contacts_importer);
      Ok(())
    })
    .build()
}