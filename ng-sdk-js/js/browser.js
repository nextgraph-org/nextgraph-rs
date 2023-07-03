import {version} from '../../../package.json';

export function client_details() {
    return window.navigator.userAgent;
}

export function client_details2(obj) {
    obj.browser.appVersion = navigator?.appVersion;
    obj.browser.arch = navigator?.platform;
    obj.browser.vendor = navigator?.vendor;
    obj.browser.ua = window.navigator.userAgent;
    obj.engine.sdk = version;
    return JSON.stringify(obj);
}
