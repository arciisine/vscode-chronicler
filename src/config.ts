import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

export class Config {
  static isDebugMode() {
    const config = vscode.workspace.getConfiguration();
    return !!config.get('chronicler.debug');
  }

  static async getFilename() {
    const config = vscode.workspace.getConfiguration();

    if (!config.get('chronicler.dest-folder')) {
      config.update('chronicler.dest-folder', path.join(process.env.HOME || process.env.USERPROFILE || '.', 'Recordings'));
    }

    const dir = config.get('chronicler.dest-folder') as string;

    const folders = vscode.workspace.workspaceFolders;
    const ws = folders ? folders![0].name.replace(/[^A-Za-z0-9\-_]+/g, '_') : `vscode`;
    const base = `${ws}-${new Date().getTime()}.mp4`;

    try {
      await util.promisify(fs.mkdir)(dir);
    } catch (err) {
      if (!/already exists/i.test(err.message)) {
        throw err;
      }
    }

    return path.join(dir, base);
  }

  static async getVlcLocation() {
    const conf = vscode.workspace.getConfiguration();

    if (!conf.get('chronicler.vlc-home')) {
      const res = await vscode.window.showOpenDialog({
        openLabel: 'Select VLC Installation',
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: vscode.Uri.file('/Applications/VLC.app/Contents/MacOS')
      });
      if (!res) {
        return;
      } else {
        const p = res[0].fsPath;
        const found = await util.promisify(fs.exists)(path.resolve(p, 'vlc'));
        if (!found) {
          vscode.window.showErrorMessage(`Vlc executable not found at ${p}`);
          return;
        } else {
          const foundPlugins = await util.promisify(fs.exists)(path.resolve(p, 'plugins'));
          if (!foundPlugins) {
            vscode.window.showErrorMessage(`Plugin folder missing at ${p}`);
            return;
          }
          await conf.update('chronicler.vlc-home', p);
        }
      }
    }
    return conf.get('chronicler.vlc-home') as string;
  }
}