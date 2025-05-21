import { default as React, FunctionComponent } from "react";
import { useNextGraphAuth } from "./reactMethods";
import { SocialContactShapeType } from "./.ldo/contact.shapeTypes.ts";
import { useSubscribeToResource, useResource, useSubject } from "./reactMethods.ts";
import { StarIcon  } from '@heroicons/react/24/solid'
import { StarIcon as StarIconOutline, NoSymbolIcon } from '@heroicons/react/24/outline'

export const Contact: FunctionComponent = ({nuri}) => {
  const { session } = useNextGraphAuth();

  useResource(session.sessionId && nuri ? nuri : undefined, { subscribe: true });
  let contact = useSubject(SocialContactShapeType, session.sessionId && nuri ? nuri.substring(0,53) : undefined);

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

  const [skills, setSkills] = React.useState([
    0,
    0,
    5,
    3,
    1,
    2,
    4,
    0,
    0,
  ])

  React.useEffect(() => {
    console.log(contact.hasRating?.entries())
    let nextSkills = skills.map((s) => {
      return 0;
    });
    contact.hasRating?.map((r) => {
      nextSkills[ksp_mapping.indexOf(r.skill["@id"].substring(28))] = r.rated +1;
    });
    setSkills(nextSkills);
  }, [contact])

  if (!session.sessionId || !nuri) return <></>;
  
  function rate(skill: number, rating: number) {
    console.log("rate", skill, rating);
    
      const nextSkills = skills.map((s, i) => {
        if (i === skill) {
          if (s == rating) {
            s = s - 1;
          } else {
            s = rating;
          }
          return s;
        } else {
          return s;
        }
      });
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
            {JSON.stringify(contact.hasRating?.entries())}
          </span>
        </div>
        {
          skills.map(
            (skill,s) => 
              <div key={s} className="px-2 flex flex-row cursor-pointer text-yellow-500">
                {/* <NoSymbolIcon className="size-6"/> */}
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