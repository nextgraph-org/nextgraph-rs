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
    Share,
    Play,
    DocumentArrowDown,
    DocumentArrowUp,
    CloudArrowUp,
    CloudArrowDown,
    Beaker,
    Eye,
  } from "svelte-heros-v2";

  export let config = {};
  export let zera: string;

  const exact_mapping = {
    json_ld_editor: TableCells,
    json_editor: TableCells,
    triple_editor: Share,
    rdf_viewer: CircleStack,
    graph_viewer: Sun,
    sparql_query: RocketLaunch,
    sparnatural: CursorArrowRays,
    graphql: Cube,
    invoke: Play,
    ontology_viewer: ArrowsPointingOut,
    download: DocumentArrowDown,
    post_edit: PencilSquare,
    file: Document,
    source: CodeBracket,
    post: DocumentText,
    pad: Square2Stack,
    card: Clipboard,
    gallery: RectangleStack,
    load_graph: CloudArrowUp,
    load: DocumentArrowUp,
    dump: CloudArrowDown,
    ext: GlobeAlt,
    app_store: SquaresPlus,
    app_editor: Beaker,
    list: ListBullet,
    grid: Squares2x2,
    view: Eye,
  };

  const prefix_mapping = {};

  const find = (t) => {
    let e = exact_mapping[t];
    if (e) return e;
    for (let prefix of Object.entries(prefix_mapping)) {
      if (t.startsWith(prefix[0])) return prefix[1];
    }
    return BugAnt;
  };
</script>

<Icon {...config} variation="outline" color="black" icon={find(zera)} />
