/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

use crate::{errors::ProtocolError, types::*};
use p2p_repo::{kcv_store::KCVStore, types::PubKey};

pub trait ServerStorage: Send + Sync {
    fn get_user(&self, user_id: PubKey) -> Result<bool, ProtocolError>;
    fn add_user(&self, user_id: PubKey, is_admin: bool) -> Result<(), ProtocolError>;
    fn del_user(&self, user_id: PubKey) -> Result<(), ProtocolError>;
    fn list_users(&self, admins: bool) -> Result<Vec<PubKey>, ProtocolError>;
    fn list_invitations(
        &self,
        admin: bool,
        unique: bool,
        multi: bool,
    ) -> Result<Vec<(InvitationCode, u32, Option<String>)>, ProtocolError>;
    fn add_invitation(
        &self,
        invite_code: &InvitationCode,
        expiry: u32,
        memo: &Option<String>,
    ) -> Result<(), ProtocolError>;
    fn get_invitation_type(&self, invite: [u8; 32]) -> Result<u8, ProtocolError>;
    fn remove_invitation(&self, invite: [u8; 32]) -> Result<(), ProtocolError>;
}
