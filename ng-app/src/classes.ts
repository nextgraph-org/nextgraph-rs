// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

// "post:rich", "post:md", "post:text", "post:html", "post:asciidoc", "page", "code", "code:*", "app", "app:z", "class", "schema", "schema:owl|rdfs|shacl|shex", "service", "service:rust", "service:deno", "contract", "app:n:xxx.xx.xx:", "app:o:",
// "query:sparql", "query:graphql", "query:text", "query:web", 
// "data:graph", "data:json", "data:array", "data:map", "data:xml", "data:table", "data:collection", "data:board", "data:grid", "data:geomap", 
// "e:email", "e:web", "e:http://[url of class in ontology]", "e:rdf" (read-only cache of RDF fetched from web2.0)
// "mc:text", "mc:link", "mc:card", "mc:pad", 
// "doc:diagram","doc:chart", "doc:pdf", "doc:odf", "doc:latex", "doc:ps", "doc:music", "doc:maths", "doc:chemistry", "doc:braille", "doc:ancientscript",
// "media:image", "media:reel", "media:album", "media:video", "media:audio", "media:song", "media:subtitle", "media:overlay",
// "social:channel", "social:stream", "social:contact", "social:event", "social:calendar", "social:scheduler", "social:reaction", "social:chatroom",
// "prod:task", "prod:project", "prod:issue", "prod:form", "prod:filling", "prod:cad", "prod:slides", "prod:question", "prod:answer", "prod:poll", "prod:vote"
// "file", "file:iana:*", "file:gimp", "file:inkscape", "file:kdenlive", "file:blender", "file:openscad", "file:lyx", "file:scribus", "file:libreoffice", "file:audacity", "file:godot"


// application/vnd.api+json

// application/activity+json

// epub, dejavu, 
// animation: snap, lottie, smil editor: https://github.com/HaikuTeam/animator/

export const has_toc = (class_name) => {
    return class_name === "post:rich" || class_name === "post:md" || class_name === "post:html" || class_name === "post:asciidoc" || class_name === "app:z" || class_name === "class" 
    || class_name.startsWith("schema") || class_name === "doc:pdf" || class_name === "doc:odf" || class_name === "doc:latex" || class_name === "doc:ps" || class_name === "prod:project" || class_name === "prod:slides" 
};

export const official_classes = {
    "post:rich": {
        "ng:crdt": "YXml",
        "ng:n": "Post - Rich Text", // editor: y-ProseMirror, viewer: https://www.npmjs.com/package/prosemirror-to-html-js or https://prosemirror.net/docs/ref/version/0.4.0.html#toDOM https://prosemirror.net/docs/ref/version/0.4.0.html#toHTML
        "ng:a": "A Post with Rich Text, including images, links, formatted text, and embeds of other content",
        "ng:o": "n:g:z:post:rich",
        "ng:w": "n:g:z:post_rich_editor",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["as:Article"],
    },
    "post:md": {
        "ng:crdt": "YXml",
        "ng:n": "Post - MarkDown", // editor y-MilkDown, viewer: https://github.com/wooorm/markdown-rs
        "ng:a": "A Post with MarkDown, including images, links, formatted text, and embeds of other content",
        "ng:o": "n:g:z:post:md",
        "ng:w": "n:g:z:post_md_editor",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["file:iana:text:markdown", "code:markdown","as:Article"],
    },
    "post:text": {
        "ng:crdt": "YText",
        "ng:n": "Post - Plain Text",
        "ng:a": "A Post with Plain Text",
        "ng:o": "n:g:z:post:text",
        "ng:w": "n:g:z:code_editor",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["file:iana:text:plain", "code:plaintext","as:Article"],
    },
    "post:html": {
        "ng:crdt": "YXml",
        "ng:n": "Post - TinyMCE",
        "ng:x": {
            "as":true,
        },
        "ng:a": "A Post based on TinyMCE, including images, links, formatted text, and embeds of other content",
        "ng:compat": ["as:Article"],
    },
    "post:asciidoc": { // display with https://github.com/asciidoctor/asciidoctor.js/
        "ng:crdt": "YText",
        "ng:n": "Post - AsciiDoc",
        "ng:a": "A Post based on AsciiDoc format",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["as:Article"],
    },
    "page": {
        "ng:crdt": "YXml",
        "ng:n": "Page", // based on GrapeJS, VvvebJs, or Astro ?
        "ng:a": "A Page and Site builder",
        "ng:compat": [],
    },
    "code": {
        "ng:crdt": "YText",
        "ng:n": "Source Code", // edited with CodeMirror, displayed with highlight.js 
        "ng:a": "A Source Code file. many languages supported",
        "ng:o": "n:g:z:pre",
        "ng:w": "n:g:z:code_editor",
        "ng:compat": ["code:*","file:iana:text:javascript","file:iana:text:css","file:iana:text:html","file:iana:text:markdown", "file:iana:application:xml", 
                    "file:iana:application:yaml", "file:iana:text:xml", "file:iana:application:xhtml+xml"],
    },
    "code:js": {
        "ng:crdt": "YText",
        "ng:n": "JavaScript", // edited with CodeMirror, displayed with highlight.js 
        "ng:a": "A JavaScript Source Code file",
        "ng:o": "n:g:z:pre",
        "ng:w": "n:g:z:code_editor",
        "ng:compat": ["file:iana:text:javascript"],
    },
    "code:ts": {
        "ng:crdt": "YText",
        "ng:n": "TypeScript", // edited with CodeMirror, displayed with highlight.js 
        "ng:a": "A TypeScript Source Code file",
        "ng:o": "n:g:z:pre",
        "ng:w": "n:g:z:code_editor",
        "ng:compat": ["file:iana:text:typescript"],
    },
    "code:rust": {
        "ng:crdt": "YText",
        "ng:n": "Rust", // edited with CodeMirror, displayed with highlight.js 
        "ng:a": "A Rust Source Code file",
        "ng:o": "n:g:z:pre",
        "ng:w": "n:g:z:code_editor",
        "ng:compat": [],
    },
    "code:svelte": {
        "ng:crdt": "YText",
        "ng:n": "Svelte", // edited with CodeMirror, displayed with highlight.js 
        "ng:a": "A Svelte Source Code file",
        "ng:o": "n:g:z:pre",
        "ng:w": "n:g:z:code_editor",
        "ng:compat": [],
    },
    "code:react": {
        "ng:crdt": "YText",
        "ng:n": "React", // edited with CodeMirror, displayed with highlight.js 
        "ng:a": "A React Source Code file",
        "ng:o": "n:g:z:pre",
        "ng:w": "n:g:z:code_editor",
        "ng:compat": [],
    },
    "app": {
        "ng:n": "Official App",
        "ng:a": "App provided by NextGraph platform",
    },
    "app:z": {
        "ng:crdt": "Elmer",
        "ng:n": "Application", // Editor: Monaco
        "ng:a": "Create an Application based on NextGraph Framework",
        "ng:o": "n:g:z:app_store",
        "ng:w": "n:g:z:app_editor",
        "ng:include": ["schema:*","service:*","code","file"],
        "ng:compat": ["code:svelte"],
    },
    "class": {
        "ng:crdt": "Graph",
        "ng:n": "Class", 
        "ng:a": "Define a custom Class for your data",
        "ng:x": {
            "rdfs":true,
        },
        "ng:compat": ["rdfs:Class"],
    },
    "schema:rdfs": {
        "ng:crdt": "Graph",
        "ng:n": "Schema - RDFS", 
        "ng:a": "Define the Schema, Ontology or Vocabulary for your data and the relations between them, with RDFS",
        "ng:o": "n:g:z:json_ld_viewer", // default viewer
        "ng:w": "n:g:z:ontology_editor", // default editor
        "ng:x": {
            "rdfs":true,
        },
        "ng:include": ["data:graph"],
        "ng:compat": ["rdfs:*","class"],
    },
    "schema:owl": { // display with https://github.com/VisualDataWeb/WebVOWL
        "ng:crdt": "Graph",
        "ng:n": "Schema - OWL", 
        "ng:a": "Define the Schema, Ontology or Vocabulary for your data and the relations between them, with OWL",
        "ng:o": "n:g:z:owl_viewer", // default viewer
        "ng:w": "n:g:z:ontology_editor", // default editor
        "ng:x": {
            "owl":true,
        },
        "ng:include": ["data:graph"],
        "ng:compat": ["owl:Ontology"],
    },
    "schema:shacl": {
        "ng:crdt": "Graph",
        "ng:n": "Schema - SHACL", 
        "ng:a": "Define the Schema, Ontology or Vocabulary for your data and the relations between them, with SHACL",
        "ng:o": "n:g:z:json_ld_viewer", // default viewer
        "ng:w": "n:g:z:ontology_editor", // default editor
        "ng:x": {
            "sh":true,
        },
        "ng:include": ["data:graph"],
        "ng:compat": ["sh:Shape", "file:iana:text:shaclc" ],
    },
    "schema:shex": {
        "ng:crdt": "Graph",
        "ng:n": "Schema - SHEX", 
        "ng:a": "Define the Schema, Ontology or Vocabulary for your data and the relations between them, with SHEX",
        "ng:o": "n:g:z:json_ld_viewer", // default viewer
        "ng:w": "n:g:z:ontology_editor", // default editor
        "ng:x": {
            "shex":true,
        },
        "ng:include": ["data:graph"],
        "ng:compat": ["shex:*", "file:iana:text:shex", "code:shexc" ],
    },
    "service": {
        "ng:n": "Internal Service",
        "ng:a": "Service provided by NextGraph framework",
        "ng:o": "n:g:z:service_invoke", // default viewer
    },
    "service:rust": {
        "ng:crdt": "YText",
        "ng:n": "Service - Rust", // edited with CodeMirror, displayed with highlight.js
        "ng:a": "Service written in Rust and compiled to WASM",
        "ng:o": "external_service_invoke", // default viewer
        "ng:w": "n:g:z:service_editor", // default editor
        "ng:compat": ["code:rust", "file:iana:application:wasm"],
    },
    "service:deno": {
        "ng:crdt": "YText",
        "ng:n": "Service - Deno/JS", // edited with CodeMirror, displayed with highlight.js
        "ng:a": "Service written in JS/TS for Deno or NodeJS",
        "ng:o": "external_service_invoke", // default viewer
        "ng:w": "n:g:z:service_editor", // default editor
        "ng:compat": ["code:javascript", "code:typescript", "file:iana:text:javascript", "file:iana:application:node"],
    },
    "contract": {
        "ng:crdt": "YText",
        "ng:n": "Smart Contract", // edited with CodeMirror, displayed with highlight.js
        "ng:a": "Smart Contract with Rust or JS code",
        "ng:compat": ["code:rust", "file:iana:application:wasm", "code:javascript", "code:typescript", "file:iana:text:javascript", "file:iana:application:node"],
    },
    "query:sparql": { 
        "ng:crdt": "YText",// uses ng:default_graph and ng:named_graph predicates 
        "ng:n": "SPARQL Query", // edited with YASGUI or Sparnatural, displayed with highlight.js https://github.com/highlightjs/highlightjs-turtle/tree/master
        "ng:a": "Saved SPARQL Query that can be invoked",
        "ng:o": "n:g:z:sparql:invoke", 
        "ng:w": "n:g:z:sparql_query",
        "ng:compat": ["code:sparql", "file:iana:application:sparql-query","file:iana:application:x-sparql-query"],
    },
    "query:sparql_update": { 
        "ng:crdt": "YText",// uses ng:default_graph and ng:named_graph predicates 
        "ng:n": "SPARQL Update", // edited with YASGUI, displayed with highlight.js https://github.com/highlightjs/highlightjs-turtle/tree/master
        "ng:a": "Saved SPARQL Update that can be invoked",
        "ng:o": "n:g:z:sparql:invoke", 
        "ng:w": "n:g:z:sparql_update",
        "ng:compat": ["code:sparql", "file:iana:application:sparql-update"],
    },
    "query:graphql": {
        "ng:crdt": "YText", // uses ng:default_graph predicate
        "ng:n": "GraphQL Query", // edited with https://github.com/graphql/graphiql or https://github.com/graphql-editor/graphql-editor, displayed with highlight.js
        "ng:a": "Saved GraphQL Query that can be invoked",
        "ng:o": "n:g:z:graphql:invoke", 
        "ng:w": "n:g:z:graphql_query",
        "ng:compat": ["code:graphql", "file:iana:application:graphql+json"],
    }, 
    "query:text": {
        "ng:crdt": "Graph",
        "ng:n": "Text Search", 
        "ng:a": "Saved Text Search and its results",
        "ng:compat": [],
    },
    "query:web": {
        "ng:crdt": "Graph",
        "ng:n": "Web Search", 
        "ng:a": "Saved Web Search and its results",
        "ng:compat": [],
    },
    "data:graph": {
        "ng:crdt": "Graph", // https://github.com/highlightjs/highlightjs-turtle/tree/master
        "ng:n": "Graph", 
        "ng:a": "Define the Graph of your data with Semantic Web / Linked Data",
        //"ng:o": "n:g:z:json_ld_viewer", // default viewer
        //"ng:w": "n:g:z:json_ld_editor", // default editor
        "ng:x": {
            "rdf":true,
            "xsd":true,
        },
        "ng:compat": [ "rdf:*", "xsd:*", "file:iana:text:n3", "file:iana:text:rdf+n3", "file:iana:text:turtle", "file:iana:application:n-quads", "file:iana:application:trig", "file:iana:application:n-triples", 
                        "file:iana:application:rdf+xml", "file:iana:application:ld+json"],
    },
    "data:json": {
        "ng:crdt": "Automerge",
        "ng:n": "JSON", 
        "ng:a": "JSON Data CRDT",
        "ng:o": "n:g:z:json_automerge_viewer", // default viewer
        "ng:w": "n:g:z:json_automerge_editor", // default editor
        "ng:compat": ["file:iana:application:json", "code:json"],
    },
    "data:array": {
        "ng:crdt": "YArray",
        "ng:n": "Array", 
        "ng:a": "Yjs Array CRDT",
        "ng:o": "n:g:z:json_yarray_viewer", // default viewer
        "ng:w": "n:g:z:json_yarray_editor", // default editor
        "ng:compat": ["file:iana:application:json", "code:json"],
    },
    "data:map": {
        "ng:crdt": "YMap",
        "ng:n": "Object", 
        "ng:a": "Yjs Map CRDT",
        "ng:o": "n:g:z:json_ymap_viewer", // default viewer
        "ng:w": "n:g:z:json_ymap_editor", // default editor
        "ng:compat": ["file:iana:application:json", "code:json"],
    },
    "data:xml": {
        "ng:crdt": "YXml",
        "ng:n": "XML", 
        "ng:a": "XML Data CRDT",
        "ng:compat": ["file:iana:text:xml","file:iana:application:xml", "code:xml"],
    },
    "data:table": {
        "ng:crdt": "Automerge", // see https://github.com/frappe/datatable
        "ng:n": "Table", // see https://specs.frictionlessdata.io/table-schema displayed with pivot table see https://activetable.io/docs/data https://www.npmjs.com/package/pivottable https://socket.dev/npm/package/svelte-pivottable/alerts/0.2.0?tab=dependencies
        "ng:a": "Data in a Table (columns and rows)",
        "ng:o": "n:g:z:pivot",
        "ng:compat": ["file:iana:application:sparql-results+json","file:iana:application:sparql-results+xml","file:iana:text:csv"],
    },
    "data:collection": {
        "ng:crdt": "Graph",
        "ng:n": "Collection",
        "ng:a": "An ordered list of items",
        "ng:o": "n:g:z:container",
        "ng:x": {
            "as": true,
            "rdf": true,
        },
        "ng:compat": ["as:Collection","rdf:List","rdf:Seq"],
    },
    "data:container": {
        "ng:crdt": "Graph",
        "ng:n": "Container",
        "ng:a": "An unordered set of items",
        "ng:o": "n:g:z:container",
        "ng:x": {
            "rdf": true,
            "rdfs": true,
            "ldp": true,
        },
        "ng:compat": ["rdfs:member","ldp:contains","rdf:Bag","rdf:Alt"],
    },
    "data:plato": {
        "ng:crdt": "Graph",
        "ng:n": "Plato",
        "ng:a": "A tree of files and folders",
        "ng:o": "n:g:z:tree",
        "ng:compat": ["ng:plato","ng:has_plato"],
    },
    "data:board": {
        "ng:crdt": "Graph",
        "ng:n": "Board",
        "ng:a": "Whiteboard, infinite canvas to arrange your content in 2D",
        "ng:o": "n:g:z:board",
        "ng:include": [],
        "ng:compat": [], //https://jsoncanvas.org/ https://www.canvasprotocol.org/ https://github.com/orgs/ocwg/discussions/25 https://infinitecanvas.tools/gallery/
    },
    "data:grid": {
        "ng:crdt": "Graph",
        "ng:n": "Grid",
        "ng:a": "Grid representation of a collection or container",
        "ng:o": "n:g:z:grid",
        "ng:include": ["data:container","data:collection","data:table","media:album"],
        "ng:compat": [],
    },
    "data:geomap": {  // https://github.com/leaflet/leaflet
        "ng:crdt": "Graph",
        "ng:n": "Geo Map",
        "ng:a": "Geographical Map",
        "ng:x": {
            "wgs": true,
            "gn": true,
            "as": true,
        },
        "ng:compat": ["as:Place","wgs:*","gn:*", "file:iana:application:geo+json", "file:iana:application:vnd.mapbox-vector-tile"], // see also https://github.com/topojson/topojson
    },
    "e:email": {
        "ng:crdt": "Graph",
        "ng:n": "Email",
        "ng:a": "Email content and headers",
        "ng:x": {
            "email": "http://www.invincea.com/ontologies/icas/1.0/email#" //https://raw.githubusercontent.com/twosixlabs/icas-ontology/master/ontology/email.ttl
        },
        "ng:compat": ["file:iana:message:rfc822","file:iana:multipart:related"],
    },
    "e:link": {
        "ng:crdt": "Graph",
        "ng:n": "Web Link",
        "ng:a": "HTTP link to a page on the Web",
        "ng:compat": [],
    },
    "e:web": {
        "ng:crdt": "Graph",
        //https://www.npmjs.com/package/warcio https://github.com/N0taN3rd/node-warc
        "ng:n": "Web Archive",
        "ng:a": "Archive the content of a web page",
        "ng:compat": ["file:iana:application:warc","file:iana:multipart:related"],
    }, 
    "e:rdf": {
        "ng:crdt": "Graph",
        "ng:n": "RDF Archive",
        "ng:a": "Archive the triples of an RDF resource dereferenced with HTTP",
        "ng:include": ["data:graph"],
    },
    "mc:text": {
        "ng:crdt": "Graph",
        "ng:n": "Text Selection",
        "ng:a": "Text Selection copied into Magic Carpet",
    }, 
    "mc:link": {
        "ng:crdt": "Graph",
        "ng:n": "Link",
        "ng:a": "Link to a document. kept in Magic Carpet",
    },
    "plato/card": {
        "ng:crdt": "Graph",
        "ng:n": "Card",
        "ng:a": "Card representation of a document",
        "ng:o": "n:g:z:card",
    },
    "plato/pad": {
        "ng:crdt": "Graph",
        "ng:n": "Pad",
        "ng:a": "Pad representation of a document",
        "ng:o": "n:g:z:pad",
    },
    "doc:compose" : {
        "ng:crdt": "YArray",
        "ng:n": "Composition",
        "ng:a": "Compose several blocks into a single document",
        "ng:o": "n:g:z:compose:viewer",
        "ng:w": "n:g:z:compose:editor",
    },
    "doc:diagram:mermaid" : {
        "ng:crdt": "YText",
        "ng:n": "Diagram - Mermaid",
        "ng:a": "Describe Diagrams with Mermaid",
        "ng:compat": ["file:iana:application:vnd.mermaid"]
    },
    "doc:diagram:drawio" : {
        "ng:crdt": "YXml",
        "ng:n": "Diagram - DrawIo",
        "ng:a": "Draw Diagrams with DrawIo",
        "ng:compat": ["file:iana:application:vnd.jgraph.mxfile","file:iana:application:x-drawio"]
    },
    "doc:diagram:graphviz" : {
        "ng:crdt": "YText",
        "ng:n": "Diagram - Graphviz",
        "ng:a": "Describe Diagrams with Graphviz",
        "ng:compat": ["file:iana:text:vnd.graphviz"]
    },
    "doc:diagram:excalidraw" : {
        "ng:crdt": "Automerge",
        "ng:n": "Diagram - Excalidraw",
        "ng:a": "Collaborate on Diagrams with Excalidraw",
        "ng:compat": ["file:iana:application:vnd.excalidraw+json"]
    },
    "doc:diagram:gantt" : { //https://github.com/frappe/gantt
        "ng:crdt": "Automerge",
        "ng:n": "Diagram - Gantt",
        "ng:a": "Interactive gantt chart",
        "ng:compat": []
    },
    "doc:diagram:flowchart" : { //https://github.com/adrai/flowchart.js
        "ng:crdt": "YText",
        "ng:n": "Diagram - Flowchart",
        "ng:a": "flow chart diagrams",
        "ng:compat": []
    },
    "doc:diagram:sequence" : { //https://github.com/bramp/js-sequence-diagrams
        "ng:crdt": "YText",
        "ng:n": "Diagram - Sequence",
        "ng:a": "sequence diagrams",
        "ng:compat": []
    },
    // checkout https://www.mindmaps.app/ but it is AGPL 
    "doc:diagram:markmap" : { //https://github.com/markmap/markmap
        "ng:crdt": "YText",
        "ng:n": "Diagram - Markmap",
        "ng:a": "mindmaps with markmap",
        "ng:compat": []
    },
    "doc:diagram:mymind" : { //https://github.com/markmap/markmap
        "ng:crdt": "YText", // see MyMind format, MindMup JSON, FreeMind XML and MindMap Architect XML
        "ng:n": "Diagram - Mymind",
        "ng:a": "mindmaps with mymind",
        "ng:compat": [] // https://github.com/ondras/my-mind/wiki/Saving-and-loading#file-formats
    },
    "doc:diagram:jsmind" : { //https://github.com/hizzgdev/jsmind
        "ng:crdt": "Automerge",
        "ng:n": "Diagram - jsmind",
        "ng:a": "mindmaps with jsmind",
        "ng:compat": [] // https://hizzgdev.github.io/jsmind/docs/en/1.usage.html
    },
    // DC and C3 have Crossfilter https://github.com/dc-js/dc.js http://crossfilter.github.io/crossfilter/ https://github.com/c3js/c3 http://dc-js.github.io/dc.js/
    // take inspiration from https://github.com/metabase/metabase
    // have a look at https://github.com/observablehq
    // another open source dashboard with many data sources https://github.com/getredash/redash
    // and another one https://github.com/apache/superset
    // https://github.com/Rich-Harris/pancake
    // https://github.com/williamngan/pts
    // https://visjs.org/
    "doc:viz:cytoscape" : {
        "ng:crdt": "Automerge",
        "ng:n": "Viz - Cytoscape",
        "ng:a": "Graph theory (network) visualization",
        "ng:compat": [] // https://github.com/cytoscape/cytoscape.js
    },
    "doc:viz:vega" : {
        "ng:crdt": "Automerge",
        "ng:n": "Viz - Vega",
        "ng:a": "Grammar for interactive graphics",
        "ng:compat": [] // https://vega.github.io/vega-lite/docs/ https://github.com/vega/editor
    },
    "doc:viz:vizzu" : {
        "ng:crdt": "Automerge",
        "ng:n": "Viz - Vizzu",
        "ng:a": "Animated data visualizations and data stories",
        "ng:compat": [] // https://github.com/vizzuhq/vizzu-lib
    },
    "doc:viz:plotly" : { //https://github.com/plotly/plotly.js
        "ng:crdt": "Automerge",
        "ng:n": "Viz - Plotly",
        "ng:a": "Declarative charts",
        "ng:compat": [] // https://github.com/cytoscape/cytoscape.js
    },
    "doc:viz:avail" : { 
        "ng:crdt": "Automerge",
        "ng:n": "Viz - Avail",
        "ng:a": "Time Data Availability Visualization",
        "ng:compat": [] // https://github.com/flrs/visavail
    },
    "doc:chart:frappecharts" : {
        "ng:crdt": "Automerge",
        "ng:n": "Charts - Frappe",
        "ng:a": "GitHub-inspired responsive charts",
        "ng:compat": [] // https://github.com/frappe/charts
    },
    "doc:chart:financial" : {
        "ng:crdt": "Automerge",
        "ng:n": "Charts - Financial",
        "ng:a": "Financial charts",
        "ng:compat": [] //https://github.com/tradingview/lightweight-charts
    },
    // have a look at https://github.com/cube-js/cube and https://awesome.cube.dev/ and https://frappe.io/products
    "doc:chart:apexcharts" : {
        "ng:crdt": "Automerge",
        "ng:n": "Charts - ApexCharts",
        "ng:a": "Interactive data visualizations",
        "ng:compat": [] // https://github.com/apexcharts/apexcharts.js
    },
    //realtime data with https://github.com/square/cubism
    "doc:chart:billboard" : {
        "ng:crdt": "Automerge",
        "ng:n": "Charts - BillBoard",
        "ng:a": "Interactive data visualizations based on D3",
        "ng:compat": [] // https://github.com/naver/billboard.js
    },
    "doc:chart:echarts" : {
        "ng:crdt": "Automerge",
        "ng:n": "Charts - ECharts",
        "ng:a": "Interactive charting and data visualization with Apache ECharts",
        "ng:compat": [] // https://github.com/apache/echarts
    },
    "doc:chart:chartjs" : {
        "ng:crdt": "Automerge",
        "ng:n": "Charts - Chart.js",
        "ng:a": "Simple yet flexible charting for designers & developers with Chart.js",
        "ng:compat": [] // https://github.com/chartjs/Chart.js
    },
    // see if to provide plain D3, and also all the https://github.com/antvis libraries: G2, G6, L7, S2, X6. Have a look at AVA
    "doc:pdf": {
        "ng:crdt": "Graph",
        "ng:n": "PDF",
        "ng:a": "upload and display a PDF file",
        "ng:compat": ["file:iana:application:pdf"] // https://github.com/mozilla/pdf.js https://viewerjs.org/
    },
    "doc:odf": { //!!! becareful: AGPL
        "ng:crdt": "Graph",
        "ng:n": "ODF",
        "ng:a": "upload and display an ODF file",
        "ng:compat": ["file:iana:application:vnd.oasis.opendocument*"] // https://webodf.org/ https://github.com/webodf/WebODF https://viewerjs.org/ 
    },
    // see also https://github.com/Mathpix/mathpix-markdown-it
    "doc:latex": {
        "ng:crdt": "Graph",
        "ng:n": "Latex",
        "ng:a": "upload and display a Latex or Tex file",
        "ng:compat": ["file:iana:application:x-tex","file:iana:text:x-tex"] // https://github.com/michael-brade/LaTeX.js https://github.com/mathjax/MathJax
    },
    "doc:ps": { //!!! becareful: AGPL https://github.com/ochachacha/ps-wasm
        "ng:crdt": "Graph",
        "ng:n": "Postscript",
        "ng:a": "upload and display a PostScript file",
        "ng:compat": ["file:iana:application:postscript"] // https://www.npmjs.com/package/ghostscript4js 
    },
    "doc:music:abc": { //https://github.com/paulrosen/abcjs
        "ng:crdt": "YText",
        "ng:n": "Musical Notation",
        "ng:a": "sheet music notation",
        "ng:compat": []
    },
    "doc:music:guitar": { //https://github.com/birdca/fretboard
        "ng:crdt": "YText",
        "ng:n": "Music - Guitar",
        "ng:a": "charts for guitar chords and scales",
        "ng:compat": []
    },
    "doc:maths": { //https://github.com/KaTeX/KaTeX
        "ng:crdt": "YText",
        "ng:n": "Maths",
        "ng:a": "TeX math rendering",
        "ng:compat": ["file:iana:application:x-tex","file:iana:text:x-tex"]
    },
    "doc:chemistry": { //GPL!! https://github.com/aeris-data/ChemDoodle/tree/master/ChemDoodleWeb-8.0.0 or https://github.com/aseevia/smiles-3d-vue 
        "ng:crdt": "YText",
        "ng:n": "Molecules (SMILES)",
        "ng:a": "simplified molecular-input line-entry system (SMILES)",
        "ng:compat": ["file:iana:chemical:x-daylight-smiles"] // https://en.wikipedia.org/wiki/SYBYL_line_notation and http://fileformats.archiveteam.org/wiki/Chemical_data
    },
    "doc:ancientscript": { //https://dn-works.com/ufas/ 
        "ng:crdt": "YText", // use Unicode and special fonts
        "ng:n": "Ancient Script",
        "ng:a": "Ancient Script",
        "ng:compat": [] 
    },
    "doc:braille": { //https://en.wikipedia.org/wiki/Braille_Patterns
        "ng:crdt": "YText", // use Unicode and special fonts
        "ng:n": "Braille Patterns",
        "ng:a": "Braille Patterns",
        "ng:compat": [] 
    },
    "media:image": {
        "ng:crdt": "Graph",
        "ng:n": "Image",
        "ng:a": "upload and display an image",
        "ng:o": "n:g:z:media",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["file:iana:image*","as:Image"]
    },
    "media:reel": {
        "ng:crdt": "Graph",
        "ng:n": "Reel",
        "ng:a": "upload and display a Reel (video from mobile)",
        "ng:o": "n:g:z:media",
        "ng:compat": ["file:iana:video*"]
    },
    "media:video": {
        "ng:crdt": "Graph",
        "ng:n": "Video",
        "ng:a": "upload and display a Video (and film)",
        "ng:o": "n:g:z:media",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["file:iana:video*","as:Video"]
    },
    "media:album": {
        "ng:crdt": "Graph",
        "ng:n": "Album",
        "ng:a": "Assemble several images and/or videos into an ordered Album",
        "ng:o": "n:g:z:gallery",
        "ng:include": ["data:collection"],
        "ng:compat": []
    },
    "media:audio": {
        "ng:crdt": "Graph",
        "ng:n": "Audio",
        "ng:a": "upload and play an Audio file, Audio note or Voice message",
        "ng:o": "n:g:z:media",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["file:iana:audio*","as:Audio"]
    },
    "media:song": {
        "ng:crdt": "Graph",
        "ng:n": "Song",
        "ng:a": "A song from an artist,album and/or lyrics",
        "ng:o": "n:g:z:media",
        "ng:x": {
            "music": "http://purl.org/ontology/mo/",
        },
        "ng:compat": ["music:MusicalWork","music:MusicArtist", "music:Lyrics"] 
        // see also https://polifonia-project.eu/wp-content/uploads/2022/01/Polifonia_D2.1_V1.0.pdf
        // Music ontology http://musicontology.com/docs/faq.html with data based on existing databases https://musicbrainz.org/doc/MusicBrainz_Database/Schema https://github.com/megaconfidence/open-song-database https://www.discogs.com/developers
    },  
    "media:subtitle": { //https://captioneasy.com/subtitle-file-formats/
        "ng:crdt": "YText", 
        "ng:n": "Subtitles",
        "ng:a": "Subtitles",
        "ng:compat": [] // TBD
    },
    "media:overlay": {
        "ng:crdt": "Graph",
        "ng:n": "Overlay",
        "ng:a": "Composition of an image, reel, text, icon, link, mention or other content into a layered content",
        "ng:o": "n:g:z:media",
        "ng:compat": []
    },
    "social:activity": {
        "ng:crdt": "Graph",
        "ng:n": "Activity",
        "ng:a": "Activity sent in a Stream",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["as:Activity"]
    },
    "social:channel": {
        "ng:crdt": "Graph",
        "ng:n": "Channel",
        "ng:a": "Broadcast channel with subscribers",
        "ng:compat": []
    }, 
    "social:stream": {
        "ng:crdt": "Graph",
        "ng:n": "Stream",
        "ng:a": "A document or store's stream branch",
        "ng:compat": []
    },
    "social:contact": {
        "ng:crdt": "Graph",
        "ng:n": "Contact", 
        "ng:a": "Contact: an Individual, Organization or Group",
        "ng:x": {
            "vcard":true,
            "foaf": true,
        },
        "ng:include": ["data:graph"],
        "ng:compat": ["foaf:Person","foaf:Agent","vcard:Individual", "vcard:Organization", "vcard:Group", "file:iana:text:vcard", "file:iana:application:vcard+json", "file:iana:application:vcard+xml" ],
    },
    "social:event": {
        "ng:crdt": "Graph",
        "ng:n": "Event",
        "ng:a": "An event occuring in specific location and time",
        "ng:x": {
            "as":true,
        },
        "ng:include": ["post:*"],
        "ng:compat": ["as:Event"]
    },
    "social:calendar": {
        "ng:crdt": "Graph",
        "ng:n": "Calendar",
        "ng:a": "A calendar where events are gathered",
        "ng:x": {
            "as":true,
            "time": true,
        },
        "ng:include": ["data:collection"],
        "ng:compat": ["time:TemporalEntity", "file:iana:text:calendar", "file:iana:application:calendar+xml", "file:iana:application:calendar+json"] //https://www.rfc-editor.org/rfc/rfc5545
    },
    "social:scheduler": {
        "ng:crdt": "Graph",
        "ng:n": "Scheduler",
        "ng:a": "Helps finding a common time slot for several participants to a future event",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["as:Invite","as:Reject","as:Accept","as:TentativeAccept","as:TentativeReject"]
    },
    "social:reaction": {
        "ng:crdt": "Graph",
        "ng:n": "Reaction",
        "ng:a": "A reaction by user to some content",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["as:Like", "as:Dislike", "as:Listen", "as:Read", "as:View"]
    },
    "social:chatroom": {
        "ng:crdt": "Graph",
        "ng:n": "ChatRoom",
        "ng:a": "A room for group chat",
    },
    "social:live": {
        "ng:crdt": "Graph",
        "ng:n": "Live",
        "ng:a": "A live session of video or audio, with optional chat",
    },
    "prod:task": {
        "ng:crdt": "Graph",
        "ng:n": "Task",
        "ng:a": "A task to be done",
        "ng:x": {
            "as":true,
            "pair": "http://virtual-assembly.org/ontologies/pair#",
        },
        "ng:include": ["post:*"],
        "ng:compat": ["pair:Task"] //see VTODO in iCalendar https://www.cs.utexas.edu/~mfkb/RKF/tree/components/specs/ontologies/Calendar-onto.html
        // see todo and todoList of Mobilizon https://framagit.org/framasoft/mobilizon/-/blob/main/lib/federation/activity_stream/converter/todo.ex 
        // https://framagit.org/framasoft/mobilizon/-/blob/main/lib/federation/activity_stream/converter/todo_list.ex
    },
    "prod:project": {
        "ng:crdt": "Graph",
        "ng:n": "Project",
        "ng:a": "A project management / KanBan",
        "ng:x": {
            "as":true,
            "pair": "http://virtual-assembly.org/ontologies/pair#",
        },
        "ng:include": ["post:*"],
        "ng:compat": ["pair:Project"] 
    },
    // see SRO https://www.researchgate.net/publication/350158531_From_a_Scrum_Reference_Ontology_to_the_Integration_of_Applications_for_Data-Driven_Software_Development
    // https://ceur-ws.org/Vol-1442/paper_4.pdf
    // see focalbaord, specially for their import scripts https://github.com/mattermost/focalboard/tree/main/import
    // and their data model https://github.com/mattermost/focalboard/tree/main/server/model
    // https://github.com/leif81/bzkanban
    // https://github.com/HigorLoren/donko (react)
    // https://github.com/trobonox/kanri (GPL, Vue)
    // https://github.com/waterrmalann/kards (vanilla JS)
    // see also https://github.com/wekan/wekan
    // see also https://taiga.io/ (for inspiration. as it is AGPL and python)
    // see also https://github.com/plankanban/planka (for inspiration. as it is AGPL and React)
    // see also https://kolaente.dev/vikunja/vikunja (for inspiration. AGPL. Vue and Go)
    // see also https://github.com/laurent22/joplin/ (for inspiration. AGPL)
    // see also https://github.com/SrGMC/kanbana
    /// svelte: https://github.com/V-Py/svelte-kanban
    // https://github.com/supabase-community/svelte-kanban
    // https://github.com/therosbif/kanban
    "prod:issue": {
        "ng:crdt": "Graph",
        "ng:n": "Issue",
        "ng:a": "An issue to be solved",
        "ng:x": {
            "as":true,
            "pair": "http://virtual-assembly.org/ontologies/pair#",
        },
        "ng:include": ["prod:task"],
        "ng:compat": ["pair:Challenge"] 
    },
    //https://github.com/go-gitea/gitea/issues/20232
    // datamodel of gitea issues: https://github.com/go-gitea/gitea/blob/165346c15c6d021028a65121e692a17ffc927e2c/models/issue.go#L35-L79
    "prod:form": {
        "ng:crdt": "Graph",
        "ng:n": "Form",
        "ng:a": "A form to be filled-in",
        "ng:x": {
            "form" : "http://rdf.danielbeeke.nl/form/form-dev.ttl#",
        },
        "ng:compat": ["form:*","file:iana:application:schema+json"] 
    },
    // https://jsonforms.io/docs/
    // https://github.com/jsonform/jsonform
    // https://jsonforms.io/docs/integrations/vue
    // >>> https://github.com/json-editor/json-editor
    // or >>> https://github.com/webgme/svelte-jsonschema-form
    // or >>> https://github.com/restspace/svelte-schema-form
    // see https://ceur-ws.org/Vol-1515/regular14.pdf
    // and https://github.com/protegeproject/facsimile
    // https://www.drupal.org/project/webform
    // see https://www.semantic-mediawiki.org/wiki/Extension:Page_Forms
    //  https://www.mediawiki.org/wiki/Extension:Page_Forms
    // https://rdf-form.danielbeeke.nl/
    // consider using Shapes
    "prod:filling": {
        "ng:crdt": "Graph",
        "ng:n": "Form filling",
        "ng:a": "A form that has been filled-in",
        "ng:compat": [] 
    },
    "prod:cad": { // https://mattferraro.dev/posts/cadmium
        "ng:crdt": "Automerge",
        "ng:n": "CAD",
        "ng:a": "CADmium",
        "ng:compat": []
    }, 
    "prod:spreadsheet": { 
        "ng:crdt": "Automerge",
        "ng:n": "Spreadsheet",
        "ng:a": "Spreadsheet",
        "ng:compat": []
    }, 
    "prod:slides": { //https://github.com/hakimel/reveal.js
        //https://pandoc.org/MANUAL.html#slide-shows
        "ng:crdt": "Graph",
        "ng:n": "Slides",
        "ng:a": "Slides and presentations",
        "ng:include": ["post:*"],
        "ng:compat": [] 
    },
    "prod:question" : {
        "ng:crdt": "Graph",
        "ng:n": "Question",
        "ng:a": "A question that needs answers",
        "ng:x": {
            "as":true,
        },
        "ng:include": ["post:*"],
        "ng:compat": ["as:Question"]
    }, 
    "prod:answer" :{
        "ng:crdt": "Graph",
        "ng:n": "Answer",
        "ng:a": "An answer to a question",
        "ng:x": {
            "as":true,
        },
        "ng:include": ["post:*"],
        "ng:compat": ["as:Note"]
    }, 
    "prod:poll" : {
        "ng:crdt": "Graph",
        "ng:n": "Poll",
        "ng:a": "A poll where people will vote",
        "ng:x": {
            "as":true,
        },
        "ng:include": ["post:*"],
        "ng:compat": ["as:Question"]
    }, 
    "prod:vote" : {
        "ng:crdt": "Graph",
        "ng:n": "Vote",
        "ng:a": "A vote cast for a Poll",
        "ng:x": {
            "as":true,
        },
        "ng:compat": ["as:Note"]
    }, 
    "file" : {
        "ng:crdt": "Graph",
        "ng:n": "File",
        "ng:a": "Binary file",
        "ng:o": "n:g:z:file_viewer",
        "ng:compat": []
    }, 
    "file:ng:wallet" : {
        "ng:n": "NextGraph Wallet File",
        "ng:a": "NextGraph Wallet File (.ngw)",
        "ng:compat": []
    }, 
    "file:ng:doc" : {
        "ng:n": "NextGraph Document File",
        "ng:a": "NextGraph Document File (.ngd)",
        "ng:compat": []
    },
    "file:ng:html" : {
        "ng:n": "NextGraph Document Html",
        "ng:a": "NextGraph Document Html standalone file",
        "ng:compat": []
    }, 
    "file:text" : {
        "ng:crdt": "Graph",
        "ng:n": "File",
        "ng:a": "Text file",
        "ng:o": "n:g:z:file_viewer",
        "ng:compat": ["file:iana:text:*", "file:iana:image:svg+xml", "file:iana:application:n-quads", "file:iana:application:trig", "file:iana:application:n-triples", "file:iana:application:rdf+xml", "file:iana:application:ld+json",
        "file:iana:application:xml", "file:iana:application:yaml", "file:iana:application:xhtml+xml", "file:iana:application:node","file:iana:application:sparql-results+json","file:iana:application:sparql-results+xml",
        "file:iana:message:rfc822","file:iana:multipart:related", "file:iana:text:vnd.graphviz", "file:iana:application:vnd.excalidraw+json", "file:iana:application:x-tex","file:iana:text:x-tex",
        "file:iana:application:vcard+json", "file:iana:application:vcard+xml", "file:iana:text:calendar", "file:iana:application:calendar+xml", "file:iana:application:calendar+json", 
        "file:iana:application:schema+json", "file:iana:application:geo+json", "file:iana:application:json" ] 
    }, 
    
};