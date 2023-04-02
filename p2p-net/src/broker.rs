use crate::connection::*;
use crate::errors::*;
use crate::types::*;
use crate::utils::ResultSend;
use p2p_repo::types::{PrivKey, PubKey};
use p2p_repo::utils::generate_keypair;
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::{Arc, RwLock};

use crate::actor::*;

pub enum PeerConnection {
    Core(IP),
    Client(Box<Arc<dyn IConnection>>),
    NONE,
}

pub struct BrokerPeerInfo {
    lastPeerAdvert: Option<PeerAdvert>, //FIXME: remove Option
    connected: PeerConnection,
}

pub struct DirectConnection {
    ip: IP,
    interface: String,
    remote_peer_id: DirectPeerId,
    tp: TransportProtocol,
    //dir: ConnectionDir,
    cnx: Box<Arc<dyn IConnection>>,
}

pub struct Broker {
    //actors: Arc<RwLock<HashMap<i64, Box<dyn IActor>>>>,
    direct_connections: Arc<RwLock<HashMap<IP, DirectConnection>>>,
    peers: Arc<RwLock<HashMap<DirectPeerId, BrokerPeerInfo>>>,
}

impl Broker {
    pub fn new() -> Self {
        Broker {
            direct_connections: Arc::new(RwLock::new(HashMap::new())),
            peers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn connect(
        &self,
        cnx: Arc<dyn IConnection>,
        ip: IP,
        core: Option<String>,
        peer_pubk: PrivKey,
        peer_privk: PubKey,
        remote_peer_id: DirectPeerId,
    ) -> Result<(), NetError> {
        // TODO check that not already connected to peer
        //IpAddr::from_str("127.0.0.1");
        //cnx.open(url, peer_pubk, peer_privk).await?;
        //let cnx = Arc::new();
        let (priv_key, pub_key) = generate_keypair();
        Arc::clone(&cnx)
            .open(ip, priv_key, pub_key, remote_peer_id)
            .await?;
        let connected = if core.is_some() {
            let dc = DirectConnection {
                ip,
                interface: core.unwrap(),
                remote_peer_id,
                tp: cnx.tp(),
                cnx: Box::new(Arc::clone(&cnx)),
            };
            self.direct_connections.write().unwrap().insert(ip, dc);
            PeerConnection::Core(ip)
        } else {
            PeerConnection::Client(Box::new(Arc::clone(&cnx)))
        };
        let bpi = BrokerPeerInfo {
            lastPeerAdvert: None,
            connected,
        };
        self.peers.write().unwrap().insert(remote_peer_id, bpi);
        Ok(())
    }
}
