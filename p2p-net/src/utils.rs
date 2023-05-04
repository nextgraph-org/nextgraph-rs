use crate::log;
use async_std::task;
use futures::{channel::mpsc, select, Future, FutureExt, SinkExt};
pub use noise_protocol::U8Array;
use noise_protocol::DH;
pub use noise_rust_crypto::sensitive::Sensitive;

#[cfg(target_arch = "wasm32")]
pub fn spawn_and_log_error<F>(fut: F) -> task::JoinHandle<()>
where
    F: Future<Output = ResultSend<()>> + 'static,
{
    task::spawn_local(async move {
        if let Err(e) = fut.await {
            log!("EXCEPTION {}", e)
        }
    })
}
#[cfg(target_arch = "wasm32")]
pub type ResultSend<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[cfg(not(target_arch = "wasm32"))]
pub type ResultSend<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[cfg(not(target_arch = "wasm32"))]
pub fn spawn_and_log_error<F>(fut: F) -> task::JoinHandle<()>
where
    F: Future<Output = ResultSend<()>> + Send + 'static,
{
    task::spawn(async move {
        if let Err(e) = fut.await {
            eprintln!("{}", e)
        }
    })
}

pub type Sender<T> = mpsc::UnboundedSender<T>;
pub type Receiver<T> = mpsc::UnboundedReceiver<T>;

pub fn gen_keys() -> (Sensitive<[u8; 32]>, [u8; 32]) {
    let pri = noise_rust_crypto::X25519::genkey();
    let publ = noise_rust_crypto::X25519::pubkey(&pri);
    (pri, publ)
}
