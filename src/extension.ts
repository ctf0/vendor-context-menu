'use strict';

import fs from 'node:fs';
import * as nodePath from 'node:path';
import * as vscode from 'vscode';
export const PACKAGE_NAME = 'packageManagers';

let config: vscode.WorkspaceConfiguration;

export function activate(context) {
    readConfig();

    // config
    vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(PACKAGE_NAME)) {
            readConfig();
        }
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.hideFolder', hideFolder),
        vscode.commands.registerCommand('extension.hidePMDeps', async (data) => {
            const pm = config.list.find((item) => data.path.endsWith(item.folder_name));

            doStuff(
                data,
                await getFolders(data),
                getPMJsonFilePath(data, pm.folder_name, pm.file_name),
                pm.packages_lists,
            );
        }),
    );
}

async function doStuff(data, files, path, keys) {
    const doc = await vscode.workspace.openTextDocument(path);
    const jsonFileContent = JSON.parse(doc.getText());
    const mapHighestDep = (dep) => ((dep.indexOf('/') > -1) ? dep.substr(0, dep.indexOf('/')) : dep);
    const libs = resolvePkgsList(jsonFileContent, mapHighestDep, keys);

    hidePaths(
        files.filter((m) => libs.indexOf(m) < 0)
            .map((m) => resolvePath(
                nodePath.join(data.fsPath, m),
            )),
    );

    await showMsg(data.fsPath);
}

/* Utils -------------------------------------------------------------------- */
function showMsg(path, single = false) {
    path = path.split('/').pop();
    const msg = single
        ? `"${path}" visibility updated.`
        : `"${path}" directories visibility updated.`;

    return vscode.window.showInformationMessage(msg);
}

function resolvePkgsList(config, mapHighestDep, keys) {
    const libs: any = [];

    for (const key of keys) {
        if (config.hasOwnProperty(key)) {
            const deps = Object.keys(config[key]).map(mapHighestDep);
            libs.push(...deps);
        }
    }

    return libs;
}

/* Path -------------------------------------------------------------------- */
async function getFolders(data) {
    const fileNames = await fs.promises.readdir(data.fsPath, { withFileTypes: true });

    return fileNames.filter((file) => file.isDirectory()).map((e) => e.name);
}

function getPMJsonFilePath(data, folder, file) {
    return data.fsPath.replace(folder, file).replace(/\\/g, '/');
}

function resolvePath(filepath) {
    const root = vscode.workspace.rootPath;
    let path = filepath.replace(root, '').replace(/\\/g, '/');
    path = ((path[0] == '/') ? path.substr(1) : path);

    return path;
}

async function hideFolder(data) {
    if (!data) {
        return false;
    }

    const path = resolvePath(data.fsPath);
    await showMsg(path, true);
    hidePaths([path]);
}

async function hidePaths(paths) {
    const config = await vscode.workspace.getConfiguration();
    const excluded = config.get('files.exclude', {});
    paths.forEach((path) => excluded[path] = true);

    await config.update('files.exclude', excluded);
}

function readConfig() {
    config = vscode.workspace.getConfiguration(PACKAGE_NAME);
}

/* ---------------------------------------------------------------------- */

export function deactivate() {

}
