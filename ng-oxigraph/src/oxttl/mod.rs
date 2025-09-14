mod lexer;
mod line_formats;
pub mod n3;
pub mod nquads;
pub mod ntriples;
mod terse;
mod toolkit;
pub mod trig;
pub mod turtle;

pub use crate::oxttl::n3::N3Parser;
pub use crate::oxttl::nquads::{NQuadsParser, NQuadsSerializer};
pub use crate::oxttl::ntriples::{NTriplesParser, NTriplesSerializer};
pub use crate::oxttl::toolkit::{TextPosition, TurtleParseError, TurtleSyntaxError};
pub use crate::oxttl::trig::{TriGParser, TriGSerializer};
pub use crate::oxttl::turtle::{TurtleParser, TurtleSerializer};

pub(crate) const MIN_BUFFER_SIZE: usize = 4096;
pub(crate) const MAX_BUFFER_SIZE: usize = 4096 * 4096;
