// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

#[macro_export]
macro_rules! before {
    ( $self:expr, $request_id:ident, $addr:ident, $receiver:ident ) => {
        let mut actor = BrokerMessageActor::new();
        let $receiver = actor.receiver();
        let mut $addr = actor
            .start()
            .await
            .map_err(|_e| ProtocolError::ActorError)?;

        let $request_id = $addr.actor_id();
        //debug_println!("actor ID {}", $request_id);

        {
            let mut map = $self.actors.write().expect("RwLock poisoned");
            map.insert($request_id, $addr.downgrade());
        }
    };
}

macro_rules! after {
    ( $self:expr, $request_id:ident, $addr:ident, $receiver:ident, $reply:ident ) => {
        //debug_println!("waiting for reply");

        $addr.wait_for_stop().await; // TODO add timeout and close connection if there's no reply
        let r = $receiver.await;
        if r.is_err() { return Err(ProtocolError::Closing);}
        let $reply = r.unwrap();
        //debug_println!("reply arrived {:?}", $reply);
        {
            let mut map = $self.actors.write().expect("RwLock poisoned");
            map.remove(&$request_id);
        }
    };
}

pub mod connection_remote;

pub mod connection_ws;