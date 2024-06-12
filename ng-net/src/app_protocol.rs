// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! App Protocol (between LocalBroker and Verifier)

use lazy_static::lazy_static;
use ng_repo::utils::decode_overlayid;
use regex::Regex;
use serde::{Deserialize, Serialize};

use ng_repo::errors::NgError;
use ng_repo::log::*;
use ng_repo::types::*;
use ng_repo::utils::{decode_digest, decode_key, decode_sym_key};

use crate::types::*;

lazy_static! {
    #[doc(hidden)]
    static ref RE_FILE_READ_CAP: Regex =
        Regex::new(r"^did:ng:j:([A-Za-z0-9-_%.]*):k:([A-Za-z0-9-_%.]*)$").unwrap();
    #[doc(hidden)]
    static ref RE_REPO: Regex =
        Regex::new(r"^did:ng:o:([A-Za-z0-9-_%.]*):v:([A-Za-z0-9-_%.]*)$").unwrap();
    #[doc(hidden)]
    static ref RE_BRANCH: Regex =
        Regex::new(r"^did:ng:o:([A-Za-z0-9-_%.]*):v:([A-Za-z0-9-_%.]*):b:([A-Za-z0-9-_%.]*)$").unwrap();
    #[doc(hidden)]
    static ref RE_NAMED_BRANCH_OR_COMMIT: Regex =
        Regex::new(r"^did:ng:o:([A-Za-z0-9-_%.]*):v:([A-Za-z0-9-_%.]*):a:([A-Za-z0-9-_%.]*)$").unwrap(); //TODO: allow international chars. disallow digit as first char
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppFetchContentV0 {
    Get,       // does not subscribe. more to be detailed
    Subscribe, // more to be detailed
    Update,
    //Invoke,
    ReadQuery,  // more to be detailed
    WriteQuery, // more to be detailed
    RdfDump,
}

impl AppFetchContentV0 {
    pub fn get_or_subscribe(subscribe: bool) -> Self {
        if !subscribe {
            AppFetchContentV0::Get
        } else {
            AppFetchContentV0::Subscribe
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NgAccessV0 {
    ReadCap(ReadCap),
    Token(Digest),
    #[serde(with = "serde_bytes")]
    ExtRequest(Vec<u8>),
    Key(BlockKey),
    Inbox(Digest),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum TargetBranchV0 {
    Chat,
    Stream,
    Comments,
    BackLinks,
    Context,
    Ontology,
    BranchId(BranchId),
    Named(String),          // branch or commit
    Commits(Vec<ObjectId>), // only possible if access to their branch is given. must belong to the same branch.
}

impl TargetBranchV0 {
    pub fn is_valid_for_sparql_update(&self) -> bool {
        match self {
            Self::Commits(_) => false,
            _ => true,
        }
    }
    pub fn branch_id(&self) -> &BranchId {
        match self {
            Self::BranchId(id) => id,
            _ => panic!("not a TargetBranchV0::BranchId"),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum NuriTargetV0 {
    UserSite, // targets the whole data set of the user

    PublicStore,
    ProtectedStore,
    PrivateStore,
    AllDialogs,
    Dialog(String), // shortname of a Dialog
    AllGroups,
    Group(String), // shortname of a Group

    Repo(RepoId),

    None,
}

impl NuriTargetV0 {
    pub fn is_valid_for_sparql_update(&self) -> bool {
        match self {
            Self::UserSite | Self::AllDialogs | Self::AllGroups => false,
            _ => true,
        }
    }
    pub fn is_repo_id(&self) -> bool {
        match self {
            Self::Repo(_) => true,
            _ => false,
        }
    }
    pub fn repo_id(&self) -> &RepoId {
        match self {
            Self::Repo(id) => id,
            _ => panic!("not a NuriTargetV0::Repo"),
        }
    }
}

const DID_PREFIX: &str = "did:ng";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NuriV0 {
    pub identity: Option<UserId>, // None for personal identity
    pub target: NuriTargetV0,
    pub entire_store: bool, // If it is a store, will include all the docs belonging to the store

    pub object: Option<ObjectId>, // used only for FileGet. // cannot be used for queries. only to download an object (file,commit..)
    pub branch: Option<TargetBranchV0>, // if None, the main branch is chosen
    pub overlay: Option<OverlayLink>,

    pub access: Vec<NgAccessV0>,
    pub topic: Option<TopicId>,
    pub locator: Vec<PeerAdvert>,
}

impl NuriV0 {
    pub fn commit_graph_name(commit_id: &ObjectId, overlay_id: &OverlayId) -> String {
        format!("{DID_PREFIX}:c:{commit_id}:v:{overlay_id}")
    }

    pub fn commit_graph_name_from_base64(commit_base64: &String, overlay_id: &OverlayId) -> String {
        format!("{DID_PREFIX}:c:{commit_base64}:v:{overlay_id}")
    }

    pub fn repo_graph_name(repo_id: &RepoId, overlay_id: &OverlayId) -> String {
        format!("{DID_PREFIX}:o:{repo_id}:v:{overlay_id}")
    }

    pub fn overlay_id(overlay_id: &OverlayId) -> String {
        format!("{DID_PREFIX}:v:{overlay_id}")
    }

    pub fn topic_id(topic_id: &TopicId) -> String {
        format!("{DID_PREFIX}:h:{topic_id}")
    }

    pub fn branch_id(branch_id: &BranchId) -> String {
        format!("{DID_PREFIX}:b:{branch_id}")
    }

    pub fn branch_id_from_base64(branch_base64: &String) -> String {
        format!("{DID_PREFIX}:b:{branch_base64}")
    }

    pub fn token(token: &Digest) -> String {
        format!("{DID_PREFIX}:n:{token}")
    }

    pub fn is_branch_identifier(&self) -> bool {
        self.locator.is_empty()
            && self.topic.is_none()
            && self.access.is_empty()
            && self.overlay.as_ref().map_or(false, |o| o.is_outer())
            && self
                .branch
                .as_ref()
                .map_or(true, |b| b.is_valid_for_sparql_update())
            && self.object.is_none()
            && !self.entire_store
            && self.target.is_repo_id()
    }

    pub fn is_valid_for_sparql_update(&self) -> bool {
        self.object.is_none()
            && self.entire_store == false
            && self.target.is_valid_for_sparql_update()
            && self
                .branch
                .as_ref()
                .map_or(true, |b| b.is_valid_for_sparql_update())
    }
    pub fn new_repo_target_from_string(repo_id_string: String) -> Result<Self, NgError> {
        let repo_id: RepoId = repo_id_string.as_str().try_into()?;
        Ok(Self {
            identity: None,
            target: NuriTargetV0::Repo(repo_id),
            entire_store: false,
            object: None,
            branch: None,
            overlay: None,
            access: vec![],
            topic: None,
            locator: vec![],
        })
    }

    pub fn new_private_store_target() -> Self {
        Self {
            identity: None,
            target: NuriTargetV0::PrivateStore,
            entire_store: false,
            object: None,
            branch: None,
            overlay: None,
            access: vec![],
            topic: None,
            locator: vec![],
        }
    }
    pub fn new_entire_user_site() -> Self {
        Self {
            identity: None,
            target: NuriTargetV0::UserSite,
            entire_store: false,
            object: None,
            branch: None,
            overlay: None,
            access: vec![],
            topic: None,
            locator: vec![],
        }
    }
    pub fn new_from(from: &String) -> Result<Self, NgError> {
        let c = RE_FILE_READ_CAP.captures(from);

        if c.is_some()
            && c.as_ref().unwrap().get(1).is_some()
            && c.as_ref().unwrap().get(2).is_some()
        {
            let cap = c.unwrap();
            let j = cap.get(1).unwrap().as_str();
            let k = cap.get(2).unwrap().as_str();
            let id = decode_digest(j)?;
            let key = decode_sym_key(k)?;
            Ok(Self {
                identity: None,
                target: NuriTargetV0::PrivateStore,
                entire_store: false,
                object: Some(id),
                branch: None,
                overlay: None,
                access: vec![NgAccessV0::Key(key)],
                topic: None,
                locator: vec![],
            })
        } else {
            let c = RE_REPO.captures(from);

            if c.is_some()
                && c.as_ref().unwrap().get(1).is_some()
                && c.as_ref().unwrap().get(2).is_some()
            {
                let cap = c.unwrap();
                let o = cap.get(1).unwrap().as_str();

                let v = cap.get(2).unwrap().as_str();
                let repo_id = decode_key(o)?;
                let overlay_id = decode_overlayid(v)?;
                Ok(Self {
                    identity: None,
                    target: NuriTargetV0::Repo(repo_id),
                    entire_store: false,
                    object: None,
                    branch: None,
                    overlay: Some(overlay_id.into()),
                    access: vec![],
                    topic: None,
                    locator: vec![],
                })
            } else {
                let c = RE_BRANCH.captures(from);

                if c.is_some()
                    && c.as_ref().unwrap().get(1).is_some()
                    && c.as_ref().unwrap().get(2).is_some()
                    && c.as_ref().unwrap().get(3).is_some()
                {
                    let cap = c.unwrap();
                    let o = cap.get(1).unwrap().as_str();
                    let v = cap.get(2).unwrap().as_str();
                    let b = cap.get(3).unwrap().as_str();
                    let repo_id = decode_key(o)?;
                    let overlay_id = decode_overlayid(v)?;
                    let branch_id = decode_key(b)?;
                    Ok(Self {
                        identity: None,
                        target: NuriTargetV0::Repo(repo_id),
                        entire_store: false,
                        object: None,
                        branch: Some(TargetBranchV0::BranchId(branch_id)),
                        overlay: Some(overlay_id.into()),
                        access: vec![],
                        topic: None,
                        locator: vec![],
                    })
                } else {
                    Err(NgError::InvalidNuri)
                }
            }
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppRequestCommandV0 {
    Fetch(AppFetchContentV0),
    Pin,
    UnPin,
    Delete,
    Create,
    FileGet, // needs the Nuri of branch/doc/store AND ObjectId
    FilePut, // needs the Nuri of branch/doc/store
}

impl AppRequestCommandV0 {
    pub fn is_stream(&self) -> bool {
        match self {
            Self::Fetch(AppFetchContentV0::Subscribe) | Self::FileGet => true,
            Self::FilePut
            | Self::Create
            | Self::Delete
            | Self::UnPin
            | Self::Pin
            | Self::Fetch(_) => false,
        }
    }
    pub fn new_read_query() -> Self {
        AppRequestCommandV0::Fetch(AppFetchContentV0::ReadQuery)
    }
    pub fn new_write_query() -> Self {
        AppRequestCommandV0::Fetch(AppFetchContentV0::WriteQuery)
    }
    pub fn new_rdf_dump() -> Self {
        AppRequestCommandV0::Fetch(AppFetchContentV0::RdfDump)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppRequestV0 {
    pub command: AppRequestCommandV0,

    pub nuri: NuriV0,

    pub payload: Option<AppRequestPayload>,

    pub session_id: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppRequest {
    V0(AppRequestV0),
}

impl AppRequest {
    pub fn set_session_id(&mut self, session_id: u64) {
        match self {
            Self::V0(v0) => v0.session_id = session_id,
        }
    }
    pub fn session_id(&self) -> u64 {
        match self {
            Self::V0(v0) => v0.session_id,
        }
    }
    pub fn command(&self) -> &AppRequestCommandV0 {
        match self {
            Self::V0(v0) => &v0.command,
        }
    }
    pub fn new(
        command: AppRequestCommandV0,
        nuri: NuriV0,
        payload: Option<AppRequestPayload>,
    ) -> Self {
        AppRequest::V0(AppRequestV0 {
            command,
            nuri,
            payload,
            session_id: 0,
        })
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppSessionStopV0 {
    pub session_id: u64,
    pub force_close: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppSessionStop {
    V0(AppSessionStopV0),
}
impl AppSessionStop {
    pub fn session_id(&self) -> u64 {
        match self {
            Self::V0(v0) => v0.session_id,
        }
    }
    pub fn is_force_close(&self) -> bool {
        match self {
            Self::V0(v0) => v0.force_close,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppSessionStartV0 {
    pub session_id: u64,

    pub credentials: Option<Credentials>,

    pub user_id: UserId,

    pub detach: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppSessionStart {
    V0(AppSessionStartV0),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppSessionStartResponseV0 {
    pub private_store: RepoId,
    pub protected_store: RepoId,
    pub public_store: RepoId,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppSessionStartResponse {
    V0(AppSessionStartResponseV0),
}

impl AppSessionStart {
    pub fn session_id(&self) -> u64 {
        match self {
            Self::V0(v0) => v0.session_id,
        }
    }
    pub fn credentials(&self) -> &Option<Credentials> {
        match self {
            Self::V0(v0) => &v0.credentials,
        }
    }
    pub fn user_id(&self) -> &UserId {
        match self {
            Self::V0(v0) => &v0.user_id,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DocQuery {
    V0(String), // Sparql
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GraphUpdate {
    // serialization of Vec<Quad>
    #[serde(with = "serde_bytes")]
    pub inserts: Vec<u8>,
    // serialization of Vec<Quad>
    #[serde(with = "serde_bytes")]
    pub removes: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DiscreteUpdate {
    /// A yrs::Update
    #[serde(with = "serde_bytes")]
    YMap(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YXml(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YText(Vec<u8>),
    /// An automerge::Patch
    #[serde(with = "serde_bytes")]
    Automerge(Vec<u8>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocUpdate {
    heads: Vec<ObjectId>,
    graph: Option<GraphUpdate>,
    discrete: Option<DiscreteUpdate>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocAddFile {
    pub filename: Option<String>,
    pub object: ObjectRef,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocCreate {
    store: StoreRepo,
    content_type: BranchContentType,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DocDelete {
    /// Nuri of doc to delete
    nuri: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppRequestPayloadV0 {
    Create(DocCreate),
    Query(DocQuery),
    Update(DocUpdate),
    AddFile(DocAddFile),
    //RemoveFile
    Delete(DocDelete),
    //Invoke(InvokeArguments),
    SmallFilePut(SmallFile),
    RandomAccessFilePut(String),                           // content_type
    RandomAccessFilePutChunk((u32, serde_bytes::ByteBuf)), // end the upload with an empty vec
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppRequestPayload {
    V0(AppRequestPayloadV0),
}

impl AppRequestPayload {
    pub fn new_sparql_query(query: String) -> Self {
        AppRequestPayload::V0(AppRequestPayloadV0::Query(DocQuery::V0(query)))
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DiscretePatch {
    /// A yrs::Update
    #[serde(with = "serde_bytes")]
    YMap(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YXml(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YText(Vec<u8>),
    /// An automerge::Patch
    #[serde(with = "serde_bytes")]
    Automerge(Vec<u8>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GraphPatch {
    // serialization of Vec<Triple>
    #[serde(with = "serde_bytes")]
    pub inserts: Vec<u8>,
    // serialization of Vec<Triple>
    #[serde(with = "serde_bytes")]
    pub removes: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum DiscreteState {
    /// A yrs::StateVector
    #[serde(with = "serde_bytes")]
    YMap(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YXml(Vec<u8>),
    #[serde(with = "serde_bytes")]
    YText(Vec<u8>),
    // the output of Automerge::save()
    #[serde(with = "serde_bytes")]
    Automerge(Vec<u8>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GraphState {
    // serialization of Vec<Triple>
    #[serde(with = "serde_bytes")]
    pub triples: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppState {
    heads: Vec<ObjectId>,
    graph: Option<GraphState>, // there is always a graph present in the branch. but it might not have been asked in the request
    discrete: Option<DiscreteState>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppPatch {
    heads: Vec<ObjectId>,
    graph: Option<GraphPatch>,
    discrete: Option<DiscretePatch>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FileName {
    pub heads: Vec<ObjectId>,
    pub name: Option<String>,
    pub reference: ObjectRef,
    pub nuri: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FileMetaV0 {
    pub content_type: String,
    pub size: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppResponseV0 {
    SessionStart(AppSessionStartResponse),
    State(AppState),
    Patch(AppPatch),
    Text(String),
    File(FileName),
    FileUploading(u32),
    FileUploaded(ObjectRef),
    #[serde(with = "serde_bytes")]
    FileBinary(Vec<u8>),
    FileMeta(FileMetaV0),
    #[serde(with = "serde_bytes")]
    QueryResult(Vec<u8>), // a serialized [SPARQL Query Results JSON Format](https://www.w3.org/TR/sparql11-results-json/)
    #[serde(with = "serde_bytes")]
    Graph(Vec<u8>), // a serde serialization of a list of triples. can be transformed on the client side to RDF-JS data model, or JSON-LD, or else (Turtle,...) http://rdf.js.org/data-model-spec/
    Ok,
    True,
    False,
    Error(String),
    EndOfStream,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppResponse {
    V0(AppResponseV0),
}

impl AppResponse {
    pub fn error(err: String) -> Self {
        AppResponse::V0(AppResponseV0::Error(err))
    }
    pub fn ok() -> Self {
        AppResponse::V0(AppResponseV0::Ok)
    }
}
