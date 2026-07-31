import {readFileSync, writeFileSync, mkdirSync, rmSync, cpSync} from "fs";
import { execSync } from "child_process";

const firstArg = process.argv[2];
const build = firstArg == "build";

if (build) console.log("BUILD mode");

const appstore_file = readFileSync("appstore.json");
let appstore: string[] = JSON.parse(appstore_file.toString());
let appstore_dev: Record<string,boolean> = {};
try {
    const appstore_dev_file = readFileSync("appstore.dev.json");
    appstore_dev = JSON.parse(appstore_dev_file.toString());
} catch (e) {}
let registry : Record<string, {port: number, package: string, dev: boolean, entries: Record<string, string>}> = {};

if (build) {
    rmSync("./public",{ recursive: true, force: true });
    mkdirSync("./public/z", {recursive: true});
}

for (const app of appstore) {

    const manifest_file = readFileSync(`../${app}/src/ng-manifest.json`);
    const manifest = JSON.parse(manifest_file.toString());
    let entries: Record<string, string> = {};
    for (const entry of manifest.entryPoints) {
        entries[entry.name] = entry.path;
    }
    registry[manifest.name] = {
        port: manifest.port,
        package: app,
        dev: appstore_dev[app],
        entries
    };

    if (!appstore_dev[app] && build) {
        // build for prod
        console.log(`Building ${manifest.name} ...`);
        console.log(`pnpm -C ../${app} build`);
        execSync(`npx cross-env NG_ENV_DIST_FOLDER="/z/${manifest.name}/dist/" pnpm -C ../${app} build`);
        mkdirSync(`./public/z/${manifest.name}/dist/`,{recursive: true});
        cpSync(`../${app}/dist`, `./public/z/${manifest.name}/dist/`, { recursive: true });
    }

}

console.log(registry)
writeFileSync("src/registry.json", JSON.stringify(registry));
