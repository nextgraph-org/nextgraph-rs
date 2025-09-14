import type { PackageJson } from "type-fest";
import fs from "fs-extra";
import path from "path";

export async function getPackageJson(
  projectFolder: string,
): Promise<PackageJson> {
  return JSON.parse(
    (
      await fs.promises.readFile(path.join(projectFolder, "./package.json"))
    ).toString(),
  );
}

export async function savePackageJson(
  projectFolder: string,
  packageJson: PackageJson,
): Promise<void> {
  await fs.promises.mkdir(projectFolder, { recursive: true });
  await fs.promises.writeFile(
    path.join(projectFolder, "./package.json"),
    JSON.stringify(packageJson, null, 2),
  );
}

export async function modifyPackageJson(
  projectFolder: string,
  modifyCallback: (packageJson: PackageJson) => Promise<PackageJson>,
): Promise<void> {
  const packageJson: PackageJson = await getPackageJson(projectFolder);
  const newPackageJson = await modifyCallback(packageJson);
  await savePackageJson(projectFolder, newPackageJson);
}
