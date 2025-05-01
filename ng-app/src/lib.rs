
use rust_embed::{EmbeddedFile, RustEmbed};
use std::path::Path;


#[derive(RustEmbed)]
#[folder = "./dist-file/"]
#[include = "*.sha256"]
#[include = "*.gzip"]

pub struct AppWeb;

pub fn get_app_web_sha256() -> EmbeddedFile {
    AppWeb::get("index.sha256").unwrap()
}

// pub fn get_app_auth_sha256_bytes() -> &'static [u8] {
//     include_bytes!("../dist/index.sha256")
// }

pub fn get_app_web_gzip() -> EmbeddedFile {
    AppWeb::get("index.gzip").unwrap()
}

// pub fn get_app_auth_gzip_bytes() -> &'static [u8] {
//     include_bytes!("../dist/index.gzip")
// }