#![doc(test(attr(deny(warnings))))]
#![doc(test(attr(allow(deprecated))))]
#![cfg_attr(docsrs, feature(doc_auto_cfg))]
#![doc(html_favicon_url = "https://raw.githubusercontent.com/oxigraph/oxigraph/main/logo.svg")]
#![doc(html_logo_url = "https://raw.githubusercontent.com/oxigraph/oxigraph/main/logo.svg")]

pub mod oxigraph;

pub mod oxrdf;

pub mod oxrdfio;

pub mod oxsdatatypes;

pub mod oxttl;

pub mod oxrdfxml;

pub mod sparesults;

pub mod spargebra;

pub mod sparopt;
