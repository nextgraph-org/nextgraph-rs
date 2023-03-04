{
  description = "NextGraph";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-22.05";
  inputs.utils.url = "github:numtide/flake-utils";
  inputs.rust-overlay.url = "github:oxalica/rust-overlay";

  outputs = {
    self,
    nixpkgs,
    utils,
    rust-overlay,
  }:
    utils.lib.eachDefaultSystem (system: let
      overlays = [
        (import rust-overlay)
      ];
      pkgs = import nixpkgs rec {
        inherit system overlays;
      };
      rust = pkgs.rust-bin.stable."1.67.1".default.override {
        extensions = ["rust-src"];
      };
      buildRustPackage =
        (pkgs.makeRustPlatform {
          cargo = rust;
          rustc = rust;
        })
        .buildRustPackage;
      myNativeBuildInputs = with pkgs;
        [
          nodejs
          pkgconfig
          (rust-bin.stable.latest.default.override {
            targets = [ "wasm32-unknown-unknown" ];
          })
          wasm-pack
          wasm-bindgen-cli
        ]
        ++ lib.optionals stdenv.isLinux
        (with pkgs; [
          cargo-kcov
        ]);
      myBuildInputs = with pkgs;
        [
          openssl
        ]
        ++ lib.optionals stdenv.isDarwin
        (with darwin.apple_sdk.frameworks; [
          Security
        ]);
      myBuildRustPackage = attrs:
        buildRustPackage ({
            version = "0.1.0";
            src = ./.;
            cargoLock = {
              lockFile = ./Cargo.lock;
              outputHashes = {
                "lmdb-crypto-rs-0.14.0" = "sha256-HKbDK9jKPwYhPytdxnfwCFmve88Voy+cGZM2pt6xUjs=";
                "rkv-0.18.0" = "sha256-5+CU7z6FCUI2N8amMMaa2VBLI/LVQiRPaWA1Wkz6Q5A=";
              };
            };
            nativeBuildInputs = myNativeBuildInputs;
            buildInputs = myBuildInputs;
            RUST_BACKTRACE = 1;
          }
          // attrs);
    in rec {
      packages = rec {
        ngcli = myBuildRustPackage rec {
          pname = "ngcli";
          buildAndTestSubdir = "./ngcli";
        };
        ngd = myBuildRustPackage rec {
          pname = "ngd";
          buildAndTestSubdir = "./ngd";
        };
        ng-app-js = myBuildRustPackage rec {
          pname = "ng-app-js";
          buildAndTestSubdir = "./ng-app-js";
        };
        default = ngd;
      };

      apps = rec {
        ngd = utils.lib.mkApp {
          drv = packages.ngd;
          exePath = "/bin/ngd";
        };
        ngcli = utils.lib.mkApp {
          drv = packages.ngcli;
          exePath = "/bin/ngcli";
        };
        default = ngd;
      };
    });
}
