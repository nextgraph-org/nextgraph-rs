// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

pub mod types;

pub mod block_storage;

pub mod block;

pub mod object;

pub mod file;

pub mod commit;

pub mod branch;

pub mod repo;

pub mod site;

pub mod event;

pub mod utils;

pub mod errors;

pub mod kcv_storage;

pub mod os_info;

#[macro_use]
extern crate slice_as_array;

pub mod log {

    #[cfg(not(target_arch = "wasm32"))]
    pub use debug_print::debug_println;
    #[cfg(target_arch = "wasm32")]
    pub use gloo_timers;
    #[cfg(not(target_arch = "wasm32"))]
    pub use log;

    #[cfg(target_arch = "wasm32")]
    use wasm_bindgen::prelude::*;

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    extern "C" {
        // Use `js_namespace` here to bind `console.log(..)` instead of just
        // `log(..)`
        #[wasm_bindgen(js_namespace = console)]
        pub fn log(s: &str);

        #[wasm_bindgen(js_namespace = console)]
        pub fn warn(s: &str);

        #[wasm_bindgen(js_namespace = console)]
        pub fn error(s: &str);

        // The `console.log` is quite polymorphic, so we can bind it with multiple
        // signatures. Note that we need to use `js_name` to ensure we always call
        // `log` in JS.
        #[wasm_bindgen(js_namespace = console, js_name = log)]
        fn log_u32(a: u32);

        // Multiple arguments too!
        #[wasm_bindgen(js_namespace = console, js_name = log)]
        fn log_many(a: &str, b: &str);
    }

    #[cfg(all(not(feature = "server_log_output"), not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_info {
    ($($t:tt)*) => (println!("INFO:{}",format!($($t)*)))
}

    #[cfg(all(not(feature = "server_log_output"), not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_err {
    ($($t:tt)*) => (println!("ERR:{}",format!($($t)*)))
}

    #[cfg(all(not(feature = "server_log_output"), not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_warn {
    ($($t:tt)*) => (println!("WARN:{}",format!($($t)*)))
}

    #[cfg(all(not(feature = "server_log_output"), not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_debug {
    ($($t:tt)*) => (debug_println!("DEBUG:{}",format!($($t)*)))
}

    #[cfg(all(not(feature = "server_log_output"), not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_trace {
    ($($t:tt)*) => (debug_println!("TRACE:{}",format!($($t)*)))
}

    #[cfg(all(feature = "server_log_output", not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_info {
    ($($t:tt)*) => (log::info!($($t)*))
}

    #[cfg(all(feature = "server_log_output", not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_err {
    ($($t:tt)*) => (log::error!($($t)*))
}

    #[cfg(all(feature = "server_log_output", not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_warn {
    ($($t:tt)*) => (log::warn!($($t)*))
}

    #[cfg(all(feature = "server_log_output", not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_debug {
    ($($t:tt)*) => (log::debug!($($t)*))
}

    #[cfg(all(feature = "server_log_output", not(target_arch = "wasm32")))]
    #[macro_export]
    macro_rules! log_trace {
    ($($t:tt)*) => (log::trace!($($t)*))
}

    #[cfg(target_arch = "wasm32")]
    #[macro_export]
    macro_rules! log_info {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

    #[cfg(target_arch = "wasm32")]
    #[macro_export]
    macro_rules! log_err {
    ($($t:tt)*) => (error(&format_args!($($t)*).to_string()))
}

    #[cfg(target_arch = "wasm32")]
    #[macro_export]
    macro_rules! log_warn {
    ($($t:tt)*) => (warn(&format_args!($($t)*).to_string()))
}

    #[cfg(all(debug_assertions, target_arch = "wasm32"))]
    #[macro_export]
    macro_rules! log_debug {
    ($($t:tt)*) => (log(&format!("DEBUG:{}",&format_args!($($t)*).to_string()).to_string()))
}

    #[cfg(all(debug_assertions, target_arch = "wasm32"))]
    #[macro_export]
    macro_rules! log_trace {
    ($($t:tt)*) => (log(&format!("TRACE:{}",&format_args!($($t)*).to_string()).to_string()))
}

    #[cfg(all(not(debug_assertions), target_arch = "wasm32"))]
    #[macro_export]
    macro_rules! log_debug {
        ($($t:tt)*) => {};
    }

    #[cfg(all(not(debug_assertions), target_arch = "wasm32"))]
    #[macro_export]
    macro_rules! log_trace {
        ($($t:tt)*) => {};
    }

    #[cfg(target_arch = "wasm32")]
    #[macro_export]
    macro_rules! sleep {
    ($($t:tt)*) => (gloo_timers::future::sleep($($t)*).await)
}

    #[cfg(not(target_arch = "wasm32"))]
    #[macro_export]
    macro_rules! sleep {
    ($($t:tt)*) => (std::thread::sleep($($t)*))
}

    pub use log_debug;
    pub use log_err;
    pub use log_info;
    pub use log_trace;
    pub use log_warn;
    pub use sleep;
}
