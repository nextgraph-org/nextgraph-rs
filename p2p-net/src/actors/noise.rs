use crate::{actor::*, errors::ProtocolError};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NoiseV0 {
    data: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum Noise {
    V0(NoiseV0),
}

impl BrokerRequest for Noise {}

impl Actor<'_, Noise, ()> {}

impl IActor for Actor<'_, Noise, ()> {
    //fn process_request(&self) {}
}
