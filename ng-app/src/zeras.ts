
// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

// "n:g:z:hide" >> hides when in viewer mode
// "n:g:z:compose" >> a viewer made of a list of viewers (useful when different views on the same branch needs to be aggregated, or when the discrete is not composable - i.e it is not a Post)
//"n:g:z:json_ld_editor", "n:g:z:json_editor", "n:g:z:triple_editor", "n:g:z:rdf_viewer:turtle", "n:g:z:rdf_viewer:n3", "n:g:z:rdf_viewer:json_ld", "n:g:z:rdf_viewer:graph",
//"n:g:z:sparql_query:yasgui", "n:g:z:sparql_query:sparnatural", "n:g:z:graphql_query", "n:g:z:sparql_update:yasgui", "n:g:z:ontology_editor", "n:g:z:owl_viewer", "n:g:z:sparql:invoke", "n:g:z:graphql:invoke", "n:g:z:dump_download",
// "n:g:z:post_rich_editor", "n:g:z:post_md_editor", "n:g:z:code_editor", "n:g:z:file_viewer", "n:g:z:file_source", "n:g:z:crdt_source_viewer:xml", "n:g:z:crdt_source_viewer:md",  "n:g:z:crdt_source_viewer:json", "n:g:z:crdt_source_viewer:text", "n:g:z:crdt_source_viewer:rdf"
//"n:g:z:post:rich", "n:g:z:post:md", "n:g:z:text", "n:g:z:pre", "n:g:z:pad", "n:g:z:card", "n:g:z:gallery", "n:g:z:columns", "n:g:z:tree", "n:g:z:summary", "n:g:z:list", "n:g:z:grid", "n:g:z:list_n_post", "n:g:z:grid_n_post", "n:g:z:board", 
//"n:g:z:map", "n:g:z:chart", "n:g:z:pivot", "n:g:z:timeline", "n:g:z:email", "n:g:z:web_archive", "n:g:z:diagram_editor", "n:g:z:pdf", "n:g:z:latex", "n:g:z:media", "n:g:z:media_editor", 
//"n:g:z:service_editor", "n:g:z:service_invoke", "n:g:z:external_service_invoke", "n:g:z:contract", "n:g:z:text_query", "n:g:z:web_query", "n:g:z:scan_qrcode", "n:g:z:upload_file",
//"n:g:z:messenger", "n:g:z:group", "n:g:z:contact", "n:g:z:event", "n:g:z:calendar", "n:g:z:scheduler",
//"n:g:z:task", "n:g:z:project", "n:g:z:issue", "n:g:z:form_editor", "n:g:z:form_filler", "n:g:z:cad", "n:g:z:slides", "n:g:z:question", "n:g:z:poll",
//"n:g:z:app_store", "n:g:z:app_editor", "n:xxx.xx.xx:yy", "o:xx:yy:zz"

export const official_apps = {
    "n:g:z:sparql_update": {
        "ng:n": "SPARQL Update",
        "ng:a": "View, edit and invoke a Graph SPARQL Update",
        "ng:c": "app",
        "ng:u": "sparql_query",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:sparql_update",
        "ng:b": "SparqlUpdateEditor", // YASGUI of Zazuko https://github.com/zazuko/trifid/tree/main/packages/yasgui
        "ng:o": [],
        "ng:w": ["query:sparql_update","data:graph"],
    },
    "n:g:z:json_ld_editor": {
        "ng:n": "JSON-LD Editor",
        "ng:a": "Edit the RDF Graph as JSON-LD",
        "ng:c": "app", 
        "ng:u": "json_ld_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:json_ld_editor",
        "ng:b": "JsonLdEditor",
        "ng:w": ["data:graph"],
    },
    "n:g:z:json_yarray_editor": {
        "ng:n": "JSON Editor",
        "ng:a": "Edit the JSON data",
        "ng:c": "app", 
        "ng:u": "json_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:json_yarray_editor",
        "ng:b": "YArrayEditor",
        "ng:w": ["data:array"],
    },
    "n:g:z:json_automerge_editor": {
        "ng:n": "JSON Editor",
        "ng:a": "Edit the JSON data",
        "ng:c": "app", 
        "ng:u": "json_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:json_automerge_editor",
        "ng:b": "AutomergeEditor",
        "ng:w": ["data:json"],
        "full_width": true,
    },
    "n:g:z:json_ymap_editor": {
        "ng:n": "JSON Editor",
        "ng:a": "Edit the JSON data",
        "ng:c": "app", 
        "ng:u": "json_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:json_ymap_editor",
        "ng:b": "YMapEditor",
        "ng:w": ["data:map"],
    },
    "n:g:z:triple_editor": {
        "ng:n": "Graph Triples Editor",
        "ng:a": "Edit the RDF Graph as triples",
        "ng:c": "app", 
        "ng:u": "triple_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:triple_editor",
        "ng:b": "TripleEditor",
        "ng:w": ["data:graph"],
    },
    "n:g:z:rdf_viewer:turtle": { // https://github.com/highlightjs/highlightjs-turtle/tree/master
        "ng:n": "Turtle",
        "ng:a": "View the RDF Graph in Turtle format",
        "ng:c": "app", 
        "ng:u": "turtle_viewer",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:rdf_viewer:turtle",
        "ng:b": "TurtleViewer",
        "ng:o": ["data:graph"],
        "ng:w": [],
    },
    "n:g:z:sparql_query": {
        "ng:n": "SPARQL Query",
        "ng:a": "View, edit and invoke a Graph SPARQL query",
        "ng:c": "app", 
        "ng:u": "sparql_query",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:sparql_query",
        "ng:b": "SparqlQueryEditor", // YASGUI of Zazuko https://github.com/zazuko/trifid/tree/main/packages/yasgui
        "ng:o": ["data:graph"],
        "ng:w": ["query:sparql"],
    },
    "n:g:z:json_ld_viewer": {
        "ng:n": "JSON-LD",
        "ng:a": "View the RDF Graph as JSON-LD",
        "ng:c": "app", 
        "ng:u": "json_ld_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:json_ld_viewer",
        "ng:b": "JsonLdViewer",
        "ng:o": ["data:graph"],
    },
    "n:g:z:rdf_viewer:graph": {
        "ng:n": "Graph Explorer",
        "ng:a": "View the RDF Graph as interactive visualization",
        "ng:c": "app", 
        "ng:u": "graph_viewer",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:rdf_viewer:graph",
        "ng:b": "GraphViewer", // GraphExplorer https://github.com/zazuko/graph-explorer !! AGPL
        "ng:o": ["data:graph"],
        "ng:w": [],
    },
    "n:g:z:json_ymap_viewer": {
        "ng:n": "JSON",
        "ng:a": "View the JSON data",
        "ng:c": "app", 
        "ng:u": "json_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:json_ymap_viewer",
        "ng:b": "YMapViewer",
        "ng:o": ["data:map"],
    },
    "n:g:z:json_yarray_viewer": {
        "ng:n": "JSON",
        "ng:a": "View the JSON data",
        "ng:c": "app", 
        "ng:u": "json_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:json_yarray_viewer",
        "ng:b": "YArrayViewer",
        "ng:o": ["data:array"],
    },
    "n:g:z:json_automerge_viewer": {
        "ng:n": "JSON",
        "ng:a": "View the JSON data",
        "ng:c": "app", 
        "ng:u": "json_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:json_automerge_viewer",
        "ng:b": "AutomergeViewer",
        "ng:o": ["data:json"],
        "full_width": true,
    },
    "n:g:z:triple_viewer": {
        "ng:n": "Graph Triples",
        "ng:a": "View the RDF Graph as triples",
        "ng:c": "app", 
        "ng:u": "triple_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:triple_viewer",
        "ng:b": "TripleViewer",
        "ng:o": ["data:graph"],
    },
    "n:g:z:sparql_query:sparnatural": {
        "ng:n": "SPARNatural Query",
        "ng:a": "View, edit and invoke a Graph SPARQL query with SPARnatural tool",
        "ng:c": "app", 
        "ng:u": "sparnatural",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:sparql_query:sparnatural",
        "ng:b": "SparNaturalEditor",
        "ng:o": ["data:graph"],
        "ng:w": ["query:sparql"],
    },
    "n:g:z:graphql_query": {
        "ng:n": "GraphQL Query",
        "ng:a": "View, edit and invoke a GraphQL query",
        "ng:c": "app", 
        "ng:u": "graphql",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:graphql_query",
        "ng:b": "GraphqlEditor",
        "ng:o": ["data:graph"],
        "ng:w": ["query:graphql"],
    },
    "n:g:z:rdf_viewer:n3": { // ?
        "ng:n": "N3",
        "ng:a": "View the RDF Graph in N3 format",
        "ng:c": "app", 
        "ng:u": "rdf_viewer",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:rdf_viewer:n3",
        "ng:b": "N3Viewer",
        "ng:o": ["data:graph"],
        "ng:w": [],
    },
    "n:g:z:rdf_viewer:json_ld": { // highlight.js JSON
        "ng:n": "JSON-LD Source",
        "ng:a": "View the RDF Graph in JSON-LD format",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:rdf_viewer:json_ld",
        "ng:b": "JsonLdSourceViewer",
        "ng:o": ["data:graph"],
        "ng:w": [],
    },
    "n:g:z:ontology_editor": {
        "ng:n": "Ontology Editor",
        "ng:a": "Edit the Ontology",
        "ng:c": "app",
        "ng:u": "json_ld_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:ontology_editor",
        "ng:b": "JsonLdEditor",
        "ng:o": [],
        "ng:w": ["schema:*"],
    },
    "n:g:z:owl_viewer": {
        "ng:n": "OWL Ontology",
        "ng:a": "View the OWL Ontology",
        "ng:c": "app",
        "ng:u": "ontology_viewer",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:owl_viewer",
        "ng:b": "OwlViewer", // display with https://github.com/VisualDataWeb/WebVOWL
        "ng:o": ["schema:owl"],
        "ng:w": [],
    },
    "n:g:z:sparql:invoke": { // displayed with highlight.js https://github.com/highlightjs/highlightjs-turtle/tree/master
        "ng:n": "SPARQL Invoke",
        "ng:a": "View and invoke the saved SPARQL query",
        "ng:c": "app", 
        "ng:u": "invoke",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:sparql:invoke",
        "ng:b": "SparqlInvoker",
        "ng:o": ["query:sparql","query:sparql_update"],
        "ng:w": [],
    },
    "n:g:z:graphql:invoke": { 
        "ng:n": "GraphQL Invoke",
        "ng:a": "View and invoke the saved GraphQL query",
        "ng:c": "app", 
        "ng:u": "invoke",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:graphql:invoke",
        "ng:b": "GraphqlInvoker",
        "ng:o": ["query:graphql"],
        "ng:w": [],
    },
    "n:g:z:dump_download": {
        "ng:n": "Download",
        "ng:a": "Download a file containing a document exported data",
        "ng:c": "app", 
        "ng:u": "download",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_download",
        "ng:b": "Downloader",
        "ng:o": ["data:graph","file*","data:*"],
        "ng:w": [],
    },
    "n:g:z:post_rich_editor": {
        "ng:n": "Post Editor",
        "ng:a": "Edit the post with ProseMirror",
        "ng:c": "app", 
        "ng:u": "edit",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:post_rich_editor",
        "ng:b": "ProseMirrorEditor",
        "ng:o": [],
        "ng:w": ["post:rich"],
    },
    "n:g:z:post_md_editor": {
        "ng:n": "Post MD Editor",
        "ng:a": "Edit the post with MilkDown",
        "ng:c": "app", 
        "ng:u": "edit",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:post_md_editor",
        "ng:b": "MilkDownEditor",
        "ng:o": [],
        "ng:w": ["post:md"],
        "full_width": true,
    },
    "n:g:z:code_editor": {
        "ng:n": "Text Editor",
        "ng:a": "Edit the code/text with CodeMirror",
        "ng:c": "app", 
        "ng:u": "edit",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:code_editor",
        "ng:b": "CodeMirrorEditor",
        "ng:o": [],
        "ng:w": ["code*","post:text"],
    },
    "n:g:z:file_viewer": {
        "ng:n": "File details",
        "ng:a": "See details about this file",
        "ng:c": "app", 
        "ng:u": "file",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:file_viewer",
        "ng:b": "FileDetails",
        "ng:o": ["file*"],
        "ng:w": ["file*"], // in editor mode: can change the name, and delete the file
    },
    "n:g:z:file_source": { // only works for files containing text source (SVG, HTML, JS, CSS, etc...)
        "ng:n": "File source",
        "ng:a": "See the source code of this file",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:file_source",
        "ng:b": "FileSource",
        "ng:o": ["file:text"],
        "ng:w": [],
    },
    "n:g:z:crdt_source_viewer:xml": { 
        "ng:n": "XML source",
        "ng:a": "See the source code of this document, in XML",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:crdt_source_viewer:xml",
        "ng:b": "XmlSource", // displayed with highlight.js , with option to download
        "ng:o": ["post:rich","post:md","post:html","page","data:xml", "doc:diagram:drawio"],
        "ng:w": [],
    },
    "n:g:z:viewer:md": { 
        "ng:n": "MarkDown source",
        "ng:a": "See the MarkDown source of this document",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:viewer:md",
        "ng:b": "MdSource", // displayed with highlight.js , with option to download
        "ng:o": ["post:md"],
        "ng:w": [],
    },
    "n:g:z:crdt_source_viewer:json": { 
        "ng:n": "JSON Source",
        "ng:a": "See the source code of this document, in JSON",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:crdt_source_viewer:json",
        "ng:b": "AutomergeJsonSource", // displayed with highlight.js , with option to download
        "ng:o": ["data:json", "data:table", "doc:diagram:jsmind", "doc:diagram:gantt", "doc:diagram:excalidraw", "doc:viz:*", "doc:chart:*", "prod:cad"],
        "ng:w": [],
    },
    "n:g:z:crdt_source_viewer:ymap": { 
        "ng:n": "JSON Source",
        "ng:a": "See the source code of this document, in JSON",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:crdt_source_viewer:ymap",
        "ng:b": "YMapSource", // displayed with highlight.js , with option to download
        "ng:o": ["data:map"],
        "ng:w": [],
    },
    "n:g:z:crdt_source_viewer:yarray": { 
        "ng:n": "JSON Source",
        "ng:a": "See the source code of this document, in JSON",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:crdt_source_viewer:yarray",
        "ng:b": "YArraySource", // displayed with highlight.js , with option to download
        "ng:o": ["data:array"],
        "ng:w": [],
    },
    "n:g:z:crdt_source_viewer:text": {
        "ng:n": "Text source",
        "ng:a": "See the source code of this document, in plain-text",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:crdt_source_viewer:text",
        "ng:b": "TextViewer", // displayed with highlight.js , with option to download
        "ng:o": ["post:asciidoc", "service*", "contract", "query:sparql*","query:graphql","doc:diagram:mermaid","doc:diagram:graphviz","doc:diagram:flowchart",
                "doc:diagram:sequence","doc:diagram:markmap","doc:diagram:mymind","doc:music*", "doc:maths", "doc:chemistry", "doc:ancientscript", "doc:braille", "media:subtitle"],
        "ng:w": [],
    },
    "n:g:z:crdt_source_viewer:rdf": {
        "ng:n": "RDF source",
        "ng:a": "See the source graph of this document, in RDF (turtle)",
        "ng:c": "app", 
        "ng:u": "source",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:crdt_source_viewer:rdf",
        "ng:b": "TurtleViewer", //, with option to download
        "ng:o": ["data:graph"],
        "ng:w": [],
    },
    "n:g:z:post:rich": {
        "ng:n": "Post",
        "ng:a": "View a Rich Post",
        "ng:c": "app", 
        "ng:u": "post",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:post:rich",
        "ng:b": "ProseMirrorViewer", // https://www.npmjs.com/package/prosemirror-to-html-js or https://prosemirror.net/docs/ref/version/0.4.0.html#toDOM https://prosemirror.net/docs/ref/version/0.4.0.html#toHTML
        "ng:o": ["post:rich"],
        "ng:w": [],
    },
    "n:g:z:post:md": {
        "ng:n": "Post",
        "ng:a": "View a Markdown Post",
        "ng:c": "app", 
        "ng:u": "post",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:post:md",
        "ng:b": "PostMdViewer", // https://github.com/wooorm/markdown-rs
        "ng:o": ["post:md"],
        "ng:w": [],
    },
    "n:g:z:compose:editor": {
        "ng:n": "Composition Editor",
        "ng:a": "Compose several blocks into a single document",
        "ng:c": "app", 
        "ng:u": "compose",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:compose:editor",
        "ng:b": "ComposeEditor",
        "ng:w": ["doc:compose"],
    },
    "n:g:z:compose:viewer": {
        "ng:n": "Composition",
        "ng:a": "Composition of several blocks",
        "ng:c": "app", 
        "ng:u": "compose",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:compose:viewer",
        "ng:b": "ComposeViewer",
        "ng:o": ["doc:compose"],
    },
    "n:g:z:post:text": {
        "ng:n": "Text",
        "ng:a": "View a Text Post",
        "ng:c": "app", 
        "ng:u": "post",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:post:text", 
        "ng:b": "TextViewer",
        "ng:o": ["post:text"],
        "ng:w": [],
    },
    "n:g:z:pre": {
        "ng:n": "Source Code",
        "ng:a": "View a Source Code",
        "ng:c": "app", 
        "ng:u": "post",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:pre", 
        "ng:b": "TextViewer", // displayed with highlight.js 
        "ng:o": ["code*"],
        "ng:w": [],
    },
    "n:g:z:pad": {
        "ng:n": "Pad",
        "ng:a": "Pad view of a document",
        "ng:c": "app", 
        "ng:u": "pad",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:pad", 
        "ng:b": "Pad",
        "ng:o": ["plato/pad"],
        "ng:w": [],
    },
    "n:g:z:card": {
        "ng:n": "Card",
        "ng:a": "Card view of a document",
        "ng:c": "app", 
        "ng:u": "card",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:card", 
        "ng:b": "Card",
        "ng:o": ["plato/card"],
        "ng:w": [],
    },
    "n:g:z:gallery": {
        "ng:n": "Gallery",
        "ng:a": "Gallery view of an album or collection",
        "ng:c": "app", 
        "ng:u": "gallery",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:gallery", 
        "ng:b": "Gallery",
        "ng:o": ["media:album","data:collection"],
        "ng:w": [],
    },
    "n:g:z:app_store": {
        "ng:n": "App Store",
        "ng:a": "Install or remove Apps of NextGraph ecosystem",
        "ng:c": "app", 
        "ng:u": "app_store",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:app_store", 
        "ng:b": "AppStore",
        "ng:o": ["app:z"],
        "ng:w": [],
    },
    "n:g:z:app_editor": {
        "ng:n": "App editor",
        "ng:a": "Create and modify Apps with NextGraph IDE",
        "ng:c": "app", 
        "ng:u": "app_editor",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:app_editor", 
        "ng:b": "AppEditor",
        "ng:o": ["app:z"],
        "ng:w": ["app:z"],
    },
    "n:g:z:container": {
        "ng:n": "Container",
        "ng:a": "See the content of document as a Container",
        "ng:c": "app", 
        "ng:u": "container",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:container", 
        "ng:b": "ContainerView",
        "ng:o": ["data:collection","data:container"],
        "ng:w": ["data:collection","data:container"],
    },
    "n:g:z:grid": {
        "ng:n": "Grid",
        "ng:a": "See the content of document as a grid",
        "ng:c": "app", 
        "ng:u": "grid",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:grid", 
        "ng:b": "GridView",
        "ng:o": ["data:grid"],
        "ng:w": ["data:grid"],
    },
    "n:g:z:media": {
        "ng:n": "Media",
        "ng:a": "View media",
        "ng:c": "app", 
        "ng:u": "view",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:media", 
        "ng:b": "MediaView",
        "ng:o": ["media:*"],
        "ng:w": [],
    },
    "n:g:z:service_editor": {
        "ng:n": "Service Editor",
        "ng:a": "Write and define a Service in Rust or JS/Deno",
        "ng:c": "app", 
        "ng:u": "edit",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:service_editor",
        "ng:b": "CodeMirrorEditor",
        "ng:o": [],
        "ng:w": ["service:*"],
    },
    "n:g:z:service_invoke": {
        "ng:n": "Service Invoker",
        "ng:a": "Invoke internal Service, with optional arguments",
        "ng:c": "app", 
        "ng:u": "invoke",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:service_invoke",
        "ng:b": "ServiceInvoker",
        "ng:o": ["service"],
        "ng:w": [],
    },
    "n:g:z:external_service_invoke": {
        "ng:n": "Service Invoker",
        "ng:a": "Invoke the Service, with optional arguments",
        "ng:c": "app", 
        "ng:u": "invoke",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:external_service_invoke",
        "ng:b": "ExternalServiceInvoker",
        "ng:o": ["service:*"],
        "ng:w": [],
    },
    "n:g:z:upload_file": {
        "ng:n": "Upload binary file",
        "ng:a": "Upload a binary file into the Document",
        "ng:c": "app", 
        "ng:u": "load",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:upload_file",
        "ng:b": "UploadFile",
        "ng:o": [],
        "ng:w": [],
    },
    "n:g:z:import_file": {
        "ng:n": "Import from external file",
        "ng:a": "Import an external file with compatible format",
        "ng:c": "app", 
        "ng:u": "load_graph",//favicon. can be a did:ng:j 
        "ng:g": "n:g:z:import_file",
        "ng:b": "UploadFile",
        "ng:o": [],
        "ng:w": ["data:graph"],
    },
    // TODO: "n:g:z:columns", "n:g:z:tree", "n:g:z:summary", "n:g:z:list_n_post", "n:g:z:grid_n_post", "n:g:z:board", 
    // TODO: "n:g:z:map", "n:g:z:chart", "n:g:z:pivot", "n:g:z:timeline", "n:g:z:email", "n:g:z:web_archive", "n:g:z:diagram_editor", "n:g:z:pdf", "n:g:z:latex", "n:g:z:media_editor", 
    // TODO: "n:g:z:contract", "n:g:z:text_query", "n:g:z:web_query", "n:g:z:scan_qrcode", 
    // TODO: "n:g:z:messenger", "n:g:z:group", "n:g:z:contact", "n:g:z:event", "n:g:z:calendar", "n:g:z:scheduler",
    // TODO: "n:g:z:task", "n:g:z:project", "n:g:z:issue", "n:g:z:form_editor", "n:g:z:form_filler", "n:g:z:cad", "n:g:z:slides", "n:g:z:question", "n:g:z:poll",

};


// OFFICIAL SERVICES
//"n:g:z:dump_rdf:turtle", "n:g:z:dump_rdf:n3", "n:g:z:dump_rdf:json_ld", "n:g:z:load_rdf:turtle", "n:g:z:load_rdf:n3", "n:g:z:load_rdf:json_ld", "n:g:z:load_file", "n:g:z:dump_file", 
//"n:g:z:dump_json", "n:g:z:dump_xml", "n:g:z:dump_text", "n:g:z:load_json", "n:g:z:load_xml", "n:g:z:load_text", "n:g:z:load_md", "n:g:z:sparql_query", "n:g:z:sparql_update", "n:g:z:dump_crdt_source", "n:g:z:dump_ng_html_file", "n:g:z:dump_ng_file"

export const official_services = {
    "n:g:z:dump_rdf:turtle": {
        "ng:n": "Turtle export",
        "ng:a": "Export quads of RDF Graphs in Turtle format",
        "ng:c": "service",
        "ng:u": "data",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_rdf:turtle",
        "ng:o": ["data:graph"],
        "ng:w": [],
        "ng:result": ["file:iana:text:turtle"],
    },
    "n:g:z:dump_rdf:n3": {
        "ng:n": "N3 export",
        "ng:a": "Export quads of RDF Graphs in N3 format",
        "ng:c": "service",
        "ng:u": "data",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_rdf:n3",
        "ng:o": ["data:graph"],
        "ng:w": [],
        "ng:result": ["file:iana:text:n3"],
    },
    "n:g:z:dump_rdf:json_ld": {
        "ng:n": "JSON-LD export",
        "ng:a": "Export quads of RDF Graphs in JSON-LD format",
        "ng:c": "service",
        "ng:u": "data",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_rdf:json_ld",
        "ng:o": ["data:graph"],
        "ng:w": [],
        "ng:result": ["file:iana:application:ld+json"],
    },
    "n:g:z:load_rdf:turtle": {
        "ng:n": "Import Turtle triples",
        "ng:a": "Import Turtle triples into the document",
        "ng:c": "service",
        "ng:u": "load_graph",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:load_rdf:turtle",
        "ng:o": [],
        "ng:w": ["data:graph"],
    },
    "n:g:z:load_rdf:n3": {
        "ng:n": "Import N3 triples",
        "ng:a": "Import N3 triples into the document",
        "ng:c": "service",
        "ng:u": "load_graph",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:load_rdf:n3",
        "ng:o": [],
        "ng:w": ["data:graph"],
    },
    "n:g:z:load_rdf:json_ld": {
        "ng:n": "Import JSON-LD triples",
        "ng:a": "Import JSON-LD triples into the document",
        "ng:c": "service",
        "ng:u": "load_graph",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:load_rdf:json_ld",
        "ng:o": [],
        "ng:w": ["data:graph"],
    },
    "n:g:z:load_file": {
        "ng:n": "Add file",
        "ng:a": "Add a binary file in the document",
        "ng:c": "service",
        "ng:u": "load",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:load_file",
        "ng:o": [],
        "ng:w": ["data:graph"],
    },
    "n:g:z:dump_file": {
        "ng:n": "Export File",
        "ng:a": "Get the binary content of a file",
        "ng:c": "service",
        "ng:u": "dump",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_file",
        "ng:o": ["file*"],
        "ng:result": ["file:iana:*"],
    },
    "n:g:z:dump_json": {
        "ng:n": "Export JSON",
        "ng:a": "Export JSON content of document",
        "ng:c": "service",
        "ng:u": "data",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_json",
        "ng:o": ["data:json", "data:map", "data:array", "data:table", "doc:diagram:jsmind", "doc:diagram:gantt", "doc:diagram:excalidraw", "doc:viz:*", "doc:chart:*", "prod:cad"],
        "ng:w": [],
        "ng:result": ["file:iana:application:json"],
    },
    "n:g:z:dump_xml": {
        "ng:n": "Export XML",
        "ng:a": "Export XML content of document",
        "ng:c": "service",
        "ng:u": "data",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_xml",
        "ng:o": ["post:rich","post:md","post:html","page","data:xml", "doc:diagram:drawio"],
        "ng:w": [],
        "ng:result": ["file:iana:text:xml"],
    },
    "n:g:z:dump_text": {
        "ng:n": "Export Text",
        "ng:a": "Export plain-text content of document",
        "ng:c": "service",
        "ng:u": "dump",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_text",
        "ng:o": ["post:text", "post:asciidoc", "code*", "service*", "contract", "query:sparql*","query:graphql","doc:diagram:mermaid","doc:diagram:graphviz","doc:diagram:flowchart",
        "doc:diagram:sequence","doc:diagram:markmap","doc:diagram:mymind","doc:music*", "doc:maths", "doc:chemistry", "doc:ancientscript", "doc:braille", "media:subtitle"],
        "ng:w": [],
        "ng:result": ["file:iana:text:plain"],
    },
    "n:g:z:dump_ng_html_file": {
        "ng:n": "NextGraph Standalone file",
        "ng:a": "Get a standalone HTML file of this Document",
        "ng:c": "service",
        "ng:u": "ext",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_ng_html_file",
        "ng:o": ["data:graph"],
        "ng:w": [],
        "ng:result": ["file:iana:text:html"],
    },
    "n:g:z:load_json": {
        "ng:n": "Import JSON",
        "ng:a": "Import some JSON into the document",
        "ng:c": "service",
        "ng:u": "load",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:load_json",
        "ng:o": [],
        "ng:w": ["data:json","data:map", "data:array"],
    },
    "n:g:z:load_xml": {
        "ng:n": "Import XML",
        "ng:a": "Import some XML into the document",
        "ng:c": "service",
        "ng:u": "load",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:load_xml",
        "ng:o": [],
        "ng:w": ["data:xml"],
    },
    "n:g:z:load_text": {
        "ng:n": "Import Text",
        "ng:a": "Import plain text into the document",
        "ng:c": "service",
        "ng:u": "load",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:load_text",
        "ng:o": [],
        "ng:w": ["post:text","post:rich","post:md","code*"],
    },
    "n:g:z:load_md": {
        "ng:n": "Import Markdown",
        "ng:a": "Import some Markdown into the document",
        "ng:c": "service",
        "ng:u": "load",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:load_md",
        "ng:o": [],
        "ng:w": ["post:md"],
    },
    "n:g:z:sparql_query": {
        "ng:n": "SPARQL query",
        "ng:a": "Invoke a SPARQL Query",
        "ng:c": "service",
        "ng:u": "sparql_query",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:sparql_query",
        "ng:o": ["data:graph"],
        "ng:w": [],
        "ng:result": ["file:iana:application:sparql-results+json","file:iana:application:json"]
    },
    "n:g:z:sparql_update": {
        "ng:n": "SPARQL update",
        "ng:a": "Invoke a SPARQL Update",
        "ng:c": "service",
        "ng:u": "sparql_query",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:sparql_update",
        "ng:o": [],
        "ng:w": ["data:graph"],
    },
    "n:g:z:dump_crdt_source": { // uses dump_rdf, dump_text, dump_json or dump_xml depending on the CRDT type
        "ng:n": "Export source",
        "ng:a": "Export source of document as text file",
        "ng:c": "service",
        "ng:u": "source",// favicon. can be a did:ng:j 
        "ng:g": "n:g:z:dump_crdt_source",
        "ng:o": ["data:graph"],
        "ng:w": [],
        "ng:result": ["file:iana:*"]
    },
};