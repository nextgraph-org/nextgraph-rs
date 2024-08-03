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
    ClipboardDocumentCheck,
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
    SpeakerWave,
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
    Cog,
    Square3Stack3d,
    ChatBubbleLeftRight,
    Fire,
    ReceiptPercent,
    ArrowTrendingUp,
    CursorArrowRipple,
    VideoCamera,
    Variable,
    Language,
    QueueList,
  } from "svelte-heros-v2";

  import PdfIcon from "./PdfIcon.svelte";
  import BrailleIcon from "./BrailleIcon.svelte";
  import ChemistryIcon from "./ChemistryIcon.svelte";
  import GuitarIcon from "./GuitarIcon.svelte";
  import JsonIcon from "./JsonIcon.svelte";
  import JsIcon from "./JsIcon.svelte";
  import TsIcon from "./TsIcon.svelte";
  import RustIcon from "./RustIcon.svelte";
  import SvelteIcon from "./SvelteIcon.svelte";
  import ReactIcon from "./ReactIcon.svelte";
  import GraphQLIcon from "./GraphQLIcon.svelte";

  export let config = {};
  export let dataClass: string;
  export let color = "currentColor";

  const exact_mapping = {
    page: Window,
    "app": Cog,
    "app:z": SquaresPlus,
    class: ViewfinderCircle,
    contract: ClipboardDocumentCheck,
    "query:text": MagnifyingGlass,
    "query:web": MagnifyingGlass,
    "query:graphql": GraphQLIcon,
    "data:graph": Sun,
    "data:json": JsonIcon,
    "data:table": TableCells,
    "data:collection": ListBullet,
    "data:container": Square3Stack3d,
    "data:board": RectangleGroup,
    "data:grid": Squares2x2,
    "data:geomap": MapPin,
    "e:email": Envelope,
    "e:link": Link,
    "mc:text": Bars3BottomLeft,
    "mc:link": Link,
    "plato/card": Clipboard,
    "plato/pad": Square2Stack,
    "media:image": Photo,
    "media:reel": VideoCamera,
    "media:video": Film,
    "media:album": RectangleStack,
    "media:audio": SpeakerWave,
    "media:song": MusicalNote,
    "media:subtitle": Ticket,
    "media:overlay": CursorArrowRays,
    "social:channel": Megaphone,
    "social:stream": Bolt,
    "social:contact": User,
    "social:event": Clock,
    "social:calendar": CalendarDays,
    "social:scheduler": Calendar,
    "social:reaction": Heart,
    "social:chatroom": ChatBubbleLeftRight,
    "social:live": Fire,
    "prod:task": Stop,
    "prod:project": Flag,
    "prod:issue": HandRaised,
    "prod:form": Newspaper,
    "prod:filling": PencilSquare,
    "prod:cad": CubeTransparent,
    "prod:slides": PresentationChartBar,
    "prod:question": QuestionMarkCircle,
    "prod:answer": CheckCircle,
    "prod:poll": CursorArrowRipple,
    "prod:vote": CheckCircle,
    "prod:spreadsheet": ReceiptPercent,
    "doc:compose": QueueList,
    "doc:maths": Variable,
    "doc:music:abc": MusicalNote,
    "doc:pdf": PdfIcon,
    "doc:braille": BrailleIcon,
    "doc:ancientscript": Language,
    "doc:chemistry": ChemistryIcon,
    "doc:music:guitar": GuitarIcon,
    "code:js": JsIcon,
    "code:ts": TsIcon,
    "code:rust": RustIcon,
    "code:svelte": SvelteIcon,
    "code:react": ReactIcon,
  };

  const prefix_mapping = {
    "post:": DocumentText,
    code: CodeBracket,
    schema: ArrowsPointingOut,
    service: Cube,
    "e:": GlobeAlt,
    "app:": StopCircle,
    "query:": RocketLaunch,
    "data:": CircleStack,
    "doc:diagram": DocumentChartBar,
    "doc:chart": ChartPie,
    "doc:viz": ArrowTrendingUp,
    "doc:": ClipboardDocumentList,
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

<Icon {...config} variation="outline" {color} icon={find(dataClass)} />
