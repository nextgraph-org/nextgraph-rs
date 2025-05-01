use std::process::Command;
use std::env;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=src");

    let out_dir = env::var("OUT_DIR").unwrap();
    //println!("{out_dir}");
//pnpm -C ./helpers/app-auth install
//pnpm -C ./helpers/app-auth build

    Command::new("pnpm").args(&["install"]).status().unwrap();
    Command::new("pnpm").args(&["webfilebuild"]).status().unwrap();
}
