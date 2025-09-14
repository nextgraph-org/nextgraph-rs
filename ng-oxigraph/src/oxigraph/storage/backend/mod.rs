//! A storage backend
//! RocksDB is available, if not in memory

#[cfg(any(target_family = "wasm", docsrs))]
pub use fallback::{ColumnFamily, ColumnFamilyDefinition, Db, Iter, Reader, Transaction};
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
pub use oxi_rocksdb::{ColumnFamily, ColumnFamilyDefinition, Db, Iter, Reader, Transaction};

#[cfg(any(target_family = "wasm", docsrs))]
mod fallback;
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
mod oxi_rocksdb;
