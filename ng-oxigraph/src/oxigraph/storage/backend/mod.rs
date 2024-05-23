//! A storage backend
//! RocksDB is available, if not in memory

#[cfg(any(target_family = "wasm", doc))]
pub use fallback::{ColumnFamily, ColumnFamilyDefinition, Db, Iter, Reader, Transaction};
#[cfg(all(not(target_family = "wasm")))]
pub use oxi_rocksdb::{ColumnFamily, ColumnFamilyDefinition, Db, Iter, Reader, Transaction};

#[cfg(any(target_family = "wasm", doc))]
mod fallback;
#[cfg(all(not(target_family = "wasm")))]
mod oxi_rocksdb;
