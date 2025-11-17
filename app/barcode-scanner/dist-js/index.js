import { invoke, checkPermissions as checkPermissions$1, requestPermissions as requestPermissions$1 } from '@tauri-apps/api/core';

// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT
var Format;
(function (Format) {
    Format["QRCode"] = "QR_CODE";
    /**
     * Not supported on iOS.
     */
    Format["UPC_A"] = "UPC_A";
    Format["UPC_E"] = "UPC_E";
    Format["EAN8"] = "EAN_8";
    Format["EAN13"] = "EAN_13";
    Format["Code39"] = "CODE_39";
    Format["Code93"] = "CODE_93";
    Format["Code128"] = "CODE_128";
    /**
     * Not supported on iOS.
     */
    Format["Codabar"] = "CODABAR";
    Format["ITF"] = "ITF";
    Format["Aztec"] = "AZTEC";
    Format["DataMatrix"] = "DATA_MATRIX";
    Format["PDF417"] = "PDF_417";
    /**
     * Not supported on Android. Requires iOS 15.4+
     */
    Format["GS1DataBar"] = "GS1_DATA_BAR";
    /**
     * Not supported on Android. Requires iOS 15.4+
     */
    Format["GS1DataBarLimited"] = "GS1_DATA_BAR_LIMITED";
    /**
     * Not supported on Android. Requires iOS 15.4+
     */
    Format["GS1DataBarExpanded"] = "GS1_DATA_BAR_EXPANDED";
})(Format || (Format = {}));
/**
 * Start scanning.
 * @param options
 */
async function scan(options) {
    return await invoke('plugin:barcode-scanner|scan', { ...options });
}
/**
 * Cancel the current scan process.
 */
async function cancel() {
    await invoke('plugin:barcode-scanner|cancel');
}
/**
 * Get permission state.
 */
async function checkPermissions() {
    return await checkPermissions$1('barcode-scanner').then((r) => r.camera);
}
/**
 * Request permissions to use the camera.
 */
async function requestPermissions() {
    return await requestPermissions$1('barcode-scanner').then((r) => r.camera);
}
/**
 * Open application settings. Useful if permission was denied and the user must manually enable it.
 */
async function openAppSettings() {
    await invoke('plugin:barcode-scanner|open_app_settings');
}

export { Format, cancel, checkPermissions, openAppSettings, requestPermissions, scan };
