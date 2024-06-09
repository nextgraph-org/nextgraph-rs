#![allow(clippy::same_name_method)]
use crate::oxigraph::model::Quad;
use crate::oxigraph::model::{GraphNameRef, NamedOrBlankNodeRef, QuadRef, TermRef};
use crate::oxigraph::storage::backend::{Reader, Transaction};
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
use crate::oxigraph::storage::binary_encoder::LATEST_STORAGE_VERSION;
use crate::oxigraph::storage::binary_encoder::{
    decode_term, encode_term, encode_term_pair, encode_term_quad, encode_term_triple,
    write_gosp_quad, write_gpos_quad, write_gspo_quad, write_osp_quad, write_ospg_quad,
    write_pos_quad, write_posg_quad, write_spo_quad, write_spog_quad, write_term, QuadEncoding,
    WRITTEN_TERM_MAX_SIZE,
};
pub use crate::oxigraph::storage::error::{
    CorruptionError, LoaderError, SerializerError, StorageError,
};
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
use crate::oxigraph::storage::numeric_encoder::Decoder;
use crate::oxigraph::storage::numeric_encoder::{
    insert_term, EncodedQuad, EncodedTerm, StrHash, StrLookup,
};
use crate::oxrdf::NamedNodeRef;
use backend::{ColumnFamily, ColumnFamilyDefinition, Db, Iter};
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
use std::collections::VecDeque;
use std::collections::{HashMap, HashSet};
use std::error::Error;
use std::io::Read;
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
use std::mem::{swap, take};
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
use std::path::{Path, PathBuf};
use std::sync::Arc;
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
use std::sync::Mutex;
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
use std::{io, thread};

mod backend;
mod binary_encoder;
mod error;
pub mod numeric_encoder;
pub mod small_string;

const ID2STR_CF: &str = "id2str";
const SPOG_CF: &str = "spog";
const POSG_CF: &str = "posg";
const OSPG_CF: &str = "ospg";
const GSPO_CF: &str = "gspo";
const GPOS_CF: &str = "gpos";
const GOSP_CF: &str = "gosp";
const DSPO_CF: &str = "dspo"; //TODO: remove all the DXXX as we don't use the default graph anymore
const DPOS_CF: &str = "dpos";
const DOSP_CF: &str = "dosp";
const HEADS_CF: &str = "heads";
const PAST_CF: &str = "past";
const REMOVED_CF: &str = "removed";
const BRANCHES_CF: &str = "branches";
const STORES_CF: &str = "stores";
const NAMES_CF: &str = "names";
//const GRAPHS_CF: &str = "graphs";
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
const DEFAULT_CF: &str = "default";
#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
const DEFAULT_BULK_LOAD_BATCH_SIZE: usize = 1_000_000;

/// Low level storage primitives
#[derive(Clone)]
pub struct Storage {
    db: Db,
    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    default_cf: ColumnFamily,
    id2str_cf: ColumnFamily,
    spog_cf: ColumnFamily,
    posg_cf: ColumnFamily,
    ospg_cf: ColumnFamily,
    gspo_cf: ColumnFamily,
    gpos_cf: ColumnFamily,
    gosp_cf: ColumnFamily,
    dspo_cf: ColumnFamily,
    dpos_cf: ColumnFamily,
    dosp_cf: ColumnFamily,
    //graphs_cf: ColumnFamily,
    heads_cf: ColumnFamily,
    past_cf: ColumnFamily,
    removed_cf: ColumnFamily,
    branches_cf: ColumnFamily,
    stores_cf: ColumnFamily,
    names_cf: ColumnFamily,
}

impl Storage {
    pub fn new() -> Result<Self, StorageError> {
        Self::setup(Db::new(Self::column_families())?)
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    pub fn open(path: &Path, key: Option<[u8; 32]>) -> Result<Self, StorageError> {
        Self::setup(Db::open_read_write(
            Some(path),
            Self::column_families(),
            key,
        )?)
    }

    // #[cfg(all(not(target_family = "wasm"),not(docsrs)))]
    // pub fn open_secondary(primary_path: &Path) -> Result<Self, StorageError> {
    //     Self::setup(Db::open_secondary(
    //         primary_path,
    //         None,
    //         Self::column_families(),
    //     )?)
    // }

    // #[cfg(all(not(target_family = "wasm"),not(docsrs)))]
    // pub fn open_persistent_secondary(
    //     primary_path: &Path,
    //     secondary_path: &Path,
    // ) -> Result<Self, StorageError> {
    //     Self::setup(Db::open_secondary(
    //         primary_path,
    //         Some(secondary_path),
    //         Self::column_families(),
    //     )?)
    // }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    pub fn open_read_only(path: &Path, key: Option<[u8; 32]>) -> Result<Self, StorageError> {
        Self::setup(Db::open_read_only(path, Self::column_families(), key)?)
    }

    fn column_families() -> Vec<ColumnFamilyDefinition> {
        vec![
            ColumnFamilyDefinition {
                name: ID2STR_CF,
                use_iter: false,
                min_prefix_size: 0,
                unordered_writes: true,
            },
            ColumnFamilyDefinition {
                name: SPOG_CF,
                use_iter: true,
                min_prefix_size: 17, // named or blank node start
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: POSG_CF,
                use_iter: true,
                min_prefix_size: 17, // named node start
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: OSPG_CF,
                use_iter: true,
                min_prefix_size: 0, // There are small literals...
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: GSPO_CF,
                use_iter: true,
                min_prefix_size: 17, // named or blank node start
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: GPOS_CF,
                use_iter: true,
                min_prefix_size: 17, // named or blank node start
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: GOSP_CF,
                use_iter: true,
                min_prefix_size: 17, // named or blank node start
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: DSPO_CF,
                use_iter: true,
                min_prefix_size: 17, // named or blank node start
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: DPOS_CF,
                use_iter: true,
                min_prefix_size: 17, // named or blank node start
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: DOSP_CF,
                use_iter: true,
                min_prefix_size: 0, // There are small literals...
                unordered_writes: false,
            },
            // ColumnFamilyDefinition {
            //     name: GRAPHS_CF,
            //     use_iter: true,
            //     min_prefix_size: 17, // named or blank node start
            //     unordered_writes: false,
            // },
            ColumnFamilyDefinition {
                name: HEADS_CF,
                use_iter: true,
                min_prefix_size: 32,
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: PAST_CF,
                use_iter: true,
                min_prefix_size: 16,
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: REMOVED_CF,
                use_iter: true,
                min_prefix_size: 17,
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: BRANCHES_CF,
                use_iter: false,
                min_prefix_size: 33,
                unordered_writes: true,
            },
            ColumnFamilyDefinition {
                name: STORES_CF,
                use_iter: true,
                min_prefix_size: 16,
                unordered_writes: false,
            },
            ColumnFamilyDefinition {
                name: NAMES_CF,
                use_iter: false,
                min_prefix_size: 16,
                unordered_writes: true,
            },
        ]
    }

    fn setup(db: Db) -> Result<Self, StorageError> {
        let this = Self {
            #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
            default_cf: db.column_family(DEFAULT_CF)?,
            id2str_cf: db.column_family(ID2STR_CF)?,
            spog_cf: db.column_family(SPOG_CF)?,
            posg_cf: db.column_family(POSG_CF)?,
            ospg_cf: db.column_family(OSPG_CF)?,
            gspo_cf: db.column_family(GSPO_CF)?,
            gpos_cf: db.column_family(GPOS_CF)?,
            gosp_cf: db.column_family(GOSP_CF)?,
            dspo_cf: db.column_family(DSPO_CF)?,
            dpos_cf: db.column_family(DPOS_CF)?,
            dosp_cf: db.column_family(DOSP_CF)?,
            //graphs_cf: db.column_family(GRAPHS_CF)?,
            heads_cf: db.column_family(HEADS_CF)?,
            past_cf: db.column_family(PAST_CF)?,
            removed_cf: db.column_family(REMOVED_CF)?,
            branches_cf: db.column_family(BRANCHES_CF)?,
            stores_cf: db.column_family(STORES_CF)?,
            names_cf: db.column_family(NAMES_CF)?,
            db,
        };
        #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
        this.migrate()?;
        Ok(this)
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    fn migrate(&self) -> Result<(), StorageError> {
        let mut version = self.ensure_version()?;
        // if version == 0 {
        //     // We migrate to v1
        //     let mut graph_names = HashSet::new();
        //     for quad in self.snapshot().quads() {
        //         let quad = quad?;
        //         if !quad.graph_name.is_default_graph() {
        //             graph_names.insert(quad.graph_name);
        //         }
        //     }
        //     let mut graph_names = graph_names
        //         .into_iter()
        //         .map(|g| encode_term(&g))
        //         .collect::<Vec<_>>();
        //     graph_names.sort_unstable();
        //     let mut stt_file = self.db.new_sst_file()?;
        //     for k in graph_names {
        //         stt_file.insert_empty(&k)?;
        //     }
        //     self.db
        //         .insert_stt_files(&[(&self.graphs_cf, stt_file.finish()?)])?;
        //     version = 1;
        //     self.update_version(version)?;
        // }

        match version {
            _ if version < LATEST_STORAGE_VERSION => Err(CorruptionError::msg(format!(
                "The RocksDB database is using the outdated encoding version {version}. Automated migration is not supported, please dump the store dataset using a compatible Oxigraph version and load it again using the current version"

            )).into()),
            LATEST_STORAGE_VERSION => Ok(()),
            _ => Err(CorruptionError::msg(format!(
                "The RocksDB database is using the too recent version {version}. Upgrade to the latest Oxigraph version to load this database"

            )).into())
        }
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    fn ensure_version(&self) -> Result<u64, StorageError> {
        Ok(
            if let Some(version) = self.db.get(&self.default_cf, b"oxversion")? {
                u64::from_be_bytes(version.as_ref().try_into().map_err(|e| {
                    CorruptionError::new(format!("Error while parsing the version key: {e}"))
                })?)
            } else {
                self.update_version(LATEST_STORAGE_VERSION)?;
                LATEST_STORAGE_VERSION
            },
        )
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    fn update_version(&self, version: u64) -> Result<(), StorageError> {
        self.db
            .insert(&self.default_cf, b"oxversion", &version.to_be_bytes())?;
        self.db.flush()
    }

    pub fn snapshot(&self) -> StorageReader {
        StorageReader {
            reader: self.db.snapshot(),
            storage: self.clone(),
        }
    }

    pub fn ng_transaction<'a, 'b: 'a, T, E: Error + 'static + From<StorageError>>(
        &'b self,
        f: impl Fn(StorageWriter<'a>) -> Result<T, E>,
    ) -> Result<T, E> {
        self.db.ng_transaction(|transaction| {
            f(StorageWriter {
                buffer: Vec::new(),
                transaction,
                storage: self,
            })
        })
    }

    pub fn transaction<'a, 'b: 'a, T, E: Error + 'static + From<StorageError>>(
        &'b self,
        f: impl Fn(CommitWriter<'a>) -> Result<T, E>,
    ) -> Result<T, E> {
        self.db.transaction(|transaction| {
            f(CommitWriter {
                inserts: HashSet::new(),
                removes: HashSet::new(),
                transaction,
                storage: self,
            })
        })
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    pub fn flush(&self) -> Result<(), StorageError> {
        self.db.flush()
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    pub fn compact(&self) -> Result<(), StorageError> {
        self.db.compact(&self.default_cf)?;
        self.db.compact(&self.gspo_cf)?;
        self.db.compact(&self.gpos_cf)?;
        self.db.compact(&self.gosp_cf)?;
        self.db.compact(&self.spog_cf)?;
        self.db.compact(&self.posg_cf)?;
        self.db.compact(&self.ospg_cf)?;
        self.db.compact(&self.dspo_cf)?;
        self.db.compact(&self.dpos_cf)?;
        self.db.compact(&self.dosp_cf)?;
        self.db.compact(&self.id2str_cf)
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    pub fn backup(&self, target_directory: &Path) -> Result<(), StorageError> {
        self.db.backup(target_directory)
    }
}

pub struct StorageReader {
    reader: Reader,
    storage: Storage,
}

// fn encode_one_hash(sh: &StrHash) -> &[u8] {
//     &sh.to_be_bytes()
// }

fn encode_two_hashes(sh1: &StrHash, sh2: &StrHash) -> Vec<u8> {
    let mut vec = Vec::with_capacity(32);
    vec.extend_from_slice(&sh1.to_be_bytes());
    vec.extend_from_slice(&sh2.to_be_bytes());
    vec
}

fn encode_three_hashes(sh1: &StrHash, sh2: &StrHash, sh3: &StrHash) -> Vec<u8> {
    let mut vec = Vec::with_capacity(48);
    vec.extend_from_slice(&sh1.to_be_bytes());
    vec.extend_from_slice(&sh2.to_be_bytes());
    vec.extend_from_slice(&sh3.to_be_bytes());
    vec
}

/*impl Iterator for DecodingGraphIterator {
    type Item = Result<EncodedTerm, StorageError>;

    fn next(&mut self) -> Option<Self::Item> {
        if let Err(e) = self.iter.status() {
            return Some(Err(e));
        }
        let term: Result<EncodedTerm, StorageError> = decode_term(self.iter.key()?);
        self.iter.next();
        Some(term)
    }
} */

impl StorageReader {
    pub fn ng_get_heads(
        &self,
        topic: &StrHash,
        overlay: &StrHash,
    ) -> Result<HashSet<StrHash>, StorageError> {
        let prefix = encode_two_hashes(topic, overlay);
        let mut iter = self.reader.scan_prefix(&self.storage.heads_cf, &prefix)?;
        let mut set: HashSet<StrHash> = HashSet::new();
        while let Some(key) = iter.key() {
            let mut buffer = [0; 16];
            (&key[32..48]).read_exact(&mut buffer)?;
            set.insert(StrHash::from_be_bytes(buffer));
            iter.next();
        }
        if let Err(e) = iter.status() {
            return Err(e);
        }
        Ok(set)
    }

    pub fn ng_get_removed(
        &self,
        subject: &EncodedTerm,
        predicate: &EncodedTerm,
        object: &EncodedTerm,
        commit: &StrHash,
    ) -> Result<HashSet<StrHash>, StorageError> {
        let mut prefix = Vec::with_capacity(3 * WRITTEN_TERM_MAX_SIZE + 16);
        write_term(&mut prefix, subject);
        write_term(&mut prefix, predicate);
        write_term(&mut prefix, object);
        prefix.extend_from_slice(&commit.to_be_bytes());

        let mut iter = self.reader.scan_prefix(&self.storage.removed_cf, &prefix)?;
        let mut set: HashSet<StrHash> = HashSet::new();
        let prefix_len = prefix.len();
        while let Some(key) = iter.key() {
            let mut buffer = [0; 16];
            (&key[prefix_len..prefix_len + 16]).read_exact(&mut buffer)?;
            set.insert(StrHash::from_be_bytes(buffer));
            iter.next();
        }
        if let Err(e) = iter.status() {
            return Err(e);
        }
        Ok(set)
    }

    fn ng_get_past(&self, commit: &StrHash) -> Result<Option<(Vec<StrHash>, bool)>, StorageError> {
        let mut res = Vec::with_capacity(1);
        let mut iter = self
            .reader
            .scan_prefix(&self.storage.past_cf, &commit.to_be_bytes())?;
        let mut skip = false;
        while let Some(key) = iter.key() {
            let mut buffer = [0; 16];
            (&key[16..32]).read_exact(&mut buffer)?;
            res.push(StrHash::from_be_bytes(buffer));
            if !skip && iter.value().unwrap()[0] == COMMIT_SKIP_NO_GRAPH {
                skip = true;
            }
            iter.next();
        }
        if let Err(e) = iter.status() {
            return Err(e);
        }
        if res.is_empty() {
            Ok(None)
        } else {
            Ok(Some((res, skip)))
        }
    }

    fn aggregate_causal_past(
        &self,
        aggregate: &mut HashMap<StrHash, bool>,
        current: StrHash,
        cache: &HashMap<StrHash, Arc<HashSet<StrHash>>>,
    ) -> Result<(), StorageError> {
        if aggregate.contains_key(&current) {
            return Ok(());
        }

        if let Some(found_in_cache) = cache.get(&current) {
            aggregate.extend(found_in_cache.iter().map(|c| (*c, false)));
        } else {
            if let Some((past, skip)) = self.ng_get_past(&current)? {
                aggregate.insert(current, skip);

                for next in past {
                    self.aggregate_causal_past(aggregate, next, cache)?;
                }
            } else {
                // we add the last one (that doesnt have past) as it must be the first commit in branch that hold content
                aggregate.insert(current, false);
            }
        }
        Ok(())
    }

    pub fn past_for_heads(
        &self,
        heads: &HashSet<StrHash>,
    ) -> Result<Arc<HashSet<StrHash>>, StorageError> {
        let mut res: HashSet<StrHash> = HashSet::new();
        let mut missing: Vec<&StrHash> = Vec::new();
        let mut ready: Vec<HashSet<StrHash>> = Vec::new();
        {
            let past_commits_cache = self.storage.db.past_commits_cache();
            let cache = past_commits_cache.read().unwrap();
            for head in heads {
                if let Some(past) = cache.get(head) {
                    if heads.len() == 1 {
                        return Ok(Arc::clone(past));
                    }
                    res.extend(past.iter());
                } else {
                    missing.push(head);
                }
            }

            for head in missing.iter() {
                let mut aggregate: HashMap<StrHash, bool> = HashMap::with_capacity(1);

                self.aggregate_causal_past(&mut aggregate, **head, &cache)?;

                ready.push(HashSet::from_iter(
                    aggregate
                        .into_iter()
                        .filter_map(|(c, skip)| (!skip).then_some(c)),
                ));
            }
        }

        let past_commits_cache = self.storage.db.past_commits_cache();
        let mut cache = past_commits_cache.write().unwrap();

        for (head, past) in missing.into_iter().zip(ready) {
            let past = cache.entry(*head).or_insert(Arc::new(past));
            if heads.len() == 1 {
                return Ok(Arc::clone(past));
            }
            res.extend(past.iter());
        }

        Ok(Arc::new(res))
    }

    pub fn len(&self) -> Result<usize, StorageError> {
        Ok(self.reader.len(&self.storage.gspo_cf)? + self.reader.len(&self.storage.dspo_cf)?)
    }

    pub fn is_empty(&self) -> Result<bool, StorageError> {
        Ok(self.reader.is_empty(&self.storage.gspo_cf)?
            && self.reader.is_empty(&self.storage.dspo_cf)?)
    }

    pub fn contains(&self, quad: &EncodedQuad) -> Result<bool, StorageError> {
        let mut buffer = Vec::with_capacity(4 * WRITTEN_TERM_MAX_SIZE);
        if quad.graph_name.is_default_graph() {
            write_spo_quad(&mut buffer, quad);
            Ok(self.reader.contains_key(&self.storage.dspo_cf, &buffer)?)
        } else {
            write_gspo_quad(&mut buffer, quad);
            Ok(self.reader.contains_key(&self.storage.gspo_cf, &buffer)?)
        }
    }

    pub fn quads_for_pattern(
        &self,
        subject: Option<&EncodedTerm>,
        predicate: Option<&EncodedTerm>,
        object: Option<&EncodedTerm>,
        graph_name: Option<&EncodedTerm>,
    ) -> ChainedDecodingQuadIterator {
        match subject {
            Some(subject) => match predicate {
                Some(predicate) => match object {
                    Some(object) => match graph_name {
                        Some(graph_name) => self.quads_for_subject_predicate_object_graph(
                            subject, predicate, object, graph_name,
                        ),
                        None => self.quads_for_subject_predicate_object(subject, predicate, object),
                    },
                    None => match graph_name {
                        Some(graph_name) => {
                            self.quads_for_subject_predicate_graph(subject, predicate, graph_name)
                        }
                        None => self.quads_for_subject_predicate(subject, predicate),
                    },
                },
                None => match object {
                    Some(object) => match graph_name {
                        Some(graph_name) => {
                            self.quads_for_subject_object_graph(subject, object, graph_name)
                        }
                        None => self.quads_for_subject_object(subject, object),
                    },
                    None => match graph_name {
                        Some(graph_name) => self.quads_for_subject_graph(subject, graph_name),
                        None => self.quads_for_subject(subject),
                    },
                },
            },
            None => match predicate {
                Some(predicate) => match object {
                    Some(object) => match graph_name {
                        Some(graph_name) => {
                            self.quads_for_predicate_object_graph(predicate, object, graph_name)
                        }
                        None => self.quads_for_predicate_object(predicate, object),
                    },
                    None => match graph_name {
                        Some(graph_name) => self.quads_for_predicate_graph(predicate, graph_name),
                        None => self.quads_for_predicate(predicate),
                    },
                },
                None => match object {
                    Some(object) => match graph_name {
                        Some(graph_name) => self.quads_for_object_graph(object, graph_name),
                        None => self.quads_for_object(object),
                    },
                    None => match graph_name {
                        Some(graph_name) => self.quads_for_graph(graph_name),
                        None => self.quads(),
                    },
                },
            },
        }
    }

    pub fn quads(&self) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::pair(self.dspo_quads(&[]), self.gspo_quads(&[]))
    }

    fn quads_in_named_graph(&self) -> DecodingQuadIterator {
        self.gspo_quads(&[])
    }

    fn quads_for_subject(&self, subject: &EncodedTerm) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::pair(
            self.dspo_quads(&encode_term(subject)),
            self.spog_quads(&encode_term(subject)),
        )
    }

    fn quads_for_subject_predicate(
        &self,
        subject: &EncodedTerm,
        predicate: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::pair(
            self.dspo_quads(&encode_term_pair(subject, predicate)),
            self.spog_quads(&encode_term_pair(subject, predicate)),
        )
    }

    fn quads_for_subject_predicate_object(
        &self,
        subject: &EncodedTerm,
        predicate: &EncodedTerm,
        object: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::pair(
            self.dspo_quads(&encode_term_triple(subject, predicate, object)),
            self.spog_quads(&encode_term_triple(subject, predicate, object)),
        )
    }

    fn quads_for_subject_object(
        &self,
        subject: &EncodedTerm,
        object: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::pair(
            self.dosp_quads(&encode_term_pair(object, subject)),
            self.ospg_quads(&encode_term_pair(object, subject)),
        )
    }

    fn quads_for_predicate(&self, predicate: &EncodedTerm) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::pair(
            self.dpos_quads(&encode_term(predicate)),
            self.posg_quads(&encode_term(predicate)),
        )
    }

    fn quads_for_predicate_object(
        &self,
        predicate: &EncodedTerm,
        object: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::pair(
            self.dpos_quads(&encode_term_pair(predicate, object)),
            self.posg_quads(&encode_term_pair(predicate, object)),
        )
    }

    fn quads_for_object(&self, object: &EncodedTerm) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::pair(
            self.dosp_quads(&encode_term(object)),
            self.ospg_quads(&encode_term(object)),
        )
    }

    fn quads_for_graph(&self, graph_name: &EncodedTerm) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::new(if graph_name.is_default_graph() {
            self.dspo_quads(&Vec::default())
        } else {
            self.gspo_quads(&encode_term(graph_name))
        })
    }

    fn quads_for_subject_graph(
        &self,
        subject: &EncodedTerm,
        graph_name: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::new(if graph_name.is_default_graph() {
            self.dspo_quads(&encode_term(subject))
        } else {
            self.gspo_quads(&encode_term_pair(graph_name, subject))
        })
    }

    fn quads_for_subject_predicate_graph(
        &self,
        subject: &EncodedTerm,
        predicate: &EncodedTerm,
        graph_name: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::new(if graph_name.is_default_graph() {
            self.dspo_quads(&encode_term_pair(subject, predicate))
        } else {
            self.gspo_quads(&encode_term_triple(graph_name, subject, predicate))
        })
    }

    fn quads_for_subject_predicate_object_graph(
        &self,
        subject: &EncodedTerm,
        predicate: &EncodedTerm,
        object: &EncodedTerm,
        graph_name: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::new(if graph_name.is_default_graph() {
            self.dspo_quads(&encode_term_triple(subject, predicate, object))
        } else {
            self.gspo_quads(&encode_term_quad(graph_name, subject, predicate, object))
        })
    }

    pub fn quads_for_subject_predicate_object_heads(
        &self,
        subject: &EncodedTerm,
        predicate: &EncodedTerm,
        object: &EncodedTerm,
        heads: &HashSet<StrHash>,
        at_current_heads: bool,
    ) -> Result<HashSet<StrHash>, StorageError> {
        let past = self.past_for_heads(heads)?;

        let iter = self.ng_spog_quads(&encode_term_triple(subject, predicate, object));

        Ok(HashSet::from_iter(iter.filter_map(|q| match q {
            Err(_) => None,
            Ok((quad, value)) => {
                if let EncodedTerm::NamedNode { iri_id } = quad.graph_name {
                    if past.contains(&iri_id) {
                        if is_added(value) {
                            return Some(iri_id);
                        } else if is_removed(value) && !at_current_heads {
                            let removed_in = self
                                .ng_get_removed(subject, predicate, object, &iri_id)
                                .ok()?;
                            if removed_in.is_disjoint(&past) {
                                return Some(iri_id);
                            }
                        }
                    }
                }
                None
            }
        })))
    }

    fn quads_for_subject_object_graph(
        &self,
        subject: &EncodedTerm,
        object: &EncodedTerm,
        graph_name: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::new(if graph_name.is_default_graph() {
            self.dosp_quads(&encode_term_pair(object, subject))
        } else {
            self.gosp_quads(&encode_term_triple(graph_name, object, subject))
        })
    }

    fn quads_for_predicate_graph(
        &self,
        predicate: &EncodedTerm,
        graph_name: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::new(if graph_name.is_default_graph() {
            self.dpos_quads(&encode_term(predicate))
        } else {
            self.gpos_quads(&encode_term_pair(graph_name, predicate))
        })
    }

    fn quads_for_predicate_object_graph(
        &self,
        predicate: &EncodedTerm,
        object: &EncodedTerm,
        graph_name: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::new(if graph_name.is_default_graph() {
            self.dpos_quads(&encode_term_pair(predicate, object))
        } else {
            self.gpos_quads(&encode_term_triple(graph_name, predicate, object))
        })
    }

    fn quads_for_object_graph(
        &self,
        object: &EncodedTerm,
        graph_name: &EncodedTerm,
    ) -> ChainedDecodingQuadIterator {
        ChainedDecodingQuadIterator::new(if graph_name.is_default_graph() {
            self.dosp_quads(&encode_term(object))
        } else {
            self.gosp_quads(&encode_term_pair(graph_name, object))
        })
    }

    // pub fn named_graphs(&self) -> DecodingGraphIterator {
    //     DecodingGraphIterator {
    //         iter: self.reader.iter(&self.storage.graphs_cf).unwrap(), // TODO: propagate error?
    //     }
    // }

    // pub fn contains_named_graph(&self, graph_name: &EncodedTerm) -> Result<bool, StorageError> {
    //     self.reader
    //         .contains_key(&self.storage.graphs_cf, &encode_term(graph_name))
    // }

    fn ng_spog_quads(&self, prefix: &[u8]) -> DecodingNgQuadIterator {
        self.ng_inner_quads(&self.storage.spog_cf, prefix, QuadEncoding::Spog)
    }

    fn ng_posg_quads(&self, prefix: &[u8]) -> DecodingNgQuadIterator {
        self.ng_inner_quads(&self.storage.posg_cf, prefix, QuadEncoding::Posg)
    }

    fn ng_ospg_quads(&self, prefix: &[u8]) -> DecodingNgQuadIterator {
        self.ng_inner_quads(&self.storage.ospg_cf, prefix, QuadEncoding::Ospg)
    }

    fn ng_gspo_quads(&self, prefix: &[u8]) -> DecodingNgQuadIterator {
        self.ng_inner_quads(&self.storage.gspo_cf, prefix, QuadEncoding::Gspo)
    }

    fn ng_gpos_quads(&self, prefix: &[u8]) -> DecodingNgQuadIterator {
        self.ng_inner_quads(&self.storage.gpos_cf, prefix, QuadEncoding::Gpos)
    }

    fn ng_gosp_quads(&self, prefix: &[u8]) -> DecodingNgQuadIterator {
        self.ng_inner_quads(&self.storage.gosp_cf, prefix, QuadEncoding::Gosp)
    }

    fn ng_inner_quads(
        &self,
        column_family: &ColumnFamily,
        prefix: &[u8],
        encoding: QuadEncoding,
    ) -> DecodingNgQuadIterator {
        DecodingNgQuadIterator {
            iter: self.reader.scan_prefix(column_family, prefix).unwrap(), // TODO: propagate error?
            encoding,
        }
    }

    fn spog_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.spog_cf, prefix, QuadEncoding::Spog)
    }

    fn posg_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.posg_cf, prefix, QuadEncoding::Posg)
    }

    fn ospg_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.ospg_cf, prefix, QuadEncoding::Ospg)
    }

    fn gspo_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.gspo_cf, prefix, QuadEncoding::Gspo)
    }

    fn gpos_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.gpos_cf, prefix, QuadEncoding::Gpos)
    }

    fn gosp_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.gosp_cf, prefix, QuadEncoding::Gosp)
    }

    fn dspo_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.dspo_cf, prefix, QuadEncoding::Dspo)
    }

    fn dpos_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.dpos_cf, prefix, QuadEncoding::Dpos)
    }

    fn dosp_quads(&self, prefix: &[u8]) -> DecodingQuadIterator {
        self.inner_quads(&self.storage.dosp_cf, prefix, QuadEncoding::Dosp)
    }

    fn inner_quads(
        &self,
        column_family: &ColumnFamily,
        prefix: &[u8],
        encoding: QuadEncoding,
    ) -> DecodingQuadIterator {
        DecodingQuadIterator {
            iter: self.reader.scan_prefix(column_family, prefix).unwrap(), // TODO: propagate error?
            encoding,
        }
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    pub fn get_str(&self, key: &StrHash) -> Result<Option<String>, StorageError> {
        Ok(self
            .storage
            .db
            .get(&self.storage.id2str_cf, &key.to_be_bytes())?
            .map(|v| String::from_utf8(v.into()))
            .transpose()
            .map_err(CorruptionError::new)?)
    }

    #[cfg(any(target_family = "wasm", docsrs))]
    pub fn get_str(&self, key: &StrHash) -> Result<Option<String>, StorageError> {
        Ok(self
            .reader
            .get(&self.storage.id2str_cf, &key.to_be_bytes())?
            .map(String::from_utf8)
            .transpose()
            .map_err(CorruptionError::new)?)
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    pub fn contains_str(&self, key: &StrHash) -> Result<bool, StorageError> {
        self.storage
            .db
            .contains_key(&self.storage.id2str_cf, &key.to_be_bytes())
    }

    #[cfg(any(target_family = "wasm", docsrs))]
    pub fn contains_str(&self, key: &StrHash) -> Result<bool, StorageError> {
        self.reader
            .contains_key(&self.storage.id2str_cf, &key.to_be_bytes())
    }

    /// Validates that all the storage invariants held in the data
    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    pub fn validate(&self) -> Result<(), StorageError> {
        // triples
        let dspo_size = self.dspo_quads(&[]).count();
        if dspo_size != self.dpos_quads(&[]).count() || dspo_size != self.dosp_quads(&[]).count() {
            return Err(CorruptionError::new(
                "Not the same number of triples in dspo, dpos and dosp",
            )
            .into());
        }
        for spo in self.dspo_quads(&[]) {
            let spo = spo?;
            self.decode_quad(&spo)?; // We ensure that the quad is readable
            if !self.storage.db.contains_key(
                &self.storage.dpos_cf,
                &encode_term_triple(&spo.predicate, &spo.object, &spo.subject),
            )? {
                return Err(CorruptionError::new("Quad in dspo and not in dpos").into());
            }
            if !self.storage.db.contains_key(
                &self.storage.dosp_cf,
                &encode_term_triple(&spo.object, &spo.subject, &spo.predicate),
            )? {
                return Err(CorruptionError::new("Quad in dspo and not in dpos").into());
            }
        }

        // quads
        let gspo_size = self.gspo_quads(&[]).count();
        if gspo_size != self.gpos_quads(&[]).count()
            || gspo_size != self.gosp_quads(&[]).count()
            || gspo_size != self.spog_quads(&[]).count()
            || gspo_size != self.posg_quads(&[]).count()
            || gspo_size != self.ospg_quads(&[]).count()
        {
            return Err(CorruptionError::new(
                "Not the same number of quads in gspo, gpos, gosp, spog, posg, and ospg",
            )
            .into());
        }
        for gspo in self.gspo_quads(&[]) {
            let gspo = gspo?;
            self.decode_quad(&gspo)?; // We ensure that the quad is readable
            if !self.storage.db.contains_key(
                &self.storage.gpos_cf,
                &encode_term_quad(
                    &gspo.graph_name,
                    &gspo.predicate,
                    &gspo.object,
                    &gspo.subject,
                ),
            )? {
                return Err(CorruptionError::new("Quad in gspo and not in gpos").into());
            }
            if !self.storage.db.contains_key(
                &self.storage.gosp_cf,
                &encode_term_quad(
                    &gspo.graph_name,
                    &gspo.object,
                    &gspo.subject,
                    &gspo.predicate,
                ),
            )? {
                return Err(CorruptionError::new("Quad in gspo and not in gosp").into());
            }
            if !self.storage.db.contains_key(
                &self.storage.spog_cf,
                &encode_term_quad(
                    &gspo.subject,
                    &gspo.predicate,
                    &gspo.object,
                    &gspo.graph_name,
                ),
            )? {
                return Err(CorruptionError::new("Quad in gspo and not in spog").into());
            }
            if !self.storage.db.contains_key(
                &self.storage.posg_cf,
                &encode_term_quad(
                    &gspo.predicate,
                    &gspo.object,
                    &gspo.subject,
                    &gspo.graph_name,
                ),
            )? {
                return Err(CorruptionError::new("Quad in gspo and not in posg").into());
            }
            if !self.storage.db.contains_key(
                &self.storage.ospg_cf,
                &encode_term_quad(
                    &gspo.object,
                    &gspo.subject,
                    &gspo.predicate,
                    &gspo.graph_name,
                ),
            )? {
                return Err(CorruptionError::new("Quad in gspo and not in ospg").into());
            }
            // if !self
            //     .storage
            //     .db
            //     .contains_key(&self.storage.graphs_cf, &encode_term(&gspo.graph_name))?
            // {
            //     return Err(
            //         CorruptionError::new("Quad graph name in gspo and not in graphs").into(),
            //     );
            // }
        }
        Ok(())
    }

    /// Validates that all the storage invariants held in the data
    #[cfg(any(target_family = "wasm", docsrs))]
    #[allow(clippy::unused_self, clippy::unnecessary_wraps)]
    pub fn validate(&self) -> Result<(), StorageError> {
        Ok(()) // TODO
    }
}

pub struct ChainedDecodingQuadIterator {
    first: DecodingQuadIterator,
    second: Option<DecodingQuadIterator>,
}

impl ChainedDecodingQuadIterator {
    fn new(first: DecodingQuadIterator) -> Self {
        Self {
            first,
            second: None,
        }
    }

    fn pair(first: DecodingQuadIterator, second: DecodingQuadIterator) -> Self {
        Self {
            first,
            second: Some(second),
        }
    }
}

impl Iterator for ChainedDecodingQuadIterator {
    type Item = Result<EncodedQuad, StorageError>;

    fn next(&mut self) -> Option<Self::Item> {
        if let Some(result) = self.first.next() {
            Some(result)
        } else if let Some(second) = self.second.as_mut() {
            second.next()
        } else {
            None
        }
    }
}

pub struct DecodingQuadIterator {
    iter: Iter,
    encoding: QuadEncoding,
}

impl Iterator for DecodingQuadIterator {
    type Item = Result<EncodedQuad, StorageError>;

    fn next(&mut self) -> Option<Self::Item> {
        if let Err(e) = self.iter.status() {
            return Some(Err(e));
        }
        let term = self.encoding.decode(self.iter.key()?);
        self.iter.next();
        Some(term)
    }
}

pub struct DecodingNgQuadIterator {
    iter: Iter,
    encoding: QuadEncoding,
}

impl Iterator for DecodingNgQuadIterator {
    type Item = Result<(EncodedQuad, u8), StorageError>;

    fn next(&mut self) -> Option<Self::Item> {
        if let Err(e) = self.iter.status() {
            return Some(Err(e));
        }
        let term = self.encoding.decode(self.iter.key()?);
        match term {
            Ok(term) => {
                let val = self.iter.value()?[0];
                self.iter.next();
                Some(Ok((term, val)))
            }
            Err(e) => {
                self.iter.next();
                Some(Err(e))
            }
        }
    }
}

pub struct DecodingGraphIterator {
    iter: Iter,
}

impl Iterator for DecodingGraphIterator {
    type Item = Result<EncodedTerm, StorageError>;

    fn next(&mut self) -> Option<Self::Item> {
        if let Err(e) = self.iter.status() {
            return Some(Err(e));
        }
        let term: Result<EncodedTerm, StorageError> = decode_term(self.iter.key()?);
        self.iter.next();
        Some(term)
    }
}

impl StrLookup for StorageReader {
    fn get_str(&self, key: &StrHash) -> Result<Option<String>, StorageError> {
        self.get_str(key)
    }
}

pub struct CommitWriter<'a> {
    inserts: HashSet<Quad>,
    removes: HashSet<Quad>,
    transaction: Transaction<'a>,
    storage: &'a Storage,
}

impl<'a> CommitWriter<'a> {
    pub fn reader(&self) -> StorageReader {
        StorageReader {
            reader: self.transaction.reader(),
            storage: self.storage.clone(),
        }
    }

    pub fn get_update(self) -> (HashSet<Quad>, HashSet<Quad>) {
        (self.inserts, self.removes)
    }

    pub fn insert(&mut self, quad: QuadRef<'_>) -> Result<bool, StorageError> {
        if quad.graph_name.is_default_graph() {
            Err(StorageError::Other(
                "NextGraph cannot insert triples in default graph".into(),
            ))
        } else {
            let quad = quad.into_owned();
            Ok(self.inserts.insert(quad))
        }
    }

    pub fn insert_named_graph(
        &mut self,
        _graph_name: NamedOrBlankNodeRef<'_>,
    ) -> Result<bool, StorageError> {
        Err(StorageError::Other(
            "NextGraph cannot insert named graph".into(),
        ))
    }

    pub fn remove(&mut self, quad: QuadRef<'_>) -> Result<bool, StorageError> {
        if quad.graph_name.is_default_graph() {
            Err(StorageError::Other(
                "NextGraph cannot remove triples in default graph".into(),
            ))
        } else {
            let quad = quad.into_owned();
            Ok(self.removes.insert(quad))
        }
    }

    pub fn clear_graph(&mut self, graph_name: GraphNameRef<'_>) -> Result<(), StorageError> {
        if graph_name.is_default_graph() {
            Err(StorageError::Other(
                "NextGraph cannot clear the default graph".into(),
            ))
        } else {
            unimplemented!();
        }
    }

    pub fn clear_all_named_graphs(&mut self) -> Result<(), StorageError> {
        unimplemented!();
    }

    pub fn clear_all_graphs(&mut self) -> Result<(), StorageError> {
        unimplemented!();
    }

    pub fn remove_named_graph(
        &mut self,
        _graph_name: NamedOrBlankNodeRef<'_>,
    ) -> Result<bool, StorageError> {
        unimplemented!();
    }

    pub fn remove_all_named_graphs(&mut self) -> Result<(), StorageError> {
        unimplemented!();
    }

    pub fn clear(&mut self) -> Result<(), StorageError> {
        unimplemented!();
    }
}

pub struct StorageWriter<'a> {
    buffer: Vec<u8>,
    transaction: Transaction<'a>,
    storage: &'a Storage,
}

pub const ADDED_IN_MAIN: u8 = 3;
pub const ADDED_IN_OTHER: u8 = 2;
pub const REMOVED_IN_MAIN: u8 = 1;
pub const REMOVED_IN_OTHER: u8 = 0;
pub const REPO_IN_MAIN: u8 = 4;
pub const COMMIT_SKIP_NO_GRAPH: u8 = 1;
pub const COMMIT_HAS_GRAPH: u8 = 0;

const MASK_ADDED: u8 = 2;
const MASK_REMOVED: u8 = 6;

pub const BRANCH_PREFIX: u8 = 0;
const TOKEN_PREFIX: u8 = 1;

pub const COMMIT_PREFIX: u8 = 1;

#[inline]
fn is_added(val: u8) -> bool {
    (val & MASK_ADDED) == 1
}

#[inline]
fn is_removed(val: u8) -> bool {
    (val & MASK_REMOVED) == 0
}

#[inline]
fn is_added_in_main(val: u8) -> bool {
    val == ADDED_IN_MAIN
}

impl<'a> StorageWriter<'a> {
    pub fn reader(&self) -> StorageReader {
        StorageReader {
            reader: self.transaction.reader(),
            storage: self.storage.clone(),
        }
    }

    pub fn named_commit_or_branch(
        &mut self,
        ov_graph_name: NamedNodeRef<'_>,
        name: &String,
        // if None: remove
        value: &Option<Vec<u8>>,
    ) -> Result<(), StorageError> {
        let encoded: EncodedTerm = ov_graph_name.into();
        if value.is_some() {
            self.insert_term(ov_graph_name.into(), &encoded)?;
        }
        if let EncodedTerm::NamedNode { iri_id } = encoded {
            let mut key = Vec::with_capacity(16 + name.len());
            key.extend_from_slice(&iri_id.to_be_bytes());
            key.extend_from_slice(name.as_bytes());
            if value.is_none() {
                self.transaction.remove(&self.storage.names_cf, &key)?;
            } else {
                self.transaction
                    .insert(&self.storage.names_cf, &key, value.as_ref().unwrap())?;
            }
        } else {
            panic!("should be an EncodedTerm::NamedNode");
        }
        Ok(())
    }

    pub fn doc_in_store(
        &mut self,
        graph_name: NamedNodeRef<'_>,
        overlay: &StrHash,
        remove: bool,
    ) -> Result<(), StorageError> {
        let encoded: EncodedTerm = graph_name.into();
        if !remove {
            self.insert_term(graph_name.into(), &encoded)?;
        } else {
            // TODO: remove term? self.insert_term(graph_name.into(), &encoded)?;
        }
        if let EncodedTerm::NamedNode { iri_id } = encoded {
            let mut key = Vec::with_capacity(32);
            key.extend_from_slice(&overlay.to_be_bytes());
            key.extend_from_slice(&iri_id.to_be_bytes());
            if remove {
                self.transaction.remove(&self.storage.stores_cf, &key)?;
            } else {
                self.transaction
                    .insert_empty(&self.storage.stores_cf, &key)?;
            }
        } else {
            panic!("should be an EncodedTerm::NamedNode");
        }
        Ok(())
    }

    pub fn update_branch_and_token(
        &mut self,
        overlay_encoded: &StrHash,
        branch_encoded: &StrHash,
        topic_encoded: &StrHash,
        token_encoded: &StrHash,
    ) -> Result<(), StorageError> {
        let mut key = Vec::with_capacity(33);
        key.push(BRANCH_PREFIX);
        key.extend_from_slice(&branch_encoded.to_be_bytes());
        key.extend_from_slice(&overlay_encoded.to_be_bytes());

        let topic = topic_encoded.to_be_bytes();

        let reader = self.transaction.reader();
        if match reader.get(&self.storage.branches_cf, &key)? {
            Some(val) => val.to_vec() != topic.to_vec(),
            None => true,
        } {
            self.transaction
                .insert(&self.storage.branches_cf, &key, &topic)?;
        }

        key.clear();
        key.push(TOKEN_PREFIX);
        key.extend_from_slice(&token_encoded.to_be_bytes());
        key.extend_from_slice(&overlay_encoded.to_be_bytes());

        let mut token = Vec::with_capacity(32);
        token.extend_from_slice(&topic_encoded.to_be_bytes());
        token.extend_from_slice(&branch_encoded.to_be_bytes());

        if match reader.get(&self.storage.branches_cf, &key)? {
            Some(val) => val.to_vec() != token,
            None => true,
        } {
            self.transaction
                .insert(&self.storage.branches_cf, &key, &token)?;
        }
        Ok(())
    }

    pub fn ng_update_heads(
        &mut self,
        topic: &StrHash,
        overlay: &StrHash,
        commit: &StrHash,
        direct_causal_past: &HashSet<StrHash>,
    ) -> Result<(), StorageError> {
        let mut buffer = Vec::with_capacity(48);
        buffer.extend_from_slice(&topic.to_be_bytes());
        buffer.extend_from_slice(&overlay.to_be_bytes());

        for removing in direct_causal_past {
            buffer.truncate(32);
            buffer.extend_from_slice(&removing.to_be_bytes());
            self.transaction.remove(&self.storage.heads_cf, &buffer)?
        }

        buffer.truncate(32);
        buffer.extend_from_slice(&commit.to_be_bytes());
        self.transaction
            .insert_empty(&self.storage.heads_cf, &buffer)?;

        Ok(())
    }

    pub fn ng_update_past(
        &mut self,
        commit: &StrHash,
        direct_causal_past: &HashSet<StrHash>,
        skip_has_no_graph: bool,
    ) -> Result<(), StorageError> {
        let mut buffer = Vec::with_capacity(32);
        buffer.extend_from_slice(&commit.to_be_bytes());

        let value = [if skip_has_no_graph {
            COMMIT_SKIP_NO_GRAPH
        } else {
            COMMIT_HAS_GRAPH
        }];

        for adding in direct_causal_past {
            buffer.truncate(16);
            buffer.extend_from_slice(&adding.to_be_bytes());
            self.transaction
                .insert(&self.storage.past_cf, &buffer, &value)?
        }

        Ok(())
    }

    pub fn ng_remove(&mut self, quad: &EncodedQuad, commit: &StrHash) -> Result<(), StorageError> {
        let mut key = Vec::with_capacity(3 * WRITTEN_TERM_MAX_SIZE + 2 * 16);
        write_term(&mut key, &quad.subject);
        write_term(&mut key, &quad.predicate);
        write_term(&mut key, &quad.object);
        if let EncodedTerm::NamedNode { iri_id } = quad.graph_name {
            key.extend_from_slice(&iri_id.to_be_bytes());
            key.extend_from_slice(&commit.to_be_bytes());
            self.transaction
                .insert_empty(&self.storage.removed_cf, &key)
        } else {
            Err(CorruptionError::msg("invalid quad").into())
        }
    }

    pub fn ng_insert(&mut self, quad: QuadRef<'_>, value: u8) -> Result<(), StorageError> {
        let encoded = quad.into();
        if self.ng_insert_encoded(&encoded, value)? {
            self.insert_term(quad.subject.into(), &encoded.subject)?;
            self.insert_term(quad.predicate.into(), &encoded.predicate)?;
            self.insert_term(quad.object, &encoded.object)?;

            // self.buffer.clear();
            // write_term(&mut self.buffer, &encoded.graph_name);
            // if !self
            //     .transaction
            //     .contains_key_for_update(&self.storage.graphs_cf, &self.buffer)?
            // {
            //     self.transaction
            //         .insert_empty(&self.storage.graphs_cf, &self.buffer)?;
            self.insert_graph_name(quad.graph_name, &encoded.graph_name)?;
            //}
        }
        Ok(())
    }

    pub fn ng_insert_encoded(
        &mut self,
        encoded: &EncodedQuad,
        value: u8,
    ) -> Result<bool, StorageError> {
        let value = [value];
        self.buffer.clear();
        write_spog_quad(&mut self.buffer, encoded);
        let result = if self
            .transaction
            .contains_key_for_update(&self.storage.spog_cf, &self.buffer)?
        {
            false
        } else {
            self.transaction
                .insert(&self.storage.spog_cf, &self.buffer, &value)?;

            self.buffer.clear();
            write_posg_quad(&mut self.buffer, encoded);
            self.transaction
                .insert(&self.storage.posg_cf, &self.buffer, &value)?;

            self.buffer.clear();
            write_ospg_quad(&mut self.buffer, encoded);
            self.transaction
                .insert(&self.storage.ospg_cf, &self.buffer, &value)?;

            self.buffer.clear();
            write_gspo_quad(&mut self.buffer, encoded);
            self.transaction
                .insert(&self.storage.gspo_cf, &self.buffer, &value)?;

            self.buffer.clear();
            write_gpos_quad(&mut self.buffer, encoded);
            self.transaction
                .insert(&self.storage.gpos_cf, &self.buffer, &value)?;

            self.buffer.clear();
            write_gosp_quad(&mut self.buffer, encoded);
            self.transaction
                .insert(&self.storage.gosp_cf, &self.buffer, &value)?;

            true
        };
        Ok(result)
    }

    // pub fn insert(&mut self, quad: QuadRef<'_>) -> Result<bool, StorageError> {
    //     let encoded = quad.into();
    //     self.buffer.clear();
    //     let result = if quad.graph_name.is_default_graph() {
    //         write_spo_quad(&mut self.buffer, &encoded);
    //         if self
    //             .transaction
    //             .contains_key_for_update(&self.storage.dspo_cf, &self.buffer)?
    //         {
    //             false
    //         } else {
    //             self.transaction
    //                 .insert_empty(&self.storage.dspo_cf, &self.buffer)?;

    //             self.buffer.clear();
    //             write_pos_quad(&mut self.buffer, &encoded);
    //             self.transaction
    //                 .insert_empty(&self.storage.dpos_cf, &self.buffer)?;

    //             self.buffer.clear();
    //             write_osp_quad(&mut self.buffer, &encoded);
    //             self.transaction
    //                 .insert_empty(&self.storage.dosp_cf, &self.buffer)?;

    //             self.insert_term(quad.subject.into(), &encoded.subject)?;
    //             self.insert_term(quad.predicate.into(), &encoded.predicate)?;
    //             self.insert_term(quad.object, &encoded.object)?;
    //             true
    //         }
    //     } else {
    //         write_spog_quad(&mut self.buffer, &encoded);
    //         if self
    //             .transaction
    //             .contains_key_for_update(&self.storage.spog_cf, &self.buffer)?
    //         {
    //             false
    //         } else {
    //             self.transaction
    //                 .insert_empty(&self.storage.spog_cf, &self.buffer)?;

    //             self.buffer.clear();
    //             write_posg_quad(&mut self.buffer, &encoded);
    //             self.transaction
    //                 .insert_empty(&self.storage.posg_cf, &self.buffer)?;

    //             self.buffer.clear();
    //             write_ospg_quad(&mut self.buffer, &encoded);
    //             self.transaction
    //                 .insert_empty(&self.storage.ospg_cf, &self.buffer)?;

    //             self.buffer.clear();
    //             write_gspo_quad(&mut self.buffer, &encoded);
    //             self.transaction
    //                 .insert_empty(&self.storage.gspo_cf, &self.buffer)?;

    //             self.buffer.clear();
    //             write_gpos_quad(&mut self.buffer, &encoded);
    //             self.transaction
    //                 .insert_empty(&self.storage.gpos_cf, &self.buffer)?;

    //             self.buffer.clear();
    //             write_gosp_quad(&mut self.buffer, &encoded);
    //             self.transaction
    //                 .insert_empty(&self.storage.gosp_cf, &self.buffer)?;

    //             self.insert_term(quad.subject.into(), &encoded.subject)?;
    //             self.insert_term(quad.predicate.into(), &encoded.predicate)?;
    //             self.insert_term(quad.object, &encoded.object)?;

    //             self.buffer.clear();
    //             write_term(&mut self.buffer, &encoded.graph_name);
    //             if !self
    //                 .transaction
    //                 .contains_key_for_update(&self.storage.graphs_cf, &self.buffer)?
    //             {
    //                 self.transaction
    //                     .insert_empty(&self.storage.graphs_cf, &self.buffer)?;
    //                 self.insert_graph_name(quad.graph_name, &encoded.graph_name)?;
    //             }
    //             true
    //         }
    //     };
    //     Ok(result)
    // }

    pub fn insert_named_graph(
        &mut self,
        graph_name: NamedOrBlankNodeRef<'_>,
    ) -> Result<bool, StorageError> {
        unimplemented!();
        // let encoded_graph_name = graph_name.into();

        // self.buffer.clear();
        // write_term(&mut self.buffer, &encoded_graph_name);
        // let result = if self
        //     .transaction
        //     .contains_key_for_update(&self.storage.graphs_cf, &self.buffer)?
        // {
        //     false
        // } else {
        //     self.transaction
        //         .insert_empty(&self.storage.graphs_cf, &self.buffer)?;
        //     self.insert_term(graph_name.into(), &encoded_graph_name)?;
        //     true
        // };
        // Ok(result)
    }

    fn insert_term(
        &mut self,
        term: TermRef<'_>,
        encoded: &EncodedTerm,
    ) -> Result<(), StorageError> {
        insert_term(term, encoded, &mut |key, value| self.insert_str(key, value))
    }

    fn insert_graph_name(
        &mut self,
        graph_name: GraphNameRef<'_>,
        encoded: &EncodedTerm,
    ) -> Result<(), StorageError> {
        match graph_name {
            GraphNameRef::NamedNode(graph_name) => self.insert_term(graph_name.into(), encoded),
            GraphNameRef::BlankNode(graph_name) => self.insert_term(graph_name.into(), encoded),
            GraphNameRef::DefaultGraph => Ok(()),
        }
    }

    #[cfg(all(not(target_family = "wasm"), not(docsrs)))]
    fn insert_str(&mut self, key: &StrHash, value: &str) -> Result<(), StorageError> {
        if self
            .storage
            .db
            .contains_key(&self.storage.id2str_cf, &key.to_be_bytes())?
        {
            return Ok(());
        }
        self.storage.db.insert(
            &self.storage.id2str_cf,
            &key.to_be_bytes(),
            value.as_bytes(),
        )
    }

    #[cfg(any(target_family = "wasm", docsrs))]
    fn insert_str(&mut self, key: &StrHash, value: &str) -> Result<(), StorageError> {
        self.transaction.insert(
            &self.storage.id2str_cf,
            &key.to_be_bytes(),
            value.as_bytes(),
        )
    }

    pub fn remove(&mut self, quad: QuadRef<'_>) -> Result<bool, StorageError> {
        self.remove_encoded(&quad.into())
    }

    fn remove_encoded(&mut self, quad: &EncodedQuad) -> Result<bool, StorageError> {
        self.buffer.clear();
        let result = if quad.graph_name.is_default_graph() {
            write_spo_quad(&mut self.buffer, quad);

            if self
                .transaction
                .contains_key_for_update(&self.storage.dspo_cf, &self.buffer)?
            {
                self.transaction
                    .remove(&self.storage.dspo_cf, &self.buffer)?;

                self.buffer.clear();
                write_pos_quad(&mut self.buffer, quad);
                self.transaction
                    .remove(&self.storage.dpos_cf, &self.buffer)?;

                self.buffer.clear();
                write_osp_quad(&mut self.buffer, quad);
                self.transaction
                    .remove(&self.storage.dosp_cf, &self.buffer)?;
                true
            } else {
                false
            }
        } else {
            write_spog_quad(&mut self.buffer, quad);

            if self
                .transaction
                .contains_key_for_update(&self.storage.spog_cf, &self.buffer)?
            {
                self.transaction
                    .remove(&self.storage.spog_cf, &self.buffer)?;

                self.buffer.clear();
                write_posg_quad(&mut self.buffer, quad);
                self.transaction
                    .remove(&self.storage.posg_cf, &self.buffer)?;

                self.buffer.clear();
                write_ospg_quad(&mut self.buffer, quad);
                self.transaction
                    .remove(&self.storage.ospg_cf, &self.buffer)?;

                self.buffer.clear();
                write_gspo_quad(&mut self.buffer, quad);
                self.transaction
                    .remove(&self.storage.gspo_cf, &self.buffer)?;

                self.buffer.clear();
                write_gpos_quad(&mut self.buffer, quad);
                self.transaction
                    .remove(&self.storage.gpos_cf, &self.buffer)?;

                self.buffer.clear();
                write_gosp_quad(&mut self.buffer, quad);
                self.transaction
                    .remove(&self.storage.gosp_cf, &self.buffer)?;
                true
            } else {
                false
            }
        };
        Ok(result)
    }

    pub fn clear_graph(&mut self, graph_name: GraphNameRef<'_>) -> Result<(), StorageError> {
        unimplemented!();
        // if graph_name.is_default_graph() {
        //     for quad in self.reader().quads_for_graph(&EncodedTerm::DefaultGraph) {
        //         self.remove_encoded(&quad?)?;
        //     }
        // } else {
        //     self.buffer.clear();
        //     write_term(&mut self.buffer, &graph_name.into());
        //     if self
        //         .transaction
        //         .contains_key_for_update(&self.storage.graphs_cf, &self.buffer)?
        //     {
        //         // The condition is useful to lock the graph itself and ensure no quad is inserted at the same time
        //         for quad in self.reader().quads_for_graph(&graph_name.into()) {
        //             self.remove_encoded(&quad?)?;
        //         }
        //     }
        // }
        // Ok(())
    }

    pub fn clear_all_named_graphs(&mut self) -> Result<(), StorageError> {
        for quad in self.reader().quads_in_named_graph() {
            self.remove_encoded(&quad?)?;
        }
        Ok(())
    }

    pub fn clear_all_graphs(&mut self) -> Result<(), StorageError> {
        for quad in self.reader().quads() {
            self.remove_encoded(&quad?)?;
        }
        Ok(())
    }

    pub fn remove_named_graph(
        &mut self,
        graph_name: NamedOrBlankNodeRef<'_>,
    ) -> Result<bool, StorageError> {
        self.remove_encoded_named_graph(&graph_name.into())
    }

    fn remove_encoded_named_graph(
        &mut self,
        graph_name: &EncodedTerm,
    ) -> Result<bool, StorageError> {
        unimplemented!();
        // self.buffer.clear();
        // write_term(&mut self.buffer, graph_name);
        // let result = if self
        //     .transaction
        //     .contains_key_for_update(&self.storage.graphs_cf, &self.buffer)?
        // {
        //     // The condition is done ASAP to lock the graph itself
        //     for quad in self.reader().quads_for_graph(graph_name) {
        //         self.remove_encoded(&quad?)?;
        //     }
        //     self.buffer.clear();
        //     write_term(&mut self.buffer, graph_name);
        //     self.transaction
        //         .remove(&self.storage.graphs_cf, &self.buffer)?;
        //     true
        // } else {
        //     false
        // };
        // Ok(result)
    }

    pub fn remove_all_named_graphs(&mut self) -> Result<(), StorageError> {
        unimplemented!();
        // for graph_name in self.reader().named_graphs() {
        //     self.remove_encoded_named_graph(&graph_name?)?;
        // }
        // Ok(())
    }

    pub fn clear(&mut self) -> Result<(), StorageError> {
        // for graph_name in self.reader().named_graphs() {
        //     self.remove_encoded_named_graph(&graph_name?)?;
        // }
        for quad in self.reader().quads() {
            self.remove_encoded(&quad?)?;
        }
        Ok(())
    }
}

#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
#[must_use]
pub struct StorageBulkLoader {
    storage: Storage,
    hooks: Vec<Box<dyn Fn(u64)>>,
    num_threads: Option<usize>,
    max_memory_size: Option<usize>,
}

#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
impl StorageBulkLoader {
    pub fn new(storage: Storage) -> Self {
        Self {
            storage,
            hooks: Vec::new(),
            num_threads: None,
            max_memory_size: None,
        }
    }

    pub fn with_num_threads(mut self, num_threads: usize) -> Self {
        self.num_threads = Some(num_threads);
        self
    }

    pub fn with_max_memory_size_in_megabytes(mut self, max_memory_size: usize) -> Self {
        self.max_memory_size = Some(max_memory_size);
        self
    }

    pub fn on_progress(mut self, callback: impl Fn(u64) + 'static) -> Self {
        self.hooks.push(Box::new(callback));
        self
    }

    #[allow(clippy::trait_duplication_in_bounds)]
    pub fn load<EI, EO: From<StorageError> + From<EI>>(
        &self,
        quads: impl IntoIterator<Item = Result<Quad, EI>>,
    ) -> Result<(), EO> {
        let num_threads = self.num_threads.unwrap_or(2);
        if num_threads < 2 {
            return Err(
                StorageError::Other("The bulk loader needs at least 2 threads".into()).into(),
            );
        }
        let batch_size = if let Some(max_memory_size) = self.max_memory_size {
            max_memory_size * 1000 / num_threads
        } else {
            DEFAULT_BULK_LOAD_BATCH_SIZE
        };
        if batch_size < 10_000 {
            return Err(StorageError::Other(
                "The bulk loader memory bound is too low. It needs at least 100MB".into(),
            )
            .into());
        }
        let done_counter = Mutex::new(0);
        let mut done_and_displayed_counter = 0;
        thread::scope(|thread_scope| {
            let mut threads = VecDeque::with_capacity(num_threads - 1);
            let mut buffer = Vec::with_capacity(batch_size);
            for quad in quads {
                let quad = quad?;
                buffer.push(quad);
                if buffer.len() >= batch_size {
                    self.spawn_load_thread(
                        &mut buffer,
                        &mut threads,
                        thread_scope,
                        &done_counter,
                        &mut done_and_displayed_counter,
                        num_threads,
                        batch_size,
                    )?;
                }
            }
            self.spawn_load_thread(
                &mut buffer,
                &mut threads,
                thread_scope,
                &done_counter,
                &mut done_and_displayed_counter,
                num_threads,
                batch_size,
            )?;
            for thread in threads {
                map_thread_result(thread.join()).map_err(StorageError::Io)??;
                self.on_possible_progress(&done_counter, &mut done_and_displayed_counter)?;
            }
            Ok(())
        })
    }

    fn spawn_load_thread<'scope>(
        &'scope self,
        buffer: &mut Vec<Quad>,
        threads: &mut VecDeque<thread::ScopedJoinHandle<'scope, Result<(), StorageError>>>,
        thread_scope: &'scope thread::Scope<'scope, '_>,
        done_counter: &'scope Mutex<u64>,
        done_and_displayed_counter: &mut u64,
        num_threads: usize,
        batch_size: usize,
    ) -> Result<(), StorageError> {
        self.on_possible_progress(done_counter, done_and_displayed_counter)?;
        // We avoid to have too many threads
        if threads.len() >= num_threads {
            if let Some(thread) = threads.pop_front() {
                map_thread_result(thread.join()).map_err(StorageError::Io)??;
                self.on_possible_progress(done_counter, done_and_displayed_counter)?;
            }
        }
        let mut buffer_to_load = Vec::with_capacity(batch_size);
        swap(buffer, &mut buffer_to_load);
        let storage = &self.storage;
        threads.push_back(thread_scope.spawn(move || {
            FileBulkLoader::new(storage, batch_size).load(buffer_to_load, done_counter)
        }));
        Ok(())
    }

    fn on_possible_progress(
        &self,
        done: &Mutex<u64>,
        done_and_displayed: &mut u64,
    ) -> Result<(), StorageError> {
        let new_counter = *done
            .lock()
            .map_err(|_| io::Error::new(io::ErrorKind::Other, "Mutex poisoned"))?;
        let display_step = DEFAULT_BULK_LOAD_BATCH_SIZE as u64;
        if new_counter / display_step > *done_and_displayed / display_step {
            for hook in &self.hooks {
                hook(new_counter);
            }
        }
        *done_and_displayed = new_counter;
        Ok(())
    }
}

#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
struct FileBulkLoader<'a> {
    storage: &'a Storage,
    id2str: HashMap<StrHash, Box<str>>,
    quads: HashSet<EncodedQuad>,
    triples: HashSet<EncodedQuad>,
    graphs: HashSet<EncodedTerm>,
}

#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
impl<'a> FileBulkLoader<'a> {
    fn new(storage: &'a Storage, batch_size: usize) -> Self {
        Self {
            storage,
            id2str: HashMap::with_capacity(3 * batch_size),
            quads: HashSet::with_capacity(batch_size),
            triples: HashSet::with_capacity(batch_size),
            graphs: HashSet::default(),
        }
    }

    fn load(&mut self, quads: Vec<Quad>, counter: &Mutex<u64>) -> Result<(), StorageError> {
        self.encode(quads)?;
        let size = self.triples.len() + self.quads.len();
        self.save()?;
        *counter
            .lock()
            .map_err(|_| io::Error::new(io::ErrorKind::Other, "Mutex poisoned"))? +=
            size.try_into().unwrap_or(u64::MAX);
        Ok(())
    }

    fn encode(&mut self, quads: Vec<Quad>) -> Result<(), StorageError> {
        for quad in quads {
            let encoded = EncodedQuad::from(quad.as_ref());
            if quad.graph_name.is_default_graph() {
                if self.triples.insert(encoded.clone()) {
                    self.insert_term(quad.subject.as_ref().into(), &encoded.subject)?;
                    self.insert_term(quad.predicate.as_ref().into(), &encoded.predicate)?;
                    self.insert_term(quad.object.as_ref(), &encoded.object)?;
                }
            } else if self.quads.insert(encoded.clone()) {
                self.insert_term(quad.subject.as_ref().into(), &encoded.subject)?;
                self.insert_term(quad.predicate.as_ref().into(), &encoded.predicate)?;
                self.insert_term(quad.object.as_ref(), &encoded.object)?;

                if self.graphs.insert(encoded.graph_name.clone()) {
                    self.insert_term(
                        match quad.graph_name.as_ref() {
                            GraphNameRef::NamedNode(n) => n.into(),
                            GraphNameRef::BlankNode(n) => n.into(),
                            GraphNameRef::DefaultGraph => {
                                return Err(CorruptionError::new(
                                    "Default graph this not the default graph",
                                )
                                .into())
                            }
                        },
                        &encoded.graph_name,
                    )?;
                }
            }
        }
        Ok(())
    }

    fn save(&mut self) -> Result<(), StorageError> {
        let mut to_load = Vec::new();

        // id2str
        if !self.id2str.is_empty() {
            let mut id2str = take(&mut self.id2str)
                .into_iter()
                .map(|(k, v)| (k.to_be_bytes(), v))
                .collect::<Vec<_>>();
            id2str.sort_unstable();
            let mut id2str_sst = self.storage.db.new_sst_file()?;
            for (k, v) in id2str {
                id2str_sst.insert(&k, v.as_bytes())?;
            }
            to_load.push((&self.storage.id2str_cf, id2str_sst.finish()?));
        }

        if !self.triples.is_empty() {
            to_load.push((
                &self.storage.dspo_cf,
                self.build_sst_for_keys(
                    self.triples.iter().map(|quad| {
                        encode_term_triple(&quad.subject, &quad.predicate, &quad.object)
                    }),
                )?,
            ));
            to_load.push((
                &self.storage.dpos_cf,
                self.build_sst_for_keys(
                    self.triples.iter().map(|quad| {
                        encode_term_triple(&quad.predicate, &quad.object, &quad.subject)
                    }),
                )?,
            ));
            to_load.push((
                &self.storage.dosp_cf,
                self.build_sst_for_keys(
                    self.triples.iter().map(|quad| {
                        encode_term_triple(&quad.object, &quad.subject, &quad.predicate)
                    }),
                )?,
            ));
            self.triples.clear();
        }

        if !self.quads.is_empty() {
            // to_load.push((
            //     &self.storage.graphs_cf,
            //     self.build_sst_for_keys(self.graphs.iter().map(encode_term))?,
            // ));
            self.graphs.clear();

            to_load.push((
                &self.storage.gspo_cf,
                self.build_sst_for_keys(self.quads.iter().map(|quad| {
                    encode_term_quad(
                        &quad.graph_name,
                        &quad.subject,
                        &quad.predicate,
                        &quad.object,
                    )
                }))?,
            ));
            to_load.push((
                &self.storage.gpos_cf,
                self.build_sst_for_keys(self.quads.iter().map(|quad| {
                    encode_term_quad(
                        &quad.graph_name,
                        &quad.predicate,
                        &quad.object,
                        &quad.subject,
                    )
                }))?,
            ));
            to_load.push((
                &self.storage.gosp_cf,
                self.build_sst_for_keys(self.quads.iter().map(|quad| {
                    encode_term_quad(
                        &quad.graph_name,
                        &quad.object,
                        &quad.subject,
                        &quad.predicate,
                    )
                }))?,
            ));
            to_load.push((
                &self.storage.spog_cf,
                self.build_sst_for_keys(self.quads.iter().map(|quad| {
                    encode_term_quad(
                        &quad.subject,
                        &quad.predicate,
                        &quad.object,
                        &quad.graph_name,
                    )
                }))?,
            ));
            to_load.push((
                &self.storage.posg_cf,
                self.build_sst_for_keys(self.quads.iter().map(|quad| {
                    encode_term_quad(
                        &quad.predicate,
                        &quad.object,
                        &quad.subject,
                        &quad.graph_name,
                    )
                }))?,
            ));
            to_load.push((
                &self.storage.ospg_cf,
                self.build_sst_for_keys(self.quads.iter().map(|quad| {
                    encode_term_quad(
                        &quad.object,
                        &quad.subject,
                        &quad.predicate,
                        &quad.graph_name,
                    )
                }))?,
            ));
            self.quads.clear();
        }

        self.storage.db.insert_stt_files(&to_load)
    }

    fn insert_term(
        &mut self,
        term: TermRef<'_>,
        encoded: &EncodedTerm,
    ) -> Result<(), StorageError> {
        insert_term(term, encoded, &mut |key, value| {
            self.id2str.entry(*key).or_insert_with(|| value.into());
            Ok(())
        })
    }

    fn build_sst_for_keys(
        &self,
        values: impl Iterator<Item = Vec<u8>>,
    ) -> Result<PathBuf, StorageError> {
        let mut values = values.collect::<Vec<_>>();
        values.sort_unstable();
        let mut sst = self.storage.db.new_sst_file()?;
        for value in values {
            sst.insert_empty(&value)?;
        }
        sst.finish()
    }
}

#[cfg(all(not(target_family = "wasm"), not(docsrs)))]
fn map_thread_result<R>(result: thread::Result<R>) -> io::Result<R> {
    result.map_err(|e| {
        io::Error::new(
            io::ErrorKind::Other,
            if let Ok(e) = e.downcast::<&dyn std::fmt::Display>() {
                format!("A loader processed crashed with {e}")
            } else {
                "A loader processed crashed with and unknown error".into()
            },
        )
    })
}
