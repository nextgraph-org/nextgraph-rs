use os_info;
use serde_json::{json, to_string_pretty, Value};

pub fn get_os_info() -> Value {
    let arch = std::env::consts::ARCH;
    let machine = match arch {
        "ia32" => "x86",
        "x64" => "x86_64",
        "i386" => "x86",
        "i686" => "x86",
        "amd64" => "x86_64",
        "arm64" => "aarch64",
        "powerpc" => "ppc",
        "powerpc64" => "ppc64",
        _ => arch,
    };

    let info = os_info::get();
    let os_type = info.os_type();
    let os_name = match os_type {
        os_info::Type::Macos => "macOS".to_string(),
        _ => format!("{:?}", os_type),
    };

    let val = json!({
        "uname": {
            "os_name": os_name,
            "version": info.version().to_string(),
            "arch": info.architecture().map(|s| s.into()).unwrap_or(Value::Null),
            "bitness": format!("{:?}",info.bitness()),
            "codename": info.codename().map(|s| s.into()).unwrap_or(Value::Null),
            "edition": info.edition().map(|s| s.into()).unwrap_or(Value::Null),
        },
        "rust": {
            "family": std::env::consts::FAMILY,
            "os_name": match std::env::consts::OS {
                "linux" => "Linux",
                "macos" => "macOS",
                "ios" => "iOS",
                "freebsd" => "FreeBSD",
                "dragonfly" => "DragonFly",
                "netbsd" => "NetBSD",
                "openbsd" => "OpenBSD",
                "solaris" => "Solaris",
                "android" => "Android",
                "windows" => "Windows",
                _ => std::env::consts::OS,
            },
            "arch": machine,
            "debug": cfg!(debug_assertions),
            "target": current_platform::CURRENT_PLATFORM,
        }
    });
    //println!("{}", to_string_pretty(&val).unwrap());
    val
}
