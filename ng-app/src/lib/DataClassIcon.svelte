<!--
// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
-->

<script lang="ts">
  import {
    Icon,
    BugAnt,
    DocumentText,
    Window,
    CodeBracket,
    SquaresPlus,
    ViewfinderCircle,
    ArrowsPointingOut,
    Cube,
    Briefcase,
    MagnifyingGlass,
    RocketLaunch,
    Sun,
    TableCells,
    ListBullet,
    RectangleGroup,
    Squares2x2,
    MapPin,
    CircleStack,
    Envelope,
    GlobeAlt,
    DocumentChartBar,
    Document,
    ClipboardDocumentList,
    Photo,
    Film,
    RectangleStack,
    Microphone,
    MusicalNote,
    Ticket,
    CursorArrowRays,
    Megaphone,
    User,
    Clock,
    CalendarDays,
    Calendar,
    Stop,
    Flag,
    HandRaised,
    Newspaper,
    PencilSquare,
    CubeTransparent,
    PresentationChartBar,
    QuestionMarkCircle,
    CheckCircle,
    ChartPie,
    Bars3BottomLeft,
    Link,
    Square2Stack,
    Clipboard,
    StopCircle,
    Bolt,
    Heart,
  } from "svelte-heros-v2";

  export let config = {};
  export let dataClass: string;

  const exact_mapping = {
    page: Window,
    "app/z": SquaresPlus,
    class: ViewfinderCircle,
    contract: Briefcase,
    "query/text": MagnifyingGlass,
    "query/web": MagnifyingGlass,
    "data/graph": Sun,
    "data/table": TableCells,
    "data/collection": ListBullet,
    "data/board": RectangleGroup,
    "data/grid": Squares2x2,
    "data/geomap": MapPin,
    "e/email": Envelope,
    "mc/text": Bars3BottomLeft,
    "mc/link": Link,
    "plato/card": Clipboard,
    "plato/pad": Square2Stack,
    "media/image": Photo,
    "media/reel": Film,
    "media/video": Film,
    "media/album": RectangleStack,
    "media/audio": Microphone,
    "media/song": MusicalNote,
    "media/subtitle": Ticket,
    "media/overlay": CursorArrowRays,
    "social/channel": Megaphone,
    "social/stream": Bolt,
    "social/contact": User,
    "social/event": Clock,
    "social/calendar": CalendarDays,
    "social/scheduler": Calendar,
    "social/reaction": Heart,
    "prod/task": Stop,
    "prod/project": Flag,
    "prod/issue": HandRaised,
    "prod/form": Newspaper,
    "prod/filling": PencilSquare,
    "prod/cad": CubeTransparent,
    "prod/slides": PresentationChartBar,
    "prod/question": QuestionMarkCircle,
    "prod/answer": CheckCircle,
    "prod/poll": QuestionMarkCircle,
    "prod/vote": CheckCircle,
  };

  const prefix_mapping = {
    "post/": DocumentText,
    code: CodeBracket,
    schema: ArrowsPointingOut,
    service: Cube,
    "e/": GlobeAlt,
    "app/": StopCircle,
    "query/": RocketLaunch,
    "data/": CircleStack,
    "doc/diagram": DocumentChartBar,
    "doc/chart": ChartPie,
    "doc/viz": ChartPie,
    "doc/": ClipboardDocumentList,
    file: Document,
  };

  const find = (t) => {
    let e = exact_mapping[t];
    if (e) return e;
    for (let prefix of Object.entries(prefix_mapping)) {
      if (t.startsWith(prefix[0])) return prefix[1];
    }
    return BugAnt;
  };
</script>

<!--
did:ng:n:g:z:[official apps]
did:ng:n:g:ns
did:ng:n:g:x list of context used by nextgraph
  rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns#
  rdfs: http://www.w3.org/2000/01/rdf-schema#
  schema: https://schema.org/
  skos: http://www.w3.org/2004/02/skos/core#
  owl: http://www.w3.org/2002/07/owl#
  foaf: http://xmlns.com/foaf/0.1/
  relationship: http://purl.org/vocab/relationship/
  dcterms: http://purl.org/dc/terms/
  dcmitype: http://purl.org/dc/dcmitype/
  sh: http://www.w3.org/ns/shacl#
  shex: http://www.w3.org/ns/shex#
  xsd: http://www.w3.org/2001/XMLSchema#
  as: https://www.w3.org/ns/activitystreams#
  ldp: http://www.w3.org/ns/ldp#
  vcard: http://www.w3.org/2006/vcard/ns#
  sec: https://w3id.org/security#
  wgs: http://www.w3.org/2003/01/geo/wgs84_pos#
  cc: http://creativecommons.org/ns#
  gn: https://www.geonames.org/ontology#
  geo: http://www.opengis.net/ont/geosparql#
  time: http://www.w3.org/2006/time#

  ng: did:ng:n:g:ns# or http://nextgraph.org/ns#

did:ng:n:g:ns#post/rich
ng:class => shortcut for did:ng:n:g:ns#class
a rdfs:Class
a ng:class
did:ng:o:xxxx:yy:yy
did:ng:n:xx.xx#name
did:ng:n:x: curated list of ontologies
did:ng:k common list of things (keyword)
did:ng:n:c common data
did:ng:n:z: curated list of external apps and services
http://nextgraph.org/ns# => the ng: ontology (did:ng:n:g:ns#)

ng:compat -> owl:unionOf rdf:List (alphabetical order, including itself as first element)

-->
<Icon {...config} variation="outline" color="black" icon={find(dataClass)} />
