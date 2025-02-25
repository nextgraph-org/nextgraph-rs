import asyncio
from nextgraph import wallet_open_with_mnemonic_words, doc_sparql_update, disconnect_and_close

async def main():
    wallet_session = await wallet_open_with_mnemonic_words(
        "/Users/nl/Downloads/wallet-Hr-UITwGtjE1k6lXBoVGzD4FQMiDkM3T6bSeAi9PXt4A.ngw", 
        ["jealous",
        "during",
        "elevator",
        "swallow",
        "pen",
        "phone",
        "like",
        "employ",
        "myth",
        "remember",
        "question",
        "lemon"],
        [2, 3, 2, 3])
    wallet_name = wallet_session[0]
    session_info = wallet_session[1]
    print(wallet_name)
    print(session_info)
    await doc_sparql_update(session_info["session_id"], 
        "INSERT DATA { <did:ng:_> <example:predicate> \"An example value16\". }",
        "did:ng:o:Dn0QpE9_4jhta1mUWRl_LZh1SbXUkXfOB5eu38PNIk4A:v:Z4ihjV3KMVIqBxzjP6hogVLyjkZunLsb7MMsCR0kizQA")
    await disconnect_and_close(session_info["user"], wallet_name)

asyncio.run(main())