fn block_size() -> usize {
    store_max_value_size()
    //store_valid_value_size(0)
}

async fn test_sync(cnx: &mut impl BrokerConnection, user_pub_key: PubKey, userpriv_key: PrivKey) {
    fn add_obj(
        content: ObjectContent,
        deps: Vec<ObjectId>,
        expiry: Option<Timestamp>,
        repo_pubkey: PubKey,
        repo_secret: SymKey,
        store: &mut impl BlockStorage,
    ) -> ObjectRef {
        let max_object_size = 4000;
        let obj = Object::new(
            content,
            deps,
            expiry,
            max_object_size,
            repo_pubkey,
            repo_secret,
        );
        //log_debug!(">>> add_obj");
        log_debug!("     id: {}", obj.id());
        //log_debug!("     deps: {:?}", obj.deps());
        obj.save(store).unwrap();
        obj.reference().unwrap()
    }

    fn add_commit(
        branch: ObjectRef,
        author_privkey: PrivKey,
        author_pubkey: PubKey,
        seq: u32,
        deps: Vec<ObjectRef>,
        acks: Vec<ObjectRef>,
        body_ref: ObjectRef,
        repo_pubkey: PubKey,
        repo_secret: SymKey,
        store: &mut impl BlockStorage,
    ) -> ObjectRef {
        let mut obj_deps: Vec<ObjectId> = vec![];
        obj_deps.extend(deps.iter().map(|r| r.id));
        obj_deps.extend(acks.iter().map(|r| r.id));

        let obj_ref = ObjectRef {
            id: ObjectId::Blake3Digest32([1; 32]),
            key: SymKey::ChaCha20Key([2; 32]),
        };
        let refs = vec![obj_ref];
        let metadata = vec![5u8; 55];
        let expiry = None;

        let commit = Commit::new(
            author_privkey,
            author_pubkey,
            seq,
            branch,
            deps,
            acks,
            refs,
            metadata,
            body_ref,
            expiry,
        )
        .unwrap();
        //log_debug!("commit: {}", commit.id().unwrap());
        add_obj(
            ObjectContent::Commit(commit),
            obj_deps,
            expiry,
            repo_pubkey,
            repo_secret,
            store,
        )
    }

    fn add_body_branch(
        branch: Branch,
        repo_pubkey: PubKey,
        repo_secret: SymKey,
        store: &mut impl BlockStorage,
    ) -> ObjectRef {
        let deps = vec![];
        let expiry = None;
        let body = CommitBody::Branch(branch);
        //log_debug!("body: {:?}", body);
        add_obj(
            ObjectContent::CommitBody(body),
            deps,
            expiry,
            repo_pubkey,
            repo_secret,
            store,
        )
    }

    fn add_body_trans(
        deps: Vec<ObjectId>,
        repo_pubkey: PubKey,
        repo_secret: SymKey,
        store: &mut impl BlockStorage,
    ) -> ObjectRef {
        let expiry = None;
        let content = [7u8; 777].to_vec();
        let body = CommitBody::Transaction(Transaction::V0(content));
        //log_debug!("body: {:?}", body);
        add_obj(
            ObjectContent::CommitBody(body),
            deps,
            expiry,
            repo_pubkey,
            repo_secret,
            store,
        )
    }

    fn add_body_ack(
        deps: Vec<ObjectId>,
        repo_pubkey: PubKey,
        repo_secret: SymKey,
        store: &mut impl BlockStorage,
    ) -> ObjectRef {
        let expiry = None;
        let body = CommitBody::Ack(Ack::V0());
        //log_debug!("body: {:?}", body);
        add_obj(
            ObjectContent::CommitBody(body),
            deps,
            expiry,
            repo_pubkey,
            repo_secret,
            store,
        )
    }

    let mut store = HashMapBlockStorage::new();
    let mut rng = OsRng {};

    // repo

    let repo_keypair: Keypair = Keypair::generate(&mut rng);
    // log_debug!(
    //     "repo private key: ({}) {:?}",
    //     repo_keypair.secret.as_bytes().len(),
    //     repo_keypair.secret.as_bytes()
    // );
    // log_debug!(
    //     "repo public key: ({}) {:?}",
    //     repo_keypair.public.as_bytes().len(),
    //     repo_keypair.public.as_bytes()
    // );
    let _repo_privkey = PrivKey::Ed25519PrivKey(repo_keypair.secret.to_bytes());
    let repo_pubkey = PubKey::Ed25519PubKey(repo_keypair.public.to_bytes());
    let repo_secret = SymKey::ChaCha20Key([9; 32]);

    let repolink = RepoLink::V0(RepoLinkV0 {
        id: repo_pubkey,
        secret: repo_secret,
        peers: vec![],
    });

    // branch

    let branch_keypair: Keypair = Keypair::generate(&mut rng);
    //log_debug!("branch public key: {:?}", branch_keypair.public.as_bytes());
    let branch_pubkey = PubKey::Ed25519PubKey(branch_keypair.public.to_bytes());

    let member_keypair: Keypair = Keypair::generate(&mut rng);
    //log_debug!("member public key: {:?}", member_keypair.public.as_bytes());
    let member_privkey = PrivKey::Ed25519PrivKey(member_keypair.secret.to_bytes());
    let member_pubkey = PubKey::Ed25519PubKey(member_keypair.public.to_bytes());

    let metadata = [66u8; 64].to_vec();
    let commit_types = vec![CommitType::Ack, CommitType::Transaction];
    let secret = SymKey::ChaCha20Key([0; 32]);

    let member = MemberV0::new(member_pubkey, commit_types, metadata.clone());
    let members = vec![member];
    let mut quorum = HashMap::new();
    quorum.insert(CommitType::Transaction, 3);
    let ack_delay = RelTime::Minutes(3);
    let tags = [99u8; 32].to_vec();
    let branch = Branch::new(
        branch_pubkey,
        branch_pubkey,
        secret,
        members,
        quorum,
        ack_delay,
        tags,
        metadata,
    );
    //log_debug!("branch: {:?}", branch);

    log_debug!("branch deps/acks:");
    log_debug!("");
    log_debug!("     br");
    log_debug!("    /  \\");
    log_debug!("  t1   t2");
    log_debug!("  / \\  / \\");
    log_debug!(" a3  t4<--t5-->(t1)");
    log_debug!("     / \\");
    log_debug!("   a6   a7");
    log_debug!("");

    // commit bodies

    let branch_body = add_body_branch(
        branch.clone(),
        repo_pubkey.clone(),
        repo_secret.clone(),
        &mut store,
    );
    let ack_body = add_body_ack(vec![], repo_pubkey, repo_secret, &mut store);
    let trans_body = add_body_trans(vec![], repo_pubkey, repo_secret, &mut store);

    // create & add commits to store

    log_debug!(">> br");
    let br = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        0,
        vec![],
        vec![],
        branch_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    log_debug!(">> t1");
    let t1 = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        1,
        vec![br],
        vec![],
        trans_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    log_debug!(">> t2");
    let t2 = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        2,
        vec![br],
        vec![],
        trans_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    log_debug!(">> a3");
    let a3 = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        3,
        vec![t1],
        vec![],
        ack_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    log_debug!(">> t4");
    let t4 = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        4,
        vec![t2],
        vec![t1],
        trans_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    log_debug!(">> t5");
    let t5 = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        5,
        vec![t1, t2],
        vec![t4],
        trans_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    log_debug!(">> a6");
    let a6 = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        6,
        vec![t4],
        vec![],
        ack_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    log_debug!(">> a7");
    let a7 = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        7,
        vec![t4],
        vec![],
        ack_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    let mut public_overlay_cnx = cnx
        .overlay_connect(&repolink, true)
        .await
        .expect("overlay_connect failed");

    // Sending everything to the broker
    for (v) in store.get_all() {
        //log_debug!("SENDING {}", k);
        let _ = public_overlay_cnx
            .put_block(&v)
            .await
            .expect("put_block failed");
    }

    // Now emptying the local store of the client, and adding only 1 commit into it (br)
    // we also have received an commit (t5) but we don't know what to do with it...
    let mut store = HashMapBlockStorage::new();

    let br = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        0,
        vec![],
        vec![],
        branch_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    let t5 = add_commit(
        branch_body,
        member_privkey,
        member_pubkey,
        5,
        vec![t1, t2],
        vec![t4],
        trans_body,
        repo_pubkey,
        repo_secret,
        &mut store,
    );

    log_debug!("LOCAL STORE HAS {} BLOCKS", store.get_len());

    // Let's pretend that we know that the head of the branch in the broker is at commits a6 and a7.
    // normally it would be the pub/sub that notifies us of those heads.
    // now we want to synchronize with the broker.

    let mut filter = Filter::new(FilterBuilder::new(10, 0.01));
    for commit_ref in [br, t5] {
        match commit_ref.id {
            ObjectId::Blake3Digest32(d) => filter.add(&d),
        }
    }
    let cfg = filter.config();

    let known_commits = BloomFilter {
        k: cfg.hashes,
        f: filter.get_u8_array().to_vec(),
    };

    let known_heads = [br.id];

    let remote_heads = [a6.id, a7.id];

    let mut synced_blocks_stream = public_overlay_cnx
        .sync_branch(remote_heads.to_vec(), known_heads.to_vec(), known_commits)
        .await
        .expect("sync_branch failed");

    let mut i = 0;
    while let Some(b) = synced_blocks_stream.next().await {
        log_debug!("GOT BLOCK {}", b.id());
        store.put(&b);
        i += 1;
    }

    log_debug!("SYNCED {} BLOCKS", i);

    log_debug!("LOCAL STORE HAS {} BLOCKS", store.get_len());

    // now the client can verify the DAG and each commit. Then update its list of heads.
}

async fn test(
    cnx: &mut impl BrokerConnection,
    pub_key: PubKey,
    priv_key: PrivKey,
) -> Result<(), ProtocolError> {
    cnx.add_user(PubKey::Ed25519PubKey([1; 32]), priv_key)
        .await?;

    cnx.add_user(pub_key, priv_key).await?;
    //.expect("add_user 2 (myself) failed");

    assert_eq!(
        cnx.add_user(PubKey::Ed25519PubKey([1; 32]), priv_key)
            .await
            .err()
            .unwrap(),
        ProtocolError::UserAlreadyExists
    );

    let repo = RepoLink::V0(RepoLinkV0 {
        id: PubKey::Ed25519PubKey([1; 32]),
        secret: SymKey::ChaCha20Key([0; 32]),
        peers: vec![],
    });
    let mut public_overlay_cnx = cnx.overlay_connect(&repo, true).await?;

    log_debug!("put_block");

    let my_block_id = public_overlay_cnx
        .put_block(&Block::new(
            vec![],
            ObjectDeps::ObjectIdList(vec![]),
            None,
            vec![27; 150],
            None,
        ))
        .await?;

    log_debug!("added block_id to store {}", my_block_id);

    let object_id = public_overlay_cnx
        .put_object(
            ObjectContent::File(File::V0(FileV0 {
                content_type: vec![],
                metadata: vec![],
                content: vec![48; 69000],
            })),
            vec![],
            None,
            block_size(),
            repo.id(),
            repo.secret(),
        )
        .await?;

    log_debug!("added object_id to store {}", object_id);

    let mut my_block_stream = public_overlay_cnx
        .get_block(my_block_id, true, None)
        .await?;
    //.expect("get_block failed");

    while let Some(b) = my_block_stream.next().await {
        log_debug!("GOT BLOCK {}", b.id());
    }

    let mut my_object_stream = public_overlay_cnx.get_block(object_id, true, None).await?;
    //.expect("get_block for object failed");

    while let Some(b) = my_object_stream.next().await {
        log_debug!("GOT BLOCK {}", b.id());
    }

    let object = public_overlay_cnx.get_object(object_id, None).await?;
    //.expect("get_object failed");

    log_debug!("GOT OBJECT with ID {}", object.id());

    // let object_id = public_overlay_cnx
    //     .copy_object(object_id, Some(now_timestamp() + 60))
    //     .await
    //     .expect("copy_object failed");

    // log_debug!("COPIED OBJECT to OBJECT ID {}", object_id);

    public_overlay_cnx.delete_object(object_id).await?;
    //.expect("delete_object failed");

    let res = public_overlay_cnx
        .get_object(object_id, None)
        .await
        .unwrap_err();

    log_debug!("result from get object after delete: {}", res);
    assert_eq!(res, ProtocolError::NotFound);

    //TODO test pin/unpin

    // TEST BRANCH SYNC

    test_sync(cnx, pub_key, priv_key).await;

    Ok(())
}

async fn test_local_connection() {
    log_debug!("===== TESTING LOCAL API =====");

    let root = tempfile::Builder::new().prefix("ngcli").tempdir().unwrap();
    let master_key: [u8; 32] = [0; 32];
    std::fs::create_dir_all(root.path()).unwrap();
    log_debug!("{}", root.path().to_str().unwrap());
    let store = LmdbKCVStore::open(root.path(), master_key);

    //let mut server = BrokerServer::new(store, ConfigMode::Local).expect("starting broker");

    let (priv_key, pub_key) = generate_keypair();

    // let mut cnx = server.local_connection(pub_key);

    // test(&mut cnx, pub_key, priv_key).await;
}

async fn test_remote_connection(url: &str) {
    log_debug!("===== TESTING REMOTE API =====");

    let (priv_key, pub_key) = generate_keypair();

    // open cnx

    // test(&mut cnx, pub_key, priv_key).await;
}

#[cfg(test)]
mod test {

    use crate::{test_local_connection, test_remote_connection};

    #[async_std::test]
    pub async fn test_local_cnx() {}

    use async_std::task;
    use ng_broker::server_ws::*;
    use ng_net::utils::gen_dh_keys;
    use ng_net::WS_PORT;
    use ng_repo::log::*;
    use ng_repo::types::PubKey;

    #[async_std::test]
    pub async fn test_remote_cnx() -> Result<(), Box<dyn std::error::Error>> {
        let keys = gen_dh_keys();
        // log_debug!("Public key of node: {:?}", keys.1);
        // log_debug!("Private key of node: {:?}", keys.0.as_slice());

        log_debug!("Public key of node: {}", keys.1);
        log_debug!("Private key of node: {}", keys.0);

        let thr = task::spawn(run_server_accept_one("127.0.0.1", WS_PORT, keys.0, pubkey));

        // time for the server to start
        std::thread::sleep(std::time::Duration::from_secs(2));

        test_remote_connection("ws://127.0.0.1:3012");

        thr.await;

        Ok(())
    }
}
