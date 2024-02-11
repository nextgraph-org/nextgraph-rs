// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use warp::{reply::Response, Reply};

pub enum NgHttpError {
    InvalidParams,
    NotFound,
    AlreadyExists,
    InternalError,
}

impl Reply for NgHttpError {
    fn into_response(self) -> Response {
        match (self) {
            NgHttpError::NotFound => warp::http::StatusCode::NOT_FOUND.into_response(),
            NgHttpError::InvalidParams => {
                let response = Response::new("Invalid params".into());
                let (mut parts, body) = response.into_parts();
                parts.status = warp::http::StatusCode::BAD_REQUEST;
                let response = Response::from_parts(parts, body);
                response
            }
            NgHttpError::AlreadyExists => warp::http::StatusCode::CONFLICT.into_response(),
            NgHttpError::InternalError => {
                warp::http::StatusCode::INTERNAL_SERVER_ERROR.into_response()
            }
        }
    }
}
