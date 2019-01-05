import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';

const exists = util.promisify(fs.exists);

export class Config {
  static isDebugMode() {
    const config = vscode.workspace.getConfiguration();
    return !!config.get('chronicler.debug');
  }

  static getRecordingDefaults() {
    return {
      duration: 0,
      fps: 10,
      port: 8088,
      ...(vscode.workspace.getConfiguration().get('chronicler.recording-defaults') || {})
    };
  }

  static async getFilename() {
    const config = vscode.workspace.getConfiguration();

    if (!config.get('chronicler.dest-folder')) {
      await config.update('chronicler.dest-folder', path.join(process.env.HOME || process.env.USERPROFILE || '.', 'Recordings'), vscode.ConfigurationTarget.Global);
    }

    const dir = config.get('chronicler.dest-folder') as string;

    const folders = vscode.workspace.workspaceFolders;
    const ws = folders ? folders![0].name.replace(/[^A-Za-z0-9\-_]+/g, '_') : `vscode`;
    const base = `${ws}-${new Date().getTime()}.mp4`;

    if (!(await exists(dir))) {
      await util.promisify(fs.mkdir)(dir);
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

        if (!(await exists(path.resolve(p, 'vlc')))) {
          throw new Error(`Vlc executable not found at ${p}`);
        }

        if (!(await await exists(path.resolve(p, 'plugins')))) {
          throw new Error(`Plugin folder missing at ${p}`);
        }

        await conf.update('chronicler.vlc-home', p, vscode.ConfigurationTarget.Global);
      }
    }
    return conf.get('chronicler.vlc-home') as string;
  }
}