
use rust_embed::{EmbeddedFile, RustEmbed};
use std::path::Path;


#[derive(RustEmbed)]
#[folder = "./dist/"]
#[include = "*.sha256"]
#[include = "*.gzip"]

pub struct AppAuth;

pub fn get_app_auth_sha256() -> EmbeddedFile {
    AppAuth::get("index.sha256").unwrap()
}

// pub fn get_app_auth_sha256_bytes() -> &'static [u8] {
//     include_bytes!("../dist/index.sha256")
// }

pub fn get_app_auth_gzip() -> EmbeddedFile {
    AppAuth::get("index.gzip").unwrap()
}

// pub fn get_app_auth_gzip_bytes() -> &'static [u8] {
//     include_bytes!("../dist/index.gzip")
// }