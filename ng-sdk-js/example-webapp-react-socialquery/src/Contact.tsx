import { default as React, FunctionComponent } from "react";
import { useNextGraphAuth } from "./reactMethods";
import { SocialContactShapeType, HasRatingShapeType } from "./.ldo/contact.shapeTypes.ts";
import { useSubscribeToResource, useResource, useSubject, useLdo } from "./reactMethods.ts";
import { StarIcon  } from '@heroicons/react/24/solid'
import { StarIcon as StarIconOutline, NoSymbolIcon } from '@heroicons/react/24/outline'
import {
  startTransaction,
  transactionChanges,
  toSparqlUpdate,
  commitTransaction,
} from "@ldo/ldo";

export const Contact: FunctionComponent = ({nuri}) => {
  const { session } = useNextGraphAuth();
  const { createData, commitData, changeData, getResource } = useLdo();
  useResource(session.sessionId && nuri ? nuri : undefined, { subscribe: true });
  let contact = useSubject(SocialContactShapeType, session.sessionId && nuri ? nuri.substring(0,53) : undefined);
  //console.log(nuri)
  const ksp = "did:ng:k:skills:programming:";

  const ksp_mapping = [
    "svelte",
    "nextjs",
    "react",
    "vuejs",
    "tailwind",
    "rdf",
    "rust",
    "yjs",
    "automerge",
  ];

  const ksp_name = [
    "Svelte",
    "NextJS",
    "React",
    "VueJS",
    "Tailwind",
    "RDF/SPARQL",
    "Rust",
    "Yjs",
    "Automerge",
  ]

  const [skills, setSkills] = React.useState([ 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);

  React.useEffect(() => {
    //contact.hasRating?.map((r)=> {if (r.skill) console.log(r.rated,r.skill["@id"].substring(24))});
    let nextSkills = skills.map((s) => {
      return 0;
    });
    contact.hasRating?.map((r) => {
      nextSkills[ksp_mapping.indexOf(r.skill["@id"].substring(24))] = r.rated +1;
    });
    setSkills(nextSkills);
  }, [contact])

  if (!session.sessionId || !nuri) return <></>;
  
  async function rate(skill: number, rating: number) {
    const nextSkills = [...skills];
    const old = skills[skill];

    if (old == 0) {
      if (rating == 0) return; //shouldn't happen
      
      // we create a new rating
      nextSkills[skill] = rating;
      let re = getResource(nuri);
      let editing_contact = changeData(contact, re);
      editing_contact.hasRating.add({
        rated: rating-1,
        skill: {
          "@id": ksp + ksp_mapping[skill]
        }
      })
      let res = commitData(editing_contact);
      if (res.isError) {
        console.error(res.message);
      }
      
      // try {
      //   await session.ng.sparql_update(session.sessionId, `PREFIX xskills: <did:ng:x:skills#>
      //     PREFIX ksp: <did:ng:k:skills:programming:>
      //     PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
      //     INSERT { 
      //       <> xskills:hasRating [
      //         a xskills:Rating ;
      //         xskills:rated "${rating-1}"^^xsd:integer ;
      //         xskills:skill ksp:${ksp_mapping[skill]}
      //       ].
      //     } WHERE {}`, nuri);
      // } catch (e) {
      //   console.error(e)
      // }
    } else {
      if (old == rating) {
        nextSkills[skill] = rating - 1;
      } else {
        nextSkills[skill] = rating;
      }
      if (nextSkills[skill] == 0) {
        // we remove the rating

        let re = getResource(nuri);
        for (const r of contact.hasRating.values()) {
          if (r.skill["@id"].substring(24) === ksp_mapping[skill]) {
            let editing_contact = changeData(contact, re);
            editing_contact.hasRating?.delete(r);
            // let changes = transactionChanges(editing_contact);
            // console.log(changes.added?.toString())
            // console.log(changes.removed?.toString())
            let res = commitData(editing_contact);
            if (res.isError) {
              console.error(res.message);
            }
            let editing_rating = changeData(r, re);
            delete editing_rating["@id"];
            // changes = transactionChanges(editing_rating);
            // console.log(changes.added?.toString())
            // console.log(changes.removed?.toString())
            res = commitData(editing_rating);
            if (res.isError) {
              console.error(res.message);
            }
            break;
          }
        };

        // try { const s = `PREFIX xskills: <did:ng:x:skills#>
        //     PREFIX ksp: <did:ng:k:skills:programming:>
        //     PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
        //     DELETE { 
        //       <> xskills:hasRating ?rating.
        //       ?rating a xskills:Rating .
        //       ?rating xskills:skill ksp:${ksp_mapping[skill]} .
        //       ?rating xskills:rated "${old-1}"^^xsd:integer.
        //     } WHERE { <> xskills:hasRating ?rating .
        //               ?rating a xskills:Rating .
        //               ?rating xskills:skill ksp:${ksp_mapping[skill]}
        //     }`;
        //   await session.ng.sparql_update(session.sessionId, s, nuri);
        // } catch (e) {
        //   console.error(e)
        // }
      } else {
        // we update the rating
        try {

          let re = getResource(nuri);
          for (const r of contact.hasRating.values()) {
            if (r.skill["@id"].substring(24) === ksp_mapping[skill]) {
              let rating = changeData(r, re);
              rating.rated = nextSkills[skill]-1;
              const changes = transactionChanges(rating);
              console.log(changes.added?.toString())
              console.log(changes.removed?.toString())
              const res = commitData(rating);
              if (res.isError) {
                console.error(res.message);
              }
              break;
            }
          };

          // await session.ng.sparql_update(session.sessionId, `PREFIX xskills: <did:ng:x:skills#>
          //   PREFIX ksp: <did:ng:k:skills:programming:>
          //   PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
          //   DELETE { 
          //     ?rating xskills:rated "${old-1}"^^xsd:integer.
          //   } INSERT {
          //     ?rating xskills:rated "${nextSkills[skill]-1}"^^xsd:integer.
          //   }
          //     WHERE { <> xskills:hasRating ?rating .
          //             ?rating a xskills:Rating .
          //             ?rating xskills:skill ksp:${ksp_mapping[skill]}
          //   }`, nuri);
        } catch (e) {
          console.error(e)
        }
      }
    }
    setSkills(nextSkills);
  }

  return <>
    {contact.fn? ( 
      <div className="contact text-left flex flex-col" title={nuri}>
        <div className="name text-center"> 
          {contact.fn}
        </div>
        <div className="p-2">
          <span className="email">
            {contact.hasEmail}
          </span>
        </div>
        {
          skills.map(
            (skill,s) => 
              <div key={s} className="px-2 flex flex-row cursor-pointer text-yellow-500">
                {
                  [...Array(5)].map(
                    (e,i) => {
                      if (i + 1 <= skill) {
                        return <StarIcon key={s * 10 + i} onClick={()=>rate(s,i+1)} className="size-6"/>
                      } else {
                        return <StarIconOutline key={s * 10 + i} onClick={()=>rate(s,i+1)} className=" size-6"/>
                      }
                    }
                  )
                }
                <span className="text-black ml-2">{ksp_name[s]}</span>
              </div>
          )
        }
      </div>
    ) : <></>}
  </>;
};