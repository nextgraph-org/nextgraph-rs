import React, { FunctionComponent, useState } from 'react';
import { LifebuoyIcon } from '@heroicons/react/24/outline'
import { useLdo, dataset, useNextGraphAuth, useResource, useSubject} from './reactMethods';
import { SocialQueryShapeType } from "./.ldo/socialquery.shapeTypes.ts";
import { namedNode } from "@rdfjs/data-model";
import type { Quad } from "@rdfjs/types";
import type { DatasetChanges } from "@ldo/rdf-utils";
import './App.css'
import "../../../common/src/styles.css";

const query_string = `PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
PREFIX xskills: <did:ng:x:skills#>
PREFIX ksp: <did:ng:k:skills:programming:>
PREFIX ng: <did:ng:x:ng#>
CONSTRUCT { [
    vcard:hasEmail ?email;
    vcard:fn ?name;
    a vcard:Individual;
    ng:site ?public_profile;
    ng:protected ?protected_profile;
    xskills:hasRating [
      a xskills:Rating ;
      xskills:rated ?level;
      xskills:skill ?skill
    ]
  ]
}
WHERE { 
  ?contact a vcard:Individual.
  ?contact vcard:fn ?name.
  ?contact vcard:hasEmail ?email.
  OPTIONAL { ?contact ng:site ?public_profile . ?contact ng:site_inbox ?public_inbox }
  OPTIONAL { ?contact ng:protected ?protected_profile . ?contact ng:protected_inbox ?prot_inbox }
  ?contact xskills:hasRating [
    a xskills:Rating ;
    xskills:rated ?level;
    xskills:skill ?skill
  ].
  ?contact xskills:hasRating/xskills:skill ksp:rust.
  ?contact xskills:hasRating/xskills:skill ksp:svelte.
  FILTER ( ?skill IN (
  	ksp:rust, ksp:svelte, ksp:rdf, ksp:tailwind, ksp:yjs, ksp:automerge
  ) )
}`;

const ranking_query = `SELECT ?mail (SAMPLE(?n) as?name) (MAX(?rust_) as ?rust) (MAX(?svelte_) as ?svelte) (MAX(?tailwind_) as ?tailwind) 
(MAX(?rdf_) as ?rdf) (MAX(?yjs_) as ?yjs) (MAX(?automerge_) as ?automerge) (SUM(?total_) as ?total) 
WHERE { 
  { SELECT ?mail (SAMPLE(?name) as ?n) ?skill (AVG(?value)+1 AS ?score) 
    WHERE {
	    ?rating <http://www.w3.org/2006/vcard/ns#hasEmail> ?mail.
      ?rating <http://www.w3.org/2006/vcard/ns#fn> ?name.
	    ?rating <did:ng:x:skills#hasRating> ?hasrating.
	      ?hasrating <did:ng:x:skills#rated> ?value.
	      ?hasrating <did:ng:x:skills#skill> ?skill.
    } GROUP BY ?mail ?skill 
  }
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:rust>), ?score, 0) AS ?rust_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:svelte>), ?score, 0) AS ?svelte_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:tailwind>), ?score, 0) AS ?tailwind_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:rdf>), ?score, 0) AS ?rdf_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:yjs>), ?score, 0) AS ?yjs_)
  BIND (IF(sameTerm(?skill, <did:ng:k:skills:programming:automerge>), ?score, 0) AS ?automerge_)
  BIND (?tailwind_+?svelte_+?rust_+?rdf_+?yjs_+?automerge_ AS ?total_)
} GROUP BY ?mail
ORDER BY DESC(?total)`;

const Query: FunctionComponent = () => {

  const { createData, commitData, changeData } = useLdo();
  const { session } = useNextGraphAuth();

  const [resourceUri, setResourceUri] = useState("");
  useResource(resourceUri, { subscribe: true });
  const [nuri, setNuri] = useState("");
  const [querying, setQuerying] = useState(false);
  const [results, setResults] = useState([]);
  let social_query = useSubject(SocialQueryShapeType, session.sessionId && nuri ? nuri : undefined);

  React.useEffect(() => {
    
    async function start() {
        let res = await session.ng.app_request_with_nuri_command(nuri, {Fetch:"CurrentHeads"}, session.sessionId);
        let request_nuri = res.V0?.Text;
        console.log(request_nuri);

        // finally start the social query
        res = await session.ng.social_query_start(
            session.sessionId,
            "did:ng:a", 
            request_nuri,
            "did:ng:d:c", 
            0,
        );
    }
    
    if (social_query?.socialQuerySparql) {
        if (!social_query?.socialQueryForwarder) {
            console.log(social_query?.socialQuerySparql);
            start();
        } else {
            console.log("some results arrived")
            dataset.on(
                [null, null, null, namedNode(resourceUri)],
                (changes: DatasetChanges<Quad>) => {
                    session.ng.sparql_query(session.sessionId, ranking_query, undefined, resourceUri).then((res) => {
                        setResults(res.results?.bindings);
                    });
                },
            );
        }
    }
  }, [resourceUri, nuri, social_query, session])

  const openQuery = async () => {
    setQuerying(true);
    try {
        
        let resource = await dataset.createResource("nextgraph", { primaryClass: "social:query:skills:programming" });
        if (!resource.isError) {
            console.log("Created resource:", resource.uri);
            setResourceUri(resource.uri);
            setNuri(resource.uri.substring(0,53));
            const query = createData(
                SocialQueryShapeType,
                nuri,
                resource
                );
            query.type = { "@id": "SocialQuery" };
            const result = await commitData(query);
            if (result.isError) {
                console.error(result.message);
            }

            // then add the did:ng:x:ng#social_query_sparql
            //await session.ng.sparql_update(session.sessionId,`INSERT DATA { <${nuri}> <did:ng:x:ng#social_query_sparql> \"${query_string.replaceAll("\n"," ")}\".}`, resource.uri);
            let editing_query = changeData(query, resource);
            editing_query.socialQuerySparql = query_string.replaceAll("\n"," ");
            // const changes = transactionChanges(editing_query);
            // console.log(changes.added?.toString())
            // console.log(changes.removed?.toString())
            let res = await commitData(editing_query);
            if (res.isError) {
                console.error(result.message);
            }
        }
        else {
            console.error(resource);    
        }
      
    } catch (e) {
      console.error(e)
    }
  };

  if (!session.sessionId) return <></>;

  return (
    <div className="centered">
      <div className="flex flex-col justify-center gap-5 mt-10 mb-5">
        {!querying && <p className="p-3">
                <button
                onClick={openQuery}
                onKeyPress={openQuery}    
                className="button select-none ml-2 mt-2 mb-2 text-white bg-primary-700 hover:bg-primary-700/90 focus:ring-4 focus:ring-primary-500/50 rounded-lg text-base p-2 text-center inline-flex items-center dark:focus:ring-primary-700/55"
            >
                <LifebuoyIcon tabIndex={-1} className="mr-2 focus:outline-none size-6" />
                Start query
            </button>
            </p>
        }

        <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 table-auto">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" className="px-6 py-3">Email</th>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Rust</th>
                    <th scope="col" className="px-6 py-3">Svelte</th>
                    <th scope="col" className="px-6 py-3">Tailwind</th>
                    <th scope="col" className="px-6 py-3">Rdf</th>
                    <th scope="col" className="px-6 py-3">Yjs</th>
                    <th scope="col" className="px-6 py-3">Automerge</th>
                    <th scope="col" className="px-6 py-3">Total</th>
                </tr>
            </thead>
            <tbody>
                { 
                  results.map((res) => 
                    <tr key={res.mail.value} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{res.mail.value}</td>
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{res.name.value}</td>
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.rust.value * 10) / 10 }</td>
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.svelte.value * 10) / 10 }</td>
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.tailwind.value * 10) / 10 }</td>
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.rdf.value * 10) / 10 }</td>
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.yjs.value * 10) / 10 }</td>
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.automerge.value * 10) / 10 }</td>
                        <td scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{Math.round(res.total.value * 10) / 10 }</td>
                    </tr>
                  )
                }
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

export default Query
