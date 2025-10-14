// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use serde::{Deserialize, Serialize};

use std::collections::HashMap;

use ng_repo::types::UserId;

/// Access Mode
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AccessMode {
    Read,
    Write,
    Create,
    HookCreate,
    HookDelete,
    Control,
    Sign,
    Run,
    Cron,
    Query,
    SocialQuery,
    Share,
    DeviceCapability,
}

/// Access Scope
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AccessScope {
    Once,
    OnceSub,
    OnceMany,
    OnceManySub,
    Permanent,
    Foreground,
    Background,
}

/// Access Request Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AccessRequestV0 {
    /// ID of the Access Request. Should be the tokenized CommitID of the RDF AccessRequest in the App's manifest Document.
    pub id: String,

    pub mode: AccessMode,

    /// allowed types for this access mode. Usually a PrimaryClass. can be "any".
    /// for Runs: name of the service
    /// for Queries: Nuri of the Sparql, Fragment, ShapeTree or GraphQL
    /// for Cron: the time interval
    /// for Share: Stream, e:mail, e:xxx, Contact, Document
    /// for DeviceCapability: camera, microphone, location, receiveSMS, scanQR, internet
    pub types: Vec<String>,

    /// allowed scopes for this access mode
    pub scopes: Vec<AccessScope>,

    /// is this access request optional?
    pub optional: bool,

    /// request depends on another request (only if optional)
    pub depends_on: Option<String>,
}

impl AccessRequestV0 {
    pub fn new_access_all() -> Self {
        Self {
            id: "".to_string(),
            mode: AccessMode::Read,
            types: vec!["any".to_string()],
            scopes: vec![AccessScope::Permanent],
            optional: false,
            depends_on: None,
        }
    }
}

/// App Component type
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppComponentType {
    Viewer,
    Editor,
    ReadService,
    WriteService,
    Model,
}

/// AppComponentV0 Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppComponentV0 {
    /// Name of the component, can be an official component of the for n:g:z, or custom ones n:xxx:z:yyy or o:xxx
    pub name: String,

    pub component_type: AppComponentType,
}

/// Primary Class Install Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PrimaryClassInstallV0 {
    /// Primary Class name, can be an official name or a custom name of the form app:n... or app:o:...
    pub primary_class: String,

    pub components: Vec<AppComponentV0>,
}

/// App Manifest Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppManifestV0 {
    /// Nuri
    pub nuri: Option<String>,

    /// Origin (for webapps only)
    pub origin: Option<String>,

    /// cannot create Documents?
    pub singleton: bool,

    /// list of Access Requests
    pub access_requests: Vec<AccessRequestV0>,

    /// installs: list of Viewers, Editors, Services and Models, by PrimaryClass, that will be installed by this app
    pub installs: HashMap<String, PrimaryClassInstallV0>,

    /// dependencies: list of other apps (Nuri) that needs to be installed before this app can be installed
    pub dependencies: Vec<String>,

    /// optional name. Only for registered or official apps
    pub name: Option<String>,

    /// optional title. Broker will enter the domain's homepage title here, if any
    pub title: Option<String>,

    /// optional description. Broker will enter the domain's homepage description here, if any
    pub description: Option<String>,

    /// optional icon. Broker will enter the domain's homepage favicon here, if any
    #[serde(with = "serde_bytes")]
    pub icon: Vec<u8>,

    /// optional image. Broker will enter the domain's homepage main image here, if any
    #[serde(with = "serde_bytes")]
    pub image: Vec<u8>,
}

/// Web App Manifest
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum AppManifest {
    V0(AppManifestV0),
}

impl AppManifest {
    pub fn new_for_origin_all_access_v0(origin: String) -> Self {
        AppManifest::V0(AppManifestV0 {
            nuri: None,
            origin: Some(origin),
            singleton: true,
            access_requests: vec![AccessRequestV0::new_access_all()],
            installs: HashMap::new(),
            dependencies: vec![],
            name: None,
            title: None,
            description: None,
            icon: vec![],
            image: vec![],
        })
    }
    pub fn new_v0(origin: String, singleton: bool, access_requests: Vec<AccessRequestV0>) -> Self {
        AppManifest::V0(AppManifestV0 {
            nuri: None,
            origin: Some(origin),
            singleton,
            access_requests,
            installs: HashMap::new(),
            dependencies: vec![],
            name: None,
            title: None,
            description: None,
            icon: vec![],
            image: vec![],
        })
    }
    pub fn to_url_param(&self) -> String {
        let ser = serde_bare::to_vec(self).unwrap();
        base64_url::encode(&ser)
    }
}

/// Access Grant Version 0
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AccessGrantV0 {
    /// Nuri of tokenized commitID of this grant
    pub id: String,

    /// reference to the AccessRequest. can be None for PermaCaps
    pub request: Option<String>,

    pub mode: AccessMode,

    /// Usually a PrimaryClass.
    /// for Runs: name of the service
    /// for Queries: Nuri of the Sparql, Fragment, ShapeTree or GraphQL
    /// for Cron: the time interval
    /// for Share: Stream, e:mail, e:xxx, Contact, Document
    /// for DeviceCapability: camera, microphone, location, receiveSMS, scanQR, internet
    pub access_type: String,

    pub scope: AccessScope,

    /// Nuri of target. Can be None for services
    pub target: Option<String>,

    /// UserId of grantee (a user or a robot)
    pub grantee: UserId,

    /// grant depends on another grant
    pub depends_on: Option<String>,
}
