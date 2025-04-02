// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use pyo3::exceptions::PyTypeError;
use pyo3::prelude::*;
use pythonize::{depythonize, pythonize};
use serde::{Deserialize, Serialize};

use std::fs::read;

#[allow(unused_imports)]
use ::nextgraph::local_broker::{
    app_request, app_request_stream, doc_fetch_repo_subscribe, init_local_broker, session_start,
    session_stop, user_connect, user_disconnect, wallet_close, wallet_create_v0, wallet_get,
    wallet_get_file, wallet_import, wallet_read_file, wallet_was_opened, LocalBrokerConfig,
    SessionConfig,
};
use ::nextgraph::net::app_protocol::*;
use ::nextgraph::net::types::BootstrapContentV0;
use ::nextgraph::repo::errors::NgError;
use ::nextgraph::repo::log::*;
use ::nextgraph::repo::types::{BranchCrdt, StoreRepo, PubKey};
use ::nextgraph::wallet::types::{CreateWalletV0, SessionInfo};
use ::nextgraph::wallet::{display_mnemonic, emojis::display_pazzle};
use async_std::stream::StreamExt;

#[pyfunction]
fn init_local_broker_in_memory() -> PyResult<()> {
    Ok(())
}

struct PyNgError(NgError);

impl From<PyNgError> for PyErr {
    fn from(e: PyNgError) -> PyErr {
        let ioe: std::io::Error = e.0.into();
        ioe.into()
    }
}

impl From<NgError> for PyNgError {
    fn from(e: NgError) -> PyNgError {
        PyNgError(e)
    }
}

/// Open the wallet with mnemonic and PIN, and returns the wallet_name and the SessionInfo
#[pyfunction]
fn wallet_open_with_mnemonic_words(
    py: Python,
    wallet_file_path: String,
    mnemonic_words: Vec<String>,
    pin: [u8; 4],
) -> PyResult<Bound<PyAny>> {
    pyo3_async_runtimes::async_std::future_into_py(py, async move {
        init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;

        let wallet_file = read(wallet_file_path).expect("read wallet file");

        let wallet = wallet_read_file(wallet_file)
            .await
            .map_err(|e| Into::<PyNgError>::into(e))?;

        let opened_wallet = ::nextgraph::local_broker::wallet_open_with_mnemonic_words(
            &wallet,
            &mnemonic_words,
            pin,
        )
        .map_err(|e| Into::<PyNgError>::into(e))?;

        let user_id = opened_wallet.personal_identity();
        let wallet_name = opened_wallet.name();

        let _client = wallet_import(wallet.clone(), opened_wallet, true)
            .await
            .map_err(|e| Into::<PyNgError>::into(e))?;

        let session = session_start(SessionConfig::new_in_memory(&user_id, &wallet_name))
            .await
            .map_err(|e| Into::<PyNgError>::into(e))?;

        // let session = session_start(SessionConfig::new_remote(&user_id, &wallet_name, None)).await?;

        let _status = user_connect(&user_id)
            .await
            .map_err(|e| Into::<PyNgError>::into(e))?;

        let s = Python::with_gil(|py| pythonize(py, &session).unwrap().unbind());
        Ok((wallet_name, s))
    })
}

#[pyfunction]
#[pyo3(signature = (session_id, sparql, nuri=None))]
fn doc_sparql_update(
    py: Python,
    session_id: u64,
    sparql: String,
    nuri: Option<String>,
) -> PyResult<Bound<PyAny>> {
    pyo3_async_runtimes::async_std::future_into_py(py, async move {
        let res = ::nextgraph::local_broker::doc_sparql_update(session_id, sparql, nuri)
            .await
            .map_err(|e| PyTypeError::new_err(e))?;
        Ok(res)
    })
}

#[pyfunction]
fn disconnect_and_close<'a>(
    py: Python<'a>,
    user_id: Bound<'a, PyAny>,
    wallet_name: String,
) -> PyResult<Bound<'a, PyAny>> {
    let user_id: PubKey = depythonize(&user_id)?;
    pyo3_async_runtimes::async_std::future_into_py(py, async move {
        user_disconnect(&user_id)
            .await
            .map_err(|e| Into::<PyNgError>::into(e))?;

        // stop the session
        session_stop(&user_id)
            .await
            .map_err(|e| Into::<PyNgError>::into(e))?;

        // closes the wallet
        wallet_close(&wallet_name)
            .await
            .map_err(|e| Into::<PyNgError>::into(e))?;
        Ok(())
    })
}

#[pyfunction]
#[pyo3(signature = (session_id, crdt, class_name, destination="store".to_string(), store_type=None, store_repo=None))]
fn doc_create(
    py: Python,
    session_id: u64,
    crdt: String,
    class_name: String,
    destination: String,
    store_type: Option<String>,
    store_repo: Option<String>,
) -> PyResult<Bound<PyAny>> {
    pyo3_async_runtimes::async_std::future_into_py(py, async move {

        Ok(nextgraph::local_broker::doc_create(session_id, crdt, class_name, destination, store_type, store_repo)
            .await
            .map_err(|e| Into::<PyNgError>::into(e))?
        )
    })
}

#[pymodule]
fn nextgraphpy(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(wallet_open_with_mnemonic_words, m)?)?;
    m.add_function(wrap_pyfunction!(doc_sparql_update, m)?)?;
    m.add_function(wrap_pyfunction!(disconnect_and_close, m)?)?;
    m.add_function(wrap_pyfunction!(doc_create, m)?)?;
    Ok(())
}
