export function client_details() {
    return window.navigator.userAgent;
}

export function client_details2(obj,version) {
    //console.log("version",version)
    obj.browser.appVersion = navigator?.appVersion;
    obj.browser.arch = navigator?.platform;
    obj.browser.vendor = navigator?.vendor;
    obj.browser.ua = window.navigator.userAgent;
    obj.engine.sdk = version;
    return JSON.stringify(obj);
}

export function session_save(key,value) {
    try {
        sessionStorage.setItem(key, value);

    } catch(e) {
        console.error(e);
        return e.message;
    }
}

export function session_get(key) {

    try {
        return sessionStorage.getItem(key);

    } catch(e) {
        console.error(e);
    }
    
}

export function local_save(key,value) {
    try {
        localStorage.setItem(key, value);

    } catch(e) {
        console.error(e);
        return e.message;
    }
}

export function local_get(key) {

    try {
        return localStorage.getItem(key);

    } catch(e) {
        console.error(e);
    }
    
}