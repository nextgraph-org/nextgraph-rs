// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck deal with it later
import {wallets, active_wallet, opened_wallets} from "./store";
import {init_api} from "../.auth-react/api";
import { default as ng } from "../.auth-react/api";

let unsubscribe = () => {};

let unsub_main_close;

let tauri_platform = import.meta.env.TAURI_ENV_PLATFORM;

export const bootstrap_native = async function() {
    console.log("native store initializing")
    let native_api = await import("../native-api");
    console.log(native_api.default);
    init_api(native_api.default);

    let walls = await ng.get_wallets();
    wallets.set(walls);

    unsubscribe = active_wallet.subscribe(async (value) => {
    if (value) {
        if (value.wallet) {
        opened_wallets.update((w) => {
            w[value.id] = value.wallet;
            return w;
        });
        } else {
        await ng.wallet_close(value.id);
        active_wallet.set(undefined);
        opened_wallets.update((w) => {
            delete w[value.id];
            return w;
        });
        //TODO push("#/wallet/login");
        }
    }
    });
    if (tauri_platform!="android" && tauri_platform!="ios") {
        let window_api = await import("@tauri-apps/api/window");
        let main = await window_api.Window.getByLabel("main");
        unsub_main_close = await main.onCloseRequested(async (event) => {
            //console.log("onCloseRequested main");
            await main.emit("close_all", {});
            let registration = await window_api.Window.getByLabel("registration");
            if (registration) {
                await registration.close();
            }
            let viewer = await window_api.Window.getByLabel("viewer");
            if (viewer) {
                await viewer.close();
            }
        });
    }
};