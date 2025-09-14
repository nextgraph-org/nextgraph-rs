/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { TestData } from "./testData.js";

/**
 * Activity Pub
 */
export const activityPub: TestData = {
  name: "activity pub",
  shexc: `
  # ----------------------------------------------------
  # Shex (https://shex.io) shapes based on the activity
  # streams spec (https://www.w3.org/TR/activitystreams-vocabulary)
  # ----------------------------------------------------
  
  PREFIX sra: <https://shaperepo.com/schemas/activitystreams#>
  PREFIX as: <https://www.w3.org/ns/activitystreams#>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  
  # ----------------------------------------------------
  # Object
  # ----------------------------------------------------
  sra:ActivityPubObject EXTRA a {
    $sra:ObjectShape (
      a [ as:Object ]
        // rdfs:comment  "Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection." ;
  
      (as:attachment @sra:ActivityPubObject * ; as:attachment @sra:Link *)
        // rdfs:comment "Identifies a resource attached or related to an object that potentially requires special handling. The intent is to provide a model that is at least semantically similar to attachments in email." ;
  
      (as:attributedTo @sra:ActivityPubObject ; as:attributedTo @sra:Link *)
        // rdfs:comment "Identifies one or more entities to which this object is attributed. The attributed entities might not be Actors. For instance, an object might be attributed to the completion of another activity." ;
  
      (as:audience @sra:ActivityPubObject * ; as:audience @sra:Link *)
        // rdfs:comment "Identifies one or more entities that represent the total population of entities for which the object can considered to be relevant." ;
  
      (as:content xsd:string * ; as:content rdf:langString *)
        // rdfs:comment "The content or textual representation of the Object encoded as a JSON string. By default, the value of content is HTML. The mediaType property can be used in the object to indicate a different content type. The content MAY be expressed using multiple language-tagged values. " ;
      
      (as:context @sra:ActivityPubObject * ; as:context @sra:Link *)
        // rdfs:comment "Identifies the context within which the object exists or an activity was performed. The notion of \\"context\\" used is intentionally vague. The intended function is to serve as a means of grouping objects and activities that share a common originating context or purpose. An example could be all activities relating to a common project or event." ;
  
      (as:name xsd:string * ; as:name rdf:langString *)
        // rdfs:comment "A simple, human-readable, plain-text name for the object. HTML markup MUST NOT be included. The name MAY be expressed using multiple language-tagged values." ;
      
      as:endTime xsd:dateTime ?
        // rdfs:comment "The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude." ;
      
      (as:generator @sra:ActivityPubObject * ; as:generator @sra:Link *)
        // rdfs:comment "Identifies the entity (e.g. an application) that generated the object. " ;
      
      (as:icon @sra:Image * ; as:icon @sra:Link *)
        // rdfs:comment "Indicates an entity that describes an icon for this object. The image should have an aspect ratio of one (horizontal) to one (vertical) and should be suitable for presentation at a small size." ;
      
      (as:image @sra:Image * ; as:image @sra:Link *)
        // rdfs:comment "Indicates an entity that describes an image for this object. Unlike the icon property, there are no aspect ratio or display size limitations assumed." ;
      
      (as:inReplyTo @sra:ActivityPubObject * ; as:inReplyTo @sra:Link *)
        // rdfs:comment "Indicates one or more entities for which this object is considered a response." ;
      
      (as:location @sra:ActivityPubObject * ; as:location @sra:Link *)
        // rdfs:comment "Indicates one or more physical or logical locations associated with the object." ;
      
      (as:preview @sra:ActivityPubObject * ; as:preview @sra:Link *)
        // rdfs:comment "Identifies an entity that provides a preview of this object." ;
      
      as:published xsd:dateTime ?
        // rdfs:comment "The date and time at which the object was published" ;
      
      as:replies @sra:Collection ?
        // rdfs:comment "Identifies a Collection containing objects considered to be responses to this object." ;
      
      as:startTime xsd:dateTime ?
        // rdfs:comment "The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin." ;
      
      (as:summary xsd:string * ; as:summary rdf:langString *)
        // rdfs:comment "A natural language summarization of the object encoded as HTML. Multiple language tagged summaries MAY be provided." ;
      
      (as:tag @sra:ActivityPubObject * ; as:tag @sra:Link *)
        // rdfs:comment "One or more \\"tags\\" that have been associated with an objects. A tag can be any kind of Object. The key difference between attachment and tag is that the former implies association by inclusion, while the latter implies associated by reference." ;
      
      as:updated xsd:dateTime ?
        // rdfs:comment "The date and time at which the object was updated" ;
      
      (as:url xsd:anyURI * ; as:url @sra:Link *)
        // rdfs:comment "Identifies one or more links to representations of the object" ;
      
      (as:to @sra:ActivityPubObject * ; as:to @sra:Link *)
        // rdfs:comment "Identifies an entity considered to be part of the public primary audience of an Object" ;
      
      (as:bto @sra:ActivityPubObject * ; as:bto @sra:Link *)
        // rdfs:comment "Identifies an Object that is part of the private primary audience of this Object." ;
      
      (as:cc @sra:ActivityPubObject * ; as:cc @sra:Link *)
        // rdfs:comment "Identifies an Object that is part of the public secondary audience of this Object." ;
      
      (as:bcc @sra:ActivityPubObject * ; as:bcc @sra:Link *)
        // rdfs:comment "Identifies one or more Objects that are part of the private secondary audience of this Object." ;
      
      as:mediaType xsd:string ?
        // rdfs:comment "When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content." ;
      
      as:duration xsd:duration ?
        // rdfs:comment "When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object's approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as \\"PT5S\\")." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Link
  # ----------------------------------------------------
  sra:Link EXTRA a {
    $sra:LinkShape (
      a [ as:Link ]
        // rdfs:comment "A Link is an indirect, qualified reference to a resource identified by a URL. The fundamental model for links is established by [ RFC5988]. Many of the properties defined by the Activity Vocabulary allow values that are either instances of Object or Link. When a Link is used, it establishes a qualified relation connecting the subject (the containing object) to the resource identified by the href. Properties of the Link are properties of the reference as opposed to properties of the resource." ;
  
      as:href xsd:anyURI ?
        // rdfs:comment "The target resource pointed to by a Link." ;
  
      as:rel xsd:string *
        // rdfs:comment "A link relation associated with a Link. The value MUST conform to both the [HTML5] and [RFC5988] \\"link relation\\" definitions. In the [HTML5], any string not containing the \\"space\\" U+0020, \\"tab\\" (U+0009), \\"LF\\" (U+000A), \\"FF\\" (U+000C), \\"CR\\" (U+000D) or \\",\\" (U+002C) characters can be used as a valid link relation." ;
  
      as:mediaType xsd:string ?
        // rdfs:comment "When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content." ;
  
      (as:name xsd:string * ; as:name rdf:langString *)
        // rdfs:comment "A simple, human-readable, plain-text name for the object. HTML markup MUST NOT be included. The name MAY be expressed using multiple language-tagged values." ;
      
      as:hreflang xsd:string ?
        // rdfs:comment "Hints as to the language used by the target resource. Value MUST be a [BCP47] Language-Tag." ;
  
      as:height xsd:nonNegativeInteger ?
        // rdfs:comment "On a Link, specifies a hint as to the rendering height in device-independent pixels of the linked resource." ;
  
      as:width xsd:nonNegativeInteger ?
        // rdfs:comment "On a Link, specifies a hint as to the rendering width in device-independent pixels of the linked resource." ;
  
      (as:preview @sra:ActivityPubObject * ; as:preview @sra:Link *)
        // rdfs:comment "Identifies an entity that provides a preview of this object." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Activity
  # ----------------------------------------------------
  sra:Activity EXTRA a {
    $sra:ActivityShape (
      &sra:ObjectShape ;
      a [ as:Activity ]
        // rdfs:comment "An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken." ;
      
      (as:actor @sra:ActivityPubObject * ; as:actor @sra:Link *)
        // rdfs:comment "Describes one or more entities that either performed or are expected to perform the activity. Any single activity can have multiple actors. The actor MAY be specified using an indirect Link." ;
  
      (as:object @sra:ActivityPubObject * ; as:object @sra:Link *)
        // rdfs:comment "When used within an Activity, describes the direct object of the activity. For instance, in the activity \\"John added a movie to his wishlist\\", the object of the activity is the movie added. When used within a Relationship describes the entity to which the subject is related." ;
  
      (as:target @sra:ActivityPubObject * ; as:target @sra:Link *)
        // rdfs:comment "Describes the indirect object, or target, of the activity. The precise meaning of the target is largely dependent on the type of action being described but will often be the object of the English preposition \\"to\\". For instance, in the activity \\"John added a movie to his wishlist\\", the target of the activity is John's wishlist. An activity can have more than one target." ;
  
      (as:result @sra:ActivityPubObject * ; as:result @sra:Link *)
        // rdfs:comment "Describes the result of the activity. For instance, if a particular action results in the creation of a new resource, the result property can be used to describe that new resource." ;
  
      (as:origin @sra:ActivityPubObject * ; as:origin @sra:Link *)
        // rdfs:comment "Describes an indirect object of the activity from which the activity is directed. The precise meaning of the origin is the object of the English preposition \\"from\\". For instance, in the activity \\"John moved an item to List B from List A\\", the origin of the activity is \\"List A\\". " ;
  
      (as:instrument @sra:ActivityPubObject * ; as:instrument @sra:Link *)
        // rdfs:comment "Identifies one or more objects used (or to be used) in the completion of an Activity." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Intransitive Activity
  # ----------------------------------------------------
  sra:InstransitiveActivity EXTRA a {
    $sra:IntransitiveActivityShape (
      &sra:ActivityShape ;
      a [ as:IntransitiveActivity ]
        // rdfs:comment "Instances of IntransitiveActivity are a subtype of Activity representing intransitive actions. The object property is therefore inappropriate for these activities." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Collection
  # ----------------------------------------------------
  sra:Collection EXTRA a {
    $sra:CollectionShape (
      &sra:ObjectShape ;
      a [ as:Collection ]
        // rdfs:comment "A Collection is a subtype of Object that represents ordered or unordered sets of Object or Link instances. Refer to the Activity Streams 2.0 Core specification for a complete description of the Collection type. " ;
      
      as:totalItems xsd:nonNegativeInteger ?
        // rdfs:comment "A non-negative integer specifying the total number of objects contained by the logical view of the collection. This number might not reflect the actual number of items serialized within the Collection object instance." ;
  
      (as:current @sra:CollectionPage ? | as:current @sra:Link ?)
        // rdfs:comment "In a paged Collection, indicates the page that contains the most recently updated member items." ;
  
      (as:first @sra:CollectionPage ? | as:first @sra:Link ?)
        // rdfs:comment "In a paged Collection, indicates the furthest preceeding page of items in the collection." ;
  
      (as:last @sra:CollectionPage ? | as:last @sra:Link ?)
        // rdfs:comment "In a paged Collection, indicates the furthest proceeding page of the collection." ;
  
      (as:items @sra:ActivityPubObject * ; as:items @sra:Link *)
        // rdfs:comment "Identifies the items contained in a collection. The items might be ordered or unordered. " ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Ordered Collection
  # ----------------------------------------------------
  sra:OrderedCollection EXTRA a {
    $sra:OrderedCollectionShape (
      &sra:CollectionShape ;
      a [ as:OrderedCollection ]
        // rdfs:comment "A subtype of Collection in which members of the logical collection are assumed to always be strictly ordered." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Collection Page
  # ----------------------------------------------------
  sra:CollectionPage EXTRA a {
    $sra:CollectionPageShape (
      &sra:CollectionShape ;
      a [ as:CollectionPage ]
        // rdfs:comment "Used to represent distinct subsets of items from a Collection. Refer to the Activity Streams 2.0 Core for a complete description of the CollectionPage object." ;
      
      (as:partOf @sra:Link ? | as:partOf @sra:Collection ?)
        // rdfs:comment "Identifies the Collection to which a CollectionPage objects items belong." ;
  
      (as:next @sra:CollectionPage ? | as:next @sra:Link ?)
        // rdfs:comment "In a paged Collection, indicates the next page of items." ;
  
      (as:prev @sra:CollectionPage ? | as:next @sra:Link ?)
        // rdfs:comment "In a paged Collection, identifies the previous page of items." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Ordered Collection Page
  # ----------------------------------------------------
  sra:OrderedCollectionPage EXTRA a {
    $sra:OrderedCollectionPageShape (
      &sra:OrderedCollectionShape ;
      a [ as:OrderedCollectionPage ]
        // rdfs:comment "Used to represent ordered subsets of items from an OrderedCollection. Refer to the Activity Streams 2.0 Core for a complete description of the OrderedCollectionPage object." ;
      
      as:startIndex xsd:nonNegativeInteger ?
        // rdfs:comment "A non-negative integer value identifying the relative position within the logical view of a strictly ordered collection."
    ) ;
  }
  
  # ----------------------------------------------------
  # Accept
  # ----------------------------------------------------
  sra:Accept EXTRA a {
    $sra:AcceptShape (
      &sra:ActivityShape ;
      a [ as:Accept ]
        // rdfs:comment "Indicates that the actor accepts the object. The target property can be used in certain circumstances to indicate the context into which the object has been accepted." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # TentativeAccept
  # ----------------------------------------------------
  sra:TentativeAccept EXTRA a {
    $sra:TentativeAcceptShape (
      &sra:AcceptShape ;
      a [ as:TentativeAccept ]
        // rdfs:comment "A specialization of Accept indicating that the acceptance is tentative." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Add
  # ----------------------------------------------------
  sra:Add EXTRA a {
    $sra:AddShape (
      &sra:ActivityShape ;
      a [ as:Add ]
        // rdfs:comment "Indicates that the actor has added the object to the target. If the target property is not explicitly specified, the target would need to be determined implicitly by context. The origin can be used to identify the context from which the object originated. " ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Arrive
  # ----------------------------------------------------
  sra:Arrive EXTRA a {
    $sra:ArriveShape (
      &sra:IntransitiveActivityShape ;
      a [ as:Arrive ]
        // rdfs:comment "An IntransitiveActivity that indicates that the actor has arrived at the location. The origin can be used to identify the context from which the actor originated. The target typically has no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Create
  # ----------------------------------------------------
  sra:Create EXTRA a {
    $sra:CreateShape (
      &sra:ActivityShape ;
      a [ as:Create ]
        // rdfs:comment "Indicates that the actor has created the object." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Delete
  # ----------------------------------------------------
  sra:Delete EXTRA a {
    $sra:DeleteShape (
      &sra:ActivityShape ;
      a [ as:Delete ]
        // rdfs:comment "Indicates that the actor has deleted the object. If specified, the origin indicates the context from which the object was deleted." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Follow
  # ----------------------------------------------------
  sra:Follow EXTRA a {
    $sra:FollowShape (
      &sra:ActivityShape ;
      a [ as:Follow ]
        // rdfs:comment "Indicates that the actor is \\"following\\" the object. Following is defined in the sense typically used within Social systems in which the actor is interested in any activity performed by or on the object. The target and origin typically have no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Ignore
  # ----------------------------------------------------
  sra:Ignore EXTRA a {
    $sra:IgnoreShape (
      &sra:ActivityShape ;
      a [ as:Ignore ]
        // rdfs:comment "Indicates that the actor is ignoring the object. The target and origin typically have no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Join
  # ----------------------------------------------------
  sra:Join EXTRA a {
    $sra:JoinShape (
      &sra:ActivityShape ;
      a [ as:Join ]
        // rdfs:comment "Indicates that the actor has joined the object. The target and origin typically have no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Leave
  # ----------------------------------------------------
  sra:Leave EXTRA a {
    $sra:LeaveShape (
      &sra:ActivityShape ;
      a [ as:Leave ]
        // rdfs:comment "Indicates that the actor has left the object. The target and origin typically have no meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Like
  # ----------------------------------------------------
  sra:Like EXTRA a {
    $sra:LikeShape (
      &sra:ActivityShape ;
      a [ as:Like ]
        // rdfs:comment "Indicates that the actor likes, recommends or endorses the object. The target and origin typically have no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Offer
  # ----------------------------------------------------
  sra:Offer EXTRA a {
    $sra:OfferShape (
      &sra:ActivityShape ;
      a [ as:Offer ]
        // rdfs:comment "Indicates that the actor is offering the object. If specified, the target indicates the entity to which the object is being offered." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Invite
  # ----------------------------------------------------
  sra:Invite EXTRA a {
    $sra:InviteShape (
      &sra:OfferShape ;
      a [ as:Invite ]
        // rdfs:comment "A specialization of Offer in which the actor is extending an invitation for the object to the target." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Reject
  # ----------------------------------------------------
  sra:Reject EXTRA a {
    $sra:RejectShape (
      &sra:ActivityShape ;
      a [ as:Reject ]
        // rdfs:comment "Indicates that the actor is rejecting the object. The target and origin typically have no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # TentativeReject
  # ----------------------------------------------------
  sra:TentativeReject EXTRA a {
    $sra:TentativeRejectShape (
      &sra:RejectShape ;
      a [ as:TentativeReject ]
        // rdfs:comment "A specialization of Reject in which the rejection is considered tentative." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Remove
  # ----------------------------------------------------
  sra:Remove EXTRA a {
    $sra:RemoveShape (
      &sra:ActivityShape ;
      a [ as:Remove ]
        // rdfs:comment "Indicates that the actor is removing the object. If specified, the origin indicates the context from which the object is being removed." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Undo
  # ----------------------------------------------------
  sra:Undo EXTRA a {
    $sra:UndoShape (
      &sra:ActivityShape ;
      a [ as:Undo ]
        // rdfs:comment " Indicates that the actor is undoing the object. In most cases, the object will be an Activity describing some previously performed action (for instance, a person may have previously \\"liked\\" an article but, for whatever reason, might choose to undo that like at some later point in time). The target and origin typically have no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Update
  # ----------------------------------------------------
  sra:Update EXTRA a {
    $sra:UpdateShape (
      &sra:ActivityShape ;
      a [ as:Update ]
        // rdfs:comment "Indicates that the actor has updated the object. Note, however, that this vocabulary does not define a mechanism for describing the actual set of modifications made to object. The target and origin typically have no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # View
  # ----------------------------------------------------
  sra:View EXTRA a {
    $sra:ViewShape (
      &sra:ActivityShape ;
      a [ as:View ]
        // rdfs:comment "Indicates that the actor has viewed the object." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Listen
  # ----------------------------------------------------
  sra:Listen EXTRA a {
    $sra:ListenShape (
      &sra:ActivityShape ;
      a [ as:Listen ]
        // rdfs:comment "Indicates that the actor has listened to the object." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Read
  # ----------------------------------------------------
  sra:Read EXTRA a {
    $sra:ReadShape (
      &sra:ActivityShape ;
      a [ as:Read ]
        // rdfs:comment "Indicates that the actor has read the object." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Move
  # ----------------------------------------------------
  sra:Move EXTRA a {
    $sra:MoveShape (
      &sra:ActivityShape ;
      a [ as:Move ]
        // rdfs:comment "Indicates that the actor has moved object from origin to target. If the origin or target are not specified, either can be determined by context." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Travel
  # ----------------------------------------------------
  sra:Travel EXTRA a {
    $sra:TravelShape (
      &sra:IntransitiveActivityShape ;
      a [ as:Travel ]
        // rdfs:comment "Indicates that the actor is traveling to target from origin. Travel is an IntransitiveObject whose actor specifies the direct object. If the target or origin are not specified, either can be determined by context." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Announce
  # ----------------------------------------------------
  sra:Announce EXTRA a {
    $sra:AnnounceShape (
      &sra:ActivityShape ;
      a [ as:Announce ]
        // rdfs:comment "Indicates that the actor is calling the target's attention the object. The origin typically has no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Block
  # ----------------------------------------------------
  sra:Block EXTRA a {
    $sra:BlockShape (
      &sra:IgnoreShape ;
      a [ as:Block ]
        // rdfs:comment "Indicates that the actor is blocking the object. Blocking is a stronger form of Ignore. The typical use is to support social systems that allow one user to block activities or content of other users. The target and origin typically have no defined meaning." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Flag
  # ----------------------------------------------------
  sra:Flag EXTRA a {
    $sra:FlagShape (
      &sra:ActivityShape ;
      a [ as:Flag ]
        // rdfs:comment "Indicates that the actor is \\"flagging\\" the object. Flagging is defined in the sense common to many social platforms as reporting content as being inappropriate for any number of reasons." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Dislike
  # ----------------------------------------------------
  sra:Dislike EXTRA a {
    $sra:DislikeShape (
      &sra:ActivityShape ;
      a [ as:Dislike ]
        // rdfs:comment "Indicates that the actor dislikes the object." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Question
  # ----------------------------------------------------
  sra:Question EXTRA a {
    $sra:QuestionShape (
      &sra:IntransitiveActivityShape ;
      a [ as:Question ]
        // rdfs:comment " Represents a question being asked. Question objects are an extension of IntransitiveActivity. That is, the Question object is an Activity, but the direct object is the question itself and therefore it would not contain an object property. Either of the anyOf and oneOf properties MAY be used to express possible answers, but a Question object MUST NOT have both properties. " ;
  
      (
        (as:oneOf @sra:ActivityPubObject * ; as:oneOf @sra:Link *)
          // rdfs:comment " Identifies an exclusive option for a Question. Use of oneOf implies that the Question can have only a single answer. To indicate that a Question can have multiple answers, use anyOf." |
        (as:anyOf @sra:ActivityPubObject * ; as:anyOf @sra:Link *)
          // rdfs:comment " Identifies an inclusive option for a Question. Use of anyOf implies that the Question can have multiple answers. To indicate that a Question can have only one answer, use oneOf."
      ) ;
  
      (as:closed @sra:ActivityPubObject * ; as:closed @sra:Link * ; as:closed xsd:dateTime ? ; as:closed xsd:boolean)
        // rdfs:comment "Indicates that a question has been closed, and answers are no longer accepted." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Application
  # ----------------------------------------------------
  sra:Application EXTRA a {
    $sra:ApplicationShape (
      &sra:ObjectShape ;
      a [ as:Application ]
        // rdfs:comment "Describes a software application." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Group
  # ----------------------------------------------------
  sra:Group EXTRA a {
    $sra:GroupShape (
      &sra:ObjectShape ;
      a [ as:Group ]
        // rdfs:comment "Represents a formal or informal collective of Actors." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Organization
  # ----------------------------------------------------
  sra:Organization EXTRA a {
    $sra:OrganizationShape (
      &sra:ObjectShape ;
      a [ as:Organization ]
        // rdfs:comment "Represents an organization." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Person
  # ----------------------------------------------------
  sra:Person EXTRA a {
    $sra:PersonShape (
      &sra:ObjectShape ;
      a [ as:Person ]
        // rdfs:comment "Represents an individual person." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Service
  # ----------------------------------------------------
  sra:Service EXTRA a {
    $sra:ServiceShape (
      &sra:ObjectShape ;
      a [ as:Service ]
        // rdfs:comment "Represents a service of any kind." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Relationship
  # ----------------------------------------------------
  sra:Relationship EXTRA a {
    $sra:RelationshipShape (
      &sra:ObjectShape ;
      a [ as:Relationship ]
        // rdfs:comment " Describes a relationship between two individuals. The subject and object properties are used to identify the connected individuals. See 5.2 Representing Relationships Between Entities for additional information. " ;
      
      (as:subject @sra:ActivityPubObject ? | as:subject @sra:Link ?)
        // rdfs:comment "On a Relationship object, the subject property identifies one of the connected individuals. For instance, for a Relationship object describing \\"John is related to Sally\\", subject would refer to John." ;
      
      (as:object @sra:ActivityPubObject ? | as:object @sra:Link ?)
        // rdfs:comment "When used within an Activity, describes the direct object of the activity. For instance, in the activity \\"John added a movie to his wishlist\\", the object of the activity is the movie added. When used within a Relationship describes the entity to which the subject is related." ;
  
      as:relationship @sra:ActivityPubObject *
        // rdfs:comment "On a Relationship object, the relationship property identifies the kind of relationship that exists between subject and object."
    ) ;
  }
  
  # ----------------------------------------------------
  # Article
  # ----------------------------------------------------
  sra:Article EXTRA a {
    $sra:ArticleShape (
      &sra:ObjectShape ;
      a [ as:Article ]
        // rdfs:comment "Represents any kind of multi-paragraph written work." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Document
  # ----------------------------------------------------
  sra:Document EXTRA a {
    $sra:DocumentShape (
      &sra:ObjectShape ;
      a [ as:Document ]
        // rdfs:comment "Represents a document of any kind." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Audio
  # ----------------------------------------------------
  sra:Audio EXTRA a {
    $sra:AudioShape (
      &sra:DocumentShape ;
      a [ as:Audio ]
        // rdfs:comment "Represents an audio document of any kind." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Image
  # ----------------------------------------------------
  sra:Image EXTRA a {
    $sra:ImageShape (
      &sra:DocumentShape ;
      a [ as:Image ]
        // rdfs:comment "An image document of any kind" ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Video
  # ----------------------------------------------------
  sra:Video EXTRA a {
    $sra:VideoShape (
      &sra:DocumentShape ;
      a [ as:Video ]
        // rdfs:comment "Represents a video document of any kind. " ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Note
  # ----------------------------------------------------
  sra:Note EXTRA a {
    $sra:NoteShape (
      &sra:ObjectShape ;
      a [ as:Note ]
        // rdfs:comment "Represents a short written work typically less than a single paragraph in length." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Page
  # ----------------------------------------------------
  sra:Page EXTRA a {
    $sra:PageShape (
      &sra:DocumentShape ;
      a [ as:Page ]
        // rdfs:comment "Represents a Web Page." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Event
  # ----------------------------------------------------
  sra:Event EXTRA a {
    $sra:EventShape (
      &sra:ObjectShape ;
      a [ as:Event ]
        // rdfs:comment "Represents any kind of event." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Place
  # ----------------------------------------------------
  sra:Place EXTRA a {
    $sra:PlaceShape (
      &sra:ObjectShape ;
      a [ as:Place ]
        // rdfs:comment "Represents a logical or physical location. See 5.3 Representing Places for additional information." ;
  
      as:accuracy xsd:float ?
        // rdfs:comment "Indicates the accuracy of position coordinates on a Place objects. Expressed in properties of percentage. e.g. \\"94.0\\" means \\"94.0% accurate\\"." ;
  
      as:altitude xsd:float ?
        // rdfs:comment "Indicates the altitude of a place. The measurement units is indicated using the units property. If units is not specified, the default is assumed to be \\"m\\" indicating meters. " ;
      
      as:latitude xsd:float ?
        // rdfs:comment "The latitude of a place" ;
  
      as:latitude xsd:float ?
        // rdfs:comment "The longitude of a place" ;
  
      as:radius xsd:float ?
        // rdfs:comment "The radius from the given latitude and longitude for a Place. The units is expressed by the units property. If units is not specified, the default is assumed to be \\"m\\" indicating \\"meters\\"." ;
      
      (as:unit ["cm"^^xsd:string "feet"^^xsd:string "inches"^^xsd:string "km"^^xsd:string "m"^^xsd:string "miles"^^xsd:string ] ? | as:unit xsd:anyURI)
        // rdfs:comment "Specifies the measurement units for the radius and altitude properties on a Place object. If not specified, the default is assumed to be \\"m\\" for \\"meters\\"." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Mention
  # ----------------------------------------------------
  sra:Mention EXTRA a {
    $sra:MentionShape (
      &sra:LinkShape ;
      a [ as:Mention ]
        // rdfs:comment "A specialized Link that represents an @mention." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Profile
  # ----------------------------------------------------
  sra:Profile EXTRA a {
    $sra:ProfileShape (
      &sra:ObjectShape ;
      a [ as:Profile ]
        // rdfs:comment "A Profile is a content object that describes another Object, typically used to describe Actor Type objects. The describes property is used to reference the object being described by the profile." ;
      
      as:describes @sra:ActivityPubObject ?
        // rdfs:comment "On a Profile object, the describes property identifies the object described by the Profile." ;
    ) ;
  }
  
  # ----------------------------------------------------
  # Tombstone
  # ----------------------------------------------------
  sra:Tombstone EXTRA a {
    $sra:TombstoneShape (
      &sra:ObjectShape ;
      a [ as:Tombstone ]
        // rdfs:comment "A Tombstone represents a content object that has been deleted. It can be used in Collections to signify that there used to be an object at this position, but it has been deleted." ;
      
      as:formerType @sra:ActivityPubObject *
        // rdfs:comment "On a Tombstone object, the formerType property identifies the type of the object that was deleted." ;
  
      as:deleted xsd:dateTime ?
        // rdfs:comment "On a Tombstone object, the deleted property is a timestamp for when the object was deleted." ;
    ) ;
  }
  `,
  sampleTurtle: "",
  baseNode: "",
  successfulContext: {
    type: {
      "@id": "@type",
      "@isCollection": true,
    },
    Object: {
      "@id": "https://www.w3.org/ns/activitystreams#Object",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    attachment: {
      "@id": "https://www.w3.org/ns/activitystreams#attachment",
      "@type": "@id",
      "@isCollection": true,
    },
    Link: {
      "@id": "https://www.w3.org/ns/activitystreams#Link",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        href: {
          "@id": "https://www.w3.org/ns/activitystreams#href",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
        },
        rel: {
          "@id": "https://www.w3.org/ns/activitystreams#rel",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        hreflang: {
          "@id": "https://www.w3.org/ns/activitystreams#hreflang",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        height: {
          "@id": "https://www.w3.org/ns/activitystreams#height",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
        width: {
          "@id": "https://www.w3.org/ns/activitystreams#width",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    href: {
      "@id": "https://www.w3.org/ns/activitystreams#href",
      "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
    },
    rel: {
      "@id": "https://www.w3.org/ns/activitystreams#rel",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
      "@isCollection": true,
    },
    mediaType: {
      "@id": "https://www.w3.org/ns/activitystreams#mediaType",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    name: {
      "@id": "https://www.w3.org/ns/activitystreams#name",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
      "@isCollection": true,
    },
    hreflang: {
      "@id": "https://www.w3.org/ns/activitystreams#hreflang",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    height: {
      "@id": "https://www.w3.org/ns/activitystreams#height",
      "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    },
    width: {
      "@id": "https://www.w3.org/ns/activitystreams#width",
      "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    },
    preview: {
      "@id": "https://www.w3.org/ns/activitystreams#preview",
      "@type": "@id",
      "@isCollection": true,
    },
    attributedTo: {
      "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
      "@type": "@id",
      "@isCollection": true,
    },
    audience: {
      "@id": "https://www.w3.org/ns/activitystreams#audience",
      "@type": "@id",
      "@isCollection": true,
    },
    content: {
      "@id": "https://www.w3.org/ns/activitystreams#content",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
      "@isCollection": true,
    },
    context: {
      "@id": "https://www.w3.org/ns/activitystreams#context",
      "@type": "@id",
      "@isCollection": true,
    },
    endTime: {
      "@id": "https://www.w3.org/ns/activitystreams#endTime",
      "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
    },
    generator: {
      "@id": "https://www.w3.org/ns/activitystreams#generator",
      "@type": "@id",
      "@isCollection": true,
    },
    icon: {
      "@id": "https://www.w3.org/ns/activitystreams#icon",
      "@type": "@id",
      "@isCollection": true,
    },
    Document: {
      "@id": "https://www.w3.org/ns/activitystreams#Document",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Image: {
      "@id": "https://www.w3.org/ns/activitystreams#Image",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    image: {
      "@id": "https://www.w3.org/ns/activitystreams#image",
      "@type": "@id",
      "@isCollection": true,
    },
    inReplyTo: {
      "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
      "@type": "@id",
      "@isCollection": true,
    },
    location: {
      "@id": "https://www.w3.org/ns/activitystreams#location",
      "@type": "@id",
      "@isCollection": true,
    },
    published: {
      "@id": "https://www.w3.org/ns/activitystreams#published",
      "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
    },
    replies: {
      "@id": "https://www.w3.org/ns/activitystreams#replies",
      "@type": "@id",
    },
    Collection: {
      "@id": "https://www.w3.org/ns/activitystreams#Collection",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        totalItems: {
          "@id": "https://www.w3.org/ns/activitystreams#totalItems",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
        items: {
          "@id": "https://www.w3.org/ns/activitystreams#items",
          "@type": "@id",
          "@isCollection": true,
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    totalItems: {
      "@id": "https://www.w3.org/ns/activitystreams#totalItems",
      "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    },
    current: {
      "@id": "https://www.w3.org/ns/activitystreams#current",
      "@type": "@id",
    },
    CollectionPage: {
      "@id": "https://www.w3.org/ns/activitystreams#CollectionPage",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        totalItems: {
          "@id": "https://www.w3.org/ns/activitystreams#totalItems",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
        items: {
          "@id": "https://www.w3.org/ns/activitystreams#items",
          "@type": "@id",
          "@isCollection": true,
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    partOf: {
      "@id": "https://www.w3.org/ns/activitystreams#partOf",
      "@type": "@id",
    },
    next: {
      "@id": "https://www.w3.org/ns/activitystreams#next",
      "@type": "@id",
    },
    prev: {
      "@id": "https://www.w3.org/ns/activitystreams#prev",
      "@type": "@id",
    },
    first: {
      "@id": "https://www.w3.org/ns/activitystreams#first",
      "@type": "@id",
    },
    last: {
      "@id": "https://www.w3.org/ns/activitystreams#last",
      "@type": "@id",
    },
    items: {
      "@id": "https://www.w3.org/ns/activitystreams#items",
      "@type": "@id",
      "@isCollection": true,
    },
    startTime: {
      "@id": "https://www.w3.org/ns/activitystreams#startTime",
      "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
    },
    summary: {
      "@id": "https://www.w3.org/ns/activitystreams#summary",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
      "@isCollection": true,
    },
    tag: {
      "@id": "https://www.w3.org/ns/activitystreams#tag",
      "@type": "@id",
      "@isCollection": true,
    },
    updated: {
      "@id": "https://www.w3.org/ns/activitystreams#updated",
      "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
    },
    url: {
      "@id": "https://www.w3.org/ns/activitystreams#url",
      "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
      "@isCollection": true,
    },
    to: {
      "@id": "https://www.w3.org/ns/activitystreams#to",
      "@type": "@id",
      "@isCollection": true,
    },
    bto: {
      "@id": "https://www.w3.org/ns/activitystreams#bto",
      "@type": "@id",
      "@isCollection": true,
    },
    cc: {
      "@id": "https://www.w3.org/ns/activitystreams#cc",
      "@type": "@id",
      "@isCollection": true,
    },
    bcc: {
      "@id": "https://www.w3.org/ns/activitystreams#bcc",
      "@type": "@id",
      "@isCollection": true,
    },
    duration: {
      "@id": "https://www.w3.org/ns/activitystreams#duration",
      "@type": "http://www.w3.org/2001/XMLSchema#duration",
    },
    Activity: {
      "@id": "https://www.w3.org/ns/activitystreams#Activity",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    actor: {
      "@id": "https://www.w3.org/ns/activitystreams#actor",
      "@type": "@id",
      "@isCollection": true,
    },
    object: {
      "@id": "https://www.w3.org/ns/activitystreams#object",
      "@type": "@id",
      "@isCollection": true,
    },
    target: {
      "@id": "https://www.w3.org/ns/activitystreams#target",
      "@type": "@id",
      "@isCollection": true,
    },
    result: {
      "@id": "https://www.w3.org/ns/activitystreams#result",
      "@type": "@id",
      "@isCollection": true,
    },
    origin: {
      "@id": "https://www.w3.org/ns/activitystreams#origin",
      "@type": "@id",
      "@isCollection": true,
    },
    instrument: {
      "@id": "https://www.w3.org/ns/activitystreams#instrument",
      "@type": "@id",
      "@isCollection": true,
    },
    IntransitiveActivity: {
      "@id": "https://www.w3.org/ns/activitystreams#IntransitiveActivity",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    OrderedCollection: {
      "@id": "https://www.w3.org/ns/activitystreams#OrderedCollection",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        totalItems: {
          "@id": "https://www.w3.org/ns/activitystreams#totalItems",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
        items: {
          "@id": "https://www.w3.org/ns/activitystreams#items",
          "@type": "@id",
          "@isCollection": true,
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    OrderedCollectionPage: {
      "@id": "https://www.w3.org/ns/activitystreams#OrderedCollectionPage",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        totalItems: {
          "@id": "https://www.w3.org/ns/activitystreams#totalItems",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
        items: {
          "@id": "https://www.w3.org/ns/activitystreams#items",
          "@type": "@id",
          "@isCollection": true,
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        startIndex: {
          "@id": "https://www.w3.org/ns/activitystreams#startIndex",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
      },
    },
    startIndex: {
      "@id": "https://www.w3.org/ns/activitystreams#startIndex",
      "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
    },
    Accept: {
      "@id": "https://www.w3.org/ns/activitystreams#Accept",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    TentativeAccept: {
      "@id": "https://www.w3.org/ns/activitystreams#TentativeAccept",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Add: {
      "@id": "https://www.w3.org/ns/activitystreams#Add",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Arrive: {
      "@id": "https://www.w3.org/ns/activitystreams#Arrive",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Create: {
      "@id": "https://www.w3.org/ns/activitystreams#Create",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Delete: {
      "@id": "https://www.w3.org/ns/activitystreams#Delete",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Follow: {
      "@id": "https://www.w3.org/ns/activitystreams#Follow",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Ignore: {
      "@id": "https://www.w3.org/ns/activitystreams#Ignore",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Join: {
      "@id": "https://www.w3.org/ns/activitystreams#Join",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Leave: {
      "@id": "https://www.w3.org/ns/activitystreams#Leave",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Like: {
      "@id": "https://www.w3.org/ns/activitystreams#Like",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Offer: {
      "@id": "https://www.w3.org/ns/activitystreams#Offer",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Invite: {
      "@id": "https://www.w3.org/ns/activitystreams#Invite",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Reject: {
      "@id": "https://www.w3.org/ns/activitystreams#Reject",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    TentativeReject: {
      "@id": "https://www.w3.org/ns/activitystreams#TentativeReject",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Remove: {
      "@id": "https://www.w3.org/ns/activitystreams#Remove",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Undo: {
      "@id": "https://www.w3.org/ns/activitystreams#Undo",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Update: {
      "@id": "https://www.w3.org/ns/activitystreams#Update",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    View: {
      "@id": "https://www.w3.org/ns/activitystreams#View",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Listen: {
      "@id": "https://www.w3.org/ns/activitystreams#Listen",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Read: {
      "@id": "https://www.w3.org/ns/activitystreams#Read",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Move: {
      "@id": "https://www.w3.org/ns/activitystreams#Move",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Travel: {
      "@id": "https://www.w3.org/ns/activitystreams#Travel",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Announce: {
      "@id": "https://www.w3.org/ns/activitystreams#Announce",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Block: {
      "@id": "https://www.w3.org/ns/activitystreams#Block",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Flag: {
      "@id": "https://www.w3.org/ns/activitystreams#Flag",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Dislike: {
      "@id": "https://www.w3.org/ns/activitystreams#Dislike",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Question: {
      "@id": "https://www.w3.org/ns/activitystreams#Question",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        actor: {
          "@id": "https://www.w3.org/ns/activitystreams#actor",
          "@type": "@id",
          "@isCollection": true,
        },
        object: {
          "@id": "https://www.w3.org/ns/activitystreams#object",
          "@type": "@id",
          "@isCollection": true,
        },
        target: {
          "@id": "https://www.w3.org/ns/activitystreams#target",
          "@type": "@id",
          "@isCollection": true,
        },
        result: {
          "@id": "https://www.w3.org/ns/activitystreams#result",
          "@type": "@id",
          "@isCollection": true,
        },
        origin: {
          "@id": "https://www.w3.org/ns/activitystreams#origin",
          "@type": "@id",
          "@isCollection": true,
        },
        instrument: {
          "@id": "https://www.w3.org/ns/activitystreams#instrument",
          "@type": "@id",
          "@isCollection": true,
        },
        closed: {
          "@id": "https://www.w3.org/ns/activitystreams#closed",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    oneOf: {
      "@id": "https://www.w3.org/ns/activitystreams#oneOf",
      "@type": "@id",
      "@isCollection": true,
    },
    anyOf: {
      "@id": "https://www.w3.org/ns/activitystreams#anyOf",
      "@type": "@id",
      "@isCollection": true,
    },
    closed: {
      "@id": "https://www.w3.org/ns/activitystreams#closed",
      "@type": "@id",
      "@isCollection": true,
    },
    Application: {
      "@id": "https://www.w3.org/ns/activitystreams#Application",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Group: {
      "@id": "https://www.w3.org/ns/activitystreams#Group",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Organization: {
      "@id": "https://www.w3.org/ns/activitystreams#Organization",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Person: {
      "@id": "https://www.w3.org/ns/activitystreams#Person",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Service: {
      "@id": "https://www.w3.org/ns/activitystreams#Service",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Relationship: {
      "@id": "https://www.w3.org/ns/activitystreams#Relationship",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        relationship: {
          "@id": "https://www.w3.org/ns/activitystreams#relationship",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    subject: {
      "@id": "https://www.w3.org/ns/activitystreams#subject",
      "@type": "@id",
    },
    relationship: {
      "@id": "https://www.w3.org/ns/activitystreams#relationship",
      "@type": "@id",
      "@isCollection": true,
    },
    Article: {
      "@id": "https://www.w3.org/ns/activitystreams#Article",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Audio: {
      "@id": "https://www.w3.org/ns/activitystreams#Audio",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Video: {
      "@id": "https://www.w3.org/ns/activitystreams#Video",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Note: {
      "@id": "https://www.w3.org/ns/activitystreams#Note",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Page: {
      "@id": "https://www.w3.org/ns/activitystreams#Page",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Event: {
      "@id": "https://www.w3.org/ns/activitystreams#Event",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
      },
    },
    Place: {
      "@id": "https://www.w3.org/ns/activitystreams#Place",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        accuracy: {
          "@id": "https://www.w3.org/ns/activitystreams#accuracy",
          "@type": "http://www.w3.org/2001/XMLSchema#float",
        },
        altitude: {
          "@id": "https://www.w3.org/ns/activitystreams#altitude",
          "@type": "http://www.w3.org/2001/XMLSchema#float",
        },
        latitude: {
          "@id": "https://www.w3.org/ns/activitystreams#latitude",
          "@type": "http://www.w3.org/2001/XMLSchema#float",
        },
        radius: {
          "@id": "https://www.w3.org/ns/activitystreams#radius",
          "@type": "http://www.w3.org/2001/XMLSchema#float",
        },
      },
    },
    accuracy: {
      "@id": "https://www.w3.org/ns/activitystreams#accuracy",
      "@type": "http://www.w3.org/2001/XMLSchema#float",
    },
    altitude: {
      "@id": "https://www.w3.org/ns/activitystreams#altitude",
      "@type": "http://www.w3.org/2001/XMLSchema#float",
    },
    latitude: {
      "@id": "https://www.w3.org/ns/activitystreams#latitude",
      "@type": "http://www.w3.org/2001/XMLSchema#float",
    },
    radius: {
      "@id": "https://www.w3.org/ns/activitystreams#radius",
      "@type": "http://www.w3.org/2001/XMLSchema#float",
    },
    unit: {
      "@id": "https://www.w3.org/ns/activitystreams#unit",
      "@isCollection": true,
    },
    Mention: {
      "@id": "https://www.w3.org/ns/activitystreams#Mention",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        href: {
          "@id": "https://www.w3.org/ns/activitystreams#href",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
        },
        rel: {
          "@id": "https://www.w3.org/ns/activitystreams#rel",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        hreflang: {
          "@id": "https://www.w3.org/ns/activitystreams#hreflang",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        height: {
          "@id": "https://www.w3.org/ns/activitystreams#height",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
        width: {
          "@id": "https://www.w3.org/ns/activitystreams#width",
          "@type": "http://www.w3.org/2001/XMLSchema#nonNegativeInteger",
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    Profile: {
      "@id": "https://www.w3.org/ns/activitystreams#Profile",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        describes: {
          "@id": "https://www.w3.org/ns/activitystreams#describes",
          "@type": "@id",
        },
      },
    },
    describes: {
      "@id": "https://www.w3.org/ns/activitystreams#describes",
      "@type": "@id",
    },
    Tombstone: {
      "@id": "https://www.w3.org/ns/activitystreams#Tombstone",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        attachment: {
          "@id": "https://www.w3.org/ns/activitystreams#attachment",
          "@type": "@id",
          "@isCollection": true,
        },
        attributedTo: {
          "@id": "https://www.w3.org/ns/activitystreams#attributedTo",
          "@type": "@id",
          "@isCollection": true,
        },
        audience: {
          "@id": "https://www.w3.org/ns/activitystreams#audience",
          "@type": "@id",
          "@isCollection": true,
        },
        content: {
          "@id": "https://www.w3.org/ns/activitystreams#content",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        context: {
          "@id": "https://www.w3.org/ns/activitystreams#context",
          "@type": "@id",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.w3.org/ns/activitystreams#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        endTime: {
          "@id": "https://www.w3.org/ns/activitystreams#endTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        generator: {
          "@id": "https://www.w3.org/ns/activitystreams#generator",
          "@type": "@id",
          "@isCollection": true,
        },
        icon: {
          "@id": "https://www.w3.org/ns/activitystreams#icon",
          "@type": "@id",
          "@isCollection": true,
        },
        image: {
          "@id": "https://www.w3.org/ns/activitystreams#image",
          "@type": "@id",
          "@isCollection": true,
        },
        inReplyTo: {
          "@id": "https://www.w3.org/ns/activitystreams#inReplyTo",
          "@type": "@id",
          "@isCollection": true,
        },
        location: {
          "@id": "https://www.w3.org/ns/activitystreams#location",
          "@type": "@id",
          "@isCollection": true,
        },
        preview: {
          "@id": "https://www.w3.org/ns/activitystreams#preview",
          "@type": "@id",
          "@isCollection": true,
        },
        published: {
          "@id": "https://www.w3.org/ns/activitystreams#published",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        replies: {
          "@id": "https://www.w3.org/ns/activitystreams#replies",
          "@type": "@id",
        },
        startTime: {
          "@id": "https://www.w3.org/ns/activitystreams#startTime",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        summary: {
          "@id": "https://www.w3.org/ns/activitystreams#summary",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        tag: {
          "@id": "https://www.w3.org/ns/activitystreams#tag",
          "@type": "@id",
          "@isCollection": true,
        },
        updated: {
          "@id": "https://www.w3.org/ns/activitystreams#updated",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
        url: {
          "@id": "https://www.w3.org/ns/activitystreams#url",
          "@type": "http://www.w3.org/2001/XMLSchema#anyURI",
          "@isCollection": true,
        },
        to: {
          "@id": "https://www.w3.org/ns/activitystreams#to",
          "@type": "@id",
          "@isCollection": true,
        },
        bto: {
          "@id": "https://www.w3.org/ns/activitystreams#bto",
          "@type": "@id",
          "@isCollection": true,
        },
        cc: {
          "@id": "https://www.w3.org/ns/activitystreams#cc",
          "@type": "@id",
          "@isCollection": true,
        },
        bcc: {
          "@id": "https://www.w3.org/ns/activitystreams#bcc",
          "@type": "@id",
          "@isCollection": true,
        },
        mediaType: {
          "@id": "https://www.w3.org/ns/activitystreams#mediaType",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        duration: {
          "@id": "https://www.w3.org/ns/activitystreams#duration",
          "@type": "http://www.w3.org/2001/XMLSchema#duration",
        },
        formerType: {
          "@id": "https://www.w3.org/ns/activitystreams#formerType",
          "@type": "@id",
          "@isCollection": true,
        },
        deleted: {
          "@id": "https://www.w3.org/ns/activitystreams#deleted",
          "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
        },
      },
    },
    formerType: {
      "@id": "https://www.w3.org/ns/activitystreams#formerType",
      "@type": "@id",
      "@isCollection": true,
    },
    deleted: {
      "@id": "https://www.w3.org/ns/activitystreams#deleted",
      "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
    },
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface ActivityPubObject {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Link {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * A Link is an indirect, qualified reference to a resource identified by a URL. The fundamental model for links is established by [ RFC5988]. Many of the properties defined by the Activity Vocabulary allow values that are either instances of Object or Link. When a Link is used, it establishes a qualified relation connecting the subject (the containing object) to the resource identified by the href. Properties of the Link are properties of the reference as opposed to properties of the resource.\n     */\n    type: LdSet<{\n        "@id": "Link";\n    }>;\n    /**\n     * The target resource pointed to by a Link.\n     */\n    href?: string;\n    /**\n     * A link relation associated with a Link. The value MUST conform to both the [HTML5] and [RFC5988] "link relation" definitions. In the [HTML5], any string not containing the "space" U+0020, "tab" (U+0009), "LF" (U+000A), "FF" (U+000C), "CR" (U+000D) or "," (U+002C) characters can be used as a valid link relation.\n     */\n    rel?: LdSet<string>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    name?: LdSet<string | string>;\n    /**\n     * Hints as to the language used by the target resource. Value MUST be a [BCP47] Language-Tag.\n     */\n    hreflang?: string;\n    /**\n     * On a Link, specifies a hint as to the rendering height in device-independent pixels of the linked resource.\n     */\n    height?: number;\n    /**\n     * On a Link, specifies a hint as to the rendering width in device-independent pixels of the linked resource.\n     */\n    width?: number;\n    preview?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Activity {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface InstransitiveActivity {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Instances of IntransitiveActivity are a subtype of Activity representing intransitive actions. The object property is therefore inappropriate for these activities.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "IntransitiveActivity";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Collection {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | A Collection is a subtype of Object that represents ordered or unordered sets of Object or Link instances. Refer to the Activity Streams 2.0 Core specification for a complete description of the Collection type. \n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Collection";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    /**\n     * A non-negative integer specifying the total number of objects contained by the logical view of the collection. This number might not reflect the actual number of items serialized within the Collection object instance.\n     */\n    totalItems?: number;\n    items?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface OrderedCollection {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | A Collection is a subtype of Object that represents ordered or unordered sets of Object or Link instances. Refer to the Activity Streams 2.0 Core specification for a complete description of the Collection type.  | A subtype of Collection in which members of the logical collection are assumed to always be strictly ordered.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Collection";\n    } | {\n        "@id": "OrderedCollection";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    /**\n     * A non-negative integer specifying the total number of objects contained by the logical view of the collection. This number might not reflect the actual number of items serialized within the Collection object instance.\n     */\n    totalItems?: number;\n    items?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface CollectionPage {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | A Collection is a subtype of Object that represents ordered or unordered sets of Object or Link instances. Refer to the Activity Streams 2.0 Core specification for a complete description of the Collection type.  | Used to represent distinct subsets of items from a Collection. Refer to the Activity Streams 2.0 Core for a complete description of the CollectionPage object.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Collection";\n    } | {\n        "@id": "CollectionPage";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    /**\n     * A non-negative integer specifying the total number of objects contained by the logical view of the collection. This number might not reflect the actual number of items serialized within the Collection object instance.\n     */\n    totalItems?: number;\n    items?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface OrderedCollectionPage {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | A Collection is a subtype of Object that represents ordered or unordered sets of Object or Link instances. Refer to the Activity Streams 2.0 Core specification for a complete description of the Collection type.  | A subtype of Collection in which members of the logical collection are assumed to always be strictly ordered. | Used to represent ordered subsets of items from an OrderedCollection. Refer to the Activity Streams 2.0 Core for a complete description of the OrderedCollectionPage object.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Collection";\n    } | {\n        "@id": "OrderedCollection";\n    } | {\n        "@id": "OrderedCollectionPage";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    /**\n     * A non-negative integer specifying the total number of objects contained by the logical view of the collection. This number might not reflect the actual number of items serialized within the Collection object instance.\n     */\n    totalItems?: number;\n    items?: LdSet<ActivityPubObject | Link>;\n    /**\n     * A non-negative integer value identifying the relative position within the logical view of a strictly ordered collection.\n     */\n    startIndex?: number;\n}\n\nexport interface Accept {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor accepts the object. The target property can be used in certain circumstances to indicate the context into which the object has been accepted.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Accept";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface TentativeAccept {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor accepts the object. The target property can be used in certain circumstances to indicate the context into which the object has been accepted. | A specialization of Accept indicating that the acceptance is tentative.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Accept";\n    } | {\n        "@id": "TentativeAccept";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Add {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has added the object to the target. If the target property is not explicitly specified, the target would need to be determined implicitly by context. The origin can be used to identify the context from which the object originated. \n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Add";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Arrive {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Instances of IntransitiveActivity are a subtype of Activity representing intransitive actions. The object property is therefore inappropriate for these activities. | An IntransitiveActivity that indicates that the actor has arrived at the location. The origin can be used to identify the context from which the actor originated. The target typically has no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "IntransitiveActivity";\n    } | {\n        "@id": "Arrive";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Create {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has created the object.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Create";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Delete {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has deleted the object. If specified, the origin indicates the context from which the object was deleted.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Delete";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Follow {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is "following" the object. Following is defined in the sense typically used within Social systems in which the actor is interested in any activity performed by or on the object. The target and origin typically have no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Follow";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Ignore {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is ignoring the object. The target and origin typically have no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Ignore";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Join {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has joined the object. The target and origin typically have no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Join";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Leave {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has left the object. The target and origin typically have no meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Leave";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Like {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor likes, recommends or endorses the object. The target and origin typically have no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Like";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Offer {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is offering the object. If specified, the target indicates the entity to which the object is being offered.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Offer";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Invite {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is offering the object. If specified, the target indicates the entity to which the object is being offered. | A specialization of Offer in which the actor is extending an invitation for the object to the target.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Offer";\n    } | {\n        "@id": "Invite";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Reject {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is rejecting the object. The target and origin typically have no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Reject";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface TentativeReject {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is rejecting the object. The target and origin typically have no defined meaning. | A specialization of Reject in which the rejection is considered tentative.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Reject";\n    } | {\n        "@id": "TentativeReject";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Remove {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is removing the object. If specified, the origin indicates the context from which the object is being removed.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Remove";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Undo {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. |  Indicates that the actor is undoing the object. In most cases, the object will be an Activity describing some previously performed action (for instance, a person may have previously "liked" an article but, for whatever reason, might choose to undo that like at some later point in time). The target and origin typically have no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Undo";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Update {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has updated the object. Note, however, that this vocabulary does not define a mechanism for describing the actual set of modifications made to object. The target and origin typically have no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Update";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface View {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has viewed the object.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "View";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Listen {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has listened to the object.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Listen";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Read {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has read the object.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Read";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Move {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor has moved object from origin to target. If the origin or target are not specified, either can be determined by context.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Move";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Travel {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Instances of IntransitiveActivity are a subtype of Activity representing intransitive actions. The object property is therefore inappropriate for these activities. | Indicates that the actor is traveling to target from origin. Travel is an IntransitiveObject whose actor specifies the direct object. If the target or origin are not specified, either can be determined by context.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "IntransitiveActivity";\n    } | {\n        "@id": "Travel";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Announce {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is calling the target\'s attention the object. The origin typically has no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Announce";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Block {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is ignoring the object. The target and origin typically have no defined meaning. | Indicates that the actor is blocking the object. Blocking is a stronger form of Ignore. The typical use is to support social systems that allow one user to block activities or content of other users. The target and origin typically have no defined meaning.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Ignore";\n    } | {\n        "@id": "Block";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Flag {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor is "flagging" the object. Flagging is defined in the sense common to many social platforms as reporting content as being inappropriate for any number of reasons.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Flag";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Dislike {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Indicates that the actor dislikes the object.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "Dislike";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Question {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | An Activity is a subtype of Object that describes some form of action that may happen, is currently happening, or has already happened. The Activity type itself serves as an abstract base type for all types of activities. It is important to note that the Activity type itself does not carry any specific semantics about the kind of action being taken. | Instances of IntransitiveActivity are a subtype of Activity representing intransitive actions. The object property is therefore inappropriate for these activities. |  Represents a question being asked. Question objects are an extension of IntransitiveActivity. That is, the Question object is an Activity, but the direct object is the question itself and therefore it would not contain an object property. Either of the anyOf and oneOf properties MAY be used to express possible answers, but a Question object MUST NOT have both properties. \n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Activity";\n    } | {\n        "@id": "IntransitiveActivity";\n    } | {\n        "@id": "Question";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    actor?: LdSet<ActivityPubObject | Link>;\n    object?: LdSet<ActivityPubObject | Link>;\n    target?: LdSet<ActivityPubObject | Link>;\n    result?: LdSet<ActivityPubObject | Link>;\n    origin?: LdSet<ActivityPubObject | Link>;\n    instrument?: LdSet<ActivityPubObject | Link>;\n    closed?: LdSet<ActivityPubObject | Link | string | boolean>;\n}\n\nexport interface Application {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Describes a software application.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Application";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Group {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a formal or informal collective of Actors.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Group";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Organization {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents an organization.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Organization";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Person {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents an individual person.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Person";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Service {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a service of any kind.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Service";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Relationship {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. |  Describes a relationship between two individuals. The subject and object properties are used to identify the connected individuals. See 5.2 Representing Relationships Between Entities for additional information. \n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Relationship";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    /**\n     * On a Relationship object, the relationship property identifies the kind of relationship that exists between subject and object.\n     */\n    relationship?: LdSet<ActivityPubObject>;\n}\n\nexport interface Article {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents any kind of multi-paragraph written work.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Article";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Document {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a document of any kind.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Document";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Audio {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a document of any kind. | Represents an audio document of any kind.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Document";\n    } | {\n        "@id": "Audio";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Image {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a document of any kind. | An image document of any kind\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Document";\n    } | {\n        "@id": "Image";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Video {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a document of any kind. | Represents a video document of any kind. \n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Document";\n    } | {\n        "@id": "Video";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Note {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a short written work typically less than a single paragraph in length.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Note";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Page {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a document of any kind. | Represents a Web Page.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Document";\n    } | {\n        "@id": "Page";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Event {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents any kind of event.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Event";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n}\n\nexport interface Place {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | Represents a logical or physical location. See 5.3 Representing Places for additional information.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Place";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    /**\n     * Indicates the accuracy of position coordinates on a Place objects. Expressed in properties of percentage. e.g. "94.0" means "94.0% accurate".\n     */\n    accuracy?: number;\n    /**\n     * Indicates the altitude of a place. The measurement units is indicated using the units property. If units is not specified, the default is assumed to be "m" indicating meters. \n     */\n    altitude?: number;\n    /**\n     * The latitude of a place | The longitude of a place\n     */\n    latitude?: LdSet<number | number>;\n    /**\n     * The radius from the given latitude and longitude for a Place. The units is expressed by the units property. If units is not specified, the default is assumed to be "m" indicating "meters".\n     */\n    radius?: number;\n}\n\nexport interface Mention {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * A Link is an indirect, qualified reference to a resource identified by a URL. The fundamental model for links is established by [ RFC5988]. Many of the properties defined by the Activity Vocabulary allow values that are either instances of Object or Link. When a Link is used, it establishes a qualified relation connecting the subject (the containing object) to the resource identified by the href. Properties of the Link are properties of the reference as opposed to properties of the resource. | A specialized Link that represents an @mention.\n     */\n    type: LdSet<{\n        "@id": "Link";\n    } | {\n        "@id": "Mention";\n    }>;\n    /**\n     * The target resource pointed to by a Link.\n     */\n    href?: string;\n    /**\n     * A link relation associated with a Link. The value MUST conform to both the [HTML5] and [RFC5988] "link relation" definitions. In the [HTML5], any string not containing the "space" U+0020, "tab" (U+0009), "LF" (U+000A), "FF" (U+000C), "CR" (U+000D) or "," (U+002C) characters can be used as a valid link relation.\n     */\n    rel?: LdSet<string>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    name?: LdSet<string | string>;\n    /**\n     * Hints as to the language used by the target resource. Value MUST be a [BCP47] Language-Tag.\n     */\n    hreflang?: string;\n    /**\n     * On a Link, specifies a hint as to the rendering height in device-independent pixels of the linked resource.\n     */\n    height?: number;\n    /**\n     * On a Link, specifies a hint as to the rendering width in device-independent pixels of the linked resource.\n     */\n    width?: number;\n    preview?: LdSet<ActivityPubObject | Link>;\n}\n\nexport interface Profile {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | A Profile is a content object that describes another Object, typically used to describe Actor Type objects. The describes property is used to reference the object being described by the profile.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Profile";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    /**\n     * On a Profile object, the describes property identifies the object described by the Profile.\n     */\n    describes?: ActivityPubObject;\n}\n\nexport interface Tombstone {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    /**\n     * Describes an object of any kind. The Object type serves as the base type for most of the other kinds of objects defined in the Activity Vocabulary, including other Core types such as Activity, IntransitiveActivity, Collection and OrderedCollection. | A Tombstone represents a content object that has been deleted. It can be used in Collections to signify that there used to be an object at this position, but it has been deleted.\n     */\n    type: LdSet<{\n        "@id": "Object";\n    } | {\n        "@id": "Tombstone";\n    }>;\n    attachment?: LdSet<ActivityPubObject | Link>;\n    attributedTo?: LdSet<ActivityPubObject | Link>;\n    audience?: LdSet<ActivityPubObject | Link>;\n    content?: LdSet<string | string>;\n    context?: LdSet<ActivityPubObject | Link>;\n    name?: LdSet<string | string>;\n    /**\n     * The date and time describing the actual or expected ending time of the object. When used with an Activity object, for instance, the endTime property specifies the moment the activity concluded or is expected to conclude.\n     */\n    endTime?: string;\n    generator?: LdSet<ActivityPubObject | Link>;\n    icon?: LdSet<Image | Link>;\n    image?: LdSet<Image | Link>;\n    inReplyTo?: LdSet<ActivityPubObject | Link>;\n    location?: LdSet<ActivityPubObject | Link>;\n    preview?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was published\n     */\n    published?: string;\n    /**\n     * Identifies a Collection containing objects considered to be responses to this object.\n     */\n    replies?: Collection;\n    /**\n     * The date and time describing the actual or expected starting time of the object. When used with an Activity object, for instance, the startTime property specifies the moment the activity began or is scheduled to begin.\n     */\n    startTime?: string;\n    summary?: LdSet<string | string>;\n    tag?: LdSet<ActivityPubObject | Link>;\n    /**\n     * The date and time at which the object was updated\n     */\n    updated?: string;\n    url?: LdSet<string | Link>;\n    to?: LdSet<ActivityPubObject | Link>;\n    bto?: LdSet<ActivityPubObject | Link>;\n    cc?: LdSet<ActivityPubObject | Link>;\n    bcc?: LdSet<ActivityPubObject | Link>;\n    /**\n     * When used on a Link, identifies the MIME media type of the referenced resource. When used on an Object, identifies the MIME media type of the value of the content property. If not specified, the content property is assumed to contain text/html content.\n     */\n    mediaType?: string;\n    /**\n     * When the object describes a time-bound resource, such as an audio or video, a meeting, etc, the duration property indicates the object\'s approximate duration. The value MUST be expressed as an xsd:duration as defined by [ xmlschema11-2], section 3.3.6 (e.g. a period of 5 seconds is represented as "PT5S").\n     */\n    duration?: string;\n    /**\n     * On a Tombstone object, the formerType property identifies the type of the object that was deleted.\n     */\n    formerType?: LdSet<ActivityPubObject>;\n    /**\n     * On a Tombstone object, the deleted property is a timestamp for when the object was deleted.\n     */\n    deleted?: string;\n}\n\n',
};
