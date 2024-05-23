fn main() {

    if std::env::var("DOCS_RS").is_ok() {
        println!("cargo:rustc-cfg=docsrs");
    }

}