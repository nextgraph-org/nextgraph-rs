#[cfg(not(target_arch = "wasm32"))]
pub mod block_storage;

#[cfg(not(target_arch = "wasm32"))]
pub mod kcv_storage;
