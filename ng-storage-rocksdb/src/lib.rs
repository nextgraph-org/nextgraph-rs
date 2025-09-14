#[cfg(all(not(target_arch = "wasm32"), not(docsrs)))]
pub mod block_storage;

#[cfg(all(not(target_arch = "wasm32"), not(docsrs)))]
pub mod kcv_storage;
