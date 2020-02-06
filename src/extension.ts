'use strict'

import * as vscode from 'vscode'
import * as nodePath from "path"

const fs = require('fs')

export function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.hideNode', hideFolder))
    context.subscriptions.push(vscode.commands.registerCommand('extension.hideVendor', hideFolder))
    context.subscriptions.push(forNode())
    context.subscriptions.push(forVendor())
}

function forNode() {
    return vscode.commands.registerCommand('extension.nodeConfig', async (data) => {
        return doStuff(
            data,
            await getFolders(data),
            getPMJsonFilePath(data, "node_modules", "package.json"),
            ['dependencies', 'devDependencies']
        )
    })
}

function forVendor() {
    return vscode.commands.registerCommand('extension.vendorConfig', async (data) => {
        return doStuff(
            data,
            await getFolders(data),
            getPMJsonFilePath(data, "vendor", "composer.json"),
            ['require', 'require-dev']
        )
    })
}

async function doStuff(data, files, path, keys) {
    let doc = await vscode.workspace.openTextDocument(path)
    let jsonFileContent = JSON.parse(doc.getText())
    let mapHighestDep = (dep) => ((dep.indexOf("/") > -1) ? dep.substr(0, dep.indexOf("/")) : dep)
    let libs = resolvePkgsList(jsonFileContent, mapHighestDep, keys)

    hidePaths(
        files.filter((m) => libs.indexOf(m) < 0)
            .map((m) => resolvePath(
                nodePath.join(data.fsPath, m)
            ))
    )
    showMsg(data.fsPath)
}

/* Utils -------------------------------------------------------------------- */
function showMsg(path, single = false) {
    path = path.split('/').pop()
    let msg = single
        ? `"${path}" visibility updated.`
        : `"${path}" directories visibility updated.`

    return vscode.window.showInformationMessage(msg)
}

function resolvePkgsList(config, mapHighestDep, keys) {
    let libs = []

    for (const key of keys) {
        if (config.hasOwnProperty(key)) {
            let deps = Object.keys(config[key]).map(mapHighestDep)
            libs.push(...deps)
        }
    }

    return libs
}

/* Path -------------------------------------------------------------------- */
async function getFolders(data) {
    const fileNames = await fs.promises.readdir(data.fsPath, { withFileTypes: true })

    return fileNames.filter((file) => file.isDirectory()).map((e) => e.name)
}

function getPMJsonFilePath(data, folder, file) {
    return data.fsPath.replace(folder, file).replace(/\\/g, "/")
}

function resolvePath(filepath) {
    let root = vscode.workspace.rootPath
    let path = filepath.replace(root, "").replace(/\\/g, "/")
    path = ((path[0] == "/") ? path.substr(1) : path)

    return path
}

function hideFolder(data) {
    if (!data) {
        return false
    }

    let path = resolvePath(data.fsPath)
    hidePaths([path])
    showMsg(path, true)
}

async function hidePaths(paths) {
    let config = await vscode.workspace.getConfiguration()
    let excluded = config.get("files.exclude", {})
    paths.forEach((path) => excluded[path] = true)

    await config.update("files.exclude", excluded)
}

/* ---------------------------------------------------------------------- */

export function deactivate() {

}
