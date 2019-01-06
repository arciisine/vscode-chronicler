import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';
import { RecordingOptions } from './types';

const exists = util.promisify(fs.exists);

export class Config {
  private static get _config() {
    return vscode.workspace.getConfiguration();
  }

  static isDebugMode() {
    return !!this._config.get('chronicler.debug');
  }

  static getRecordingDefaults() {
    return {
      duration: 0,
      fps: 10,
      animatedGif: false,
      countdown: 5,
      ...(this._config.get('chronicler.recording-defaults') || {})
    } as RecordingOptions;
  }

  static async getFilename() {
    if (!this._config.get('chronicler.dest-folder')) {
      await this._config.update('chronicler.dest-folder',
        path.join(process.env.HOME || process.env.USERPROFILE || '.', 'Recordings'), vscode.ConfigurationTarget.Global);
    }

    const dir = this._config.get('chronicler.dest-folder') as string;
    const folders = vscode.workspace.workspaceFolders;
    const ws = folders ? folders![0].name.replace(/[^A-Za-z0-9\-_]+/g, '_') : `vscode`;
    const base = `${ws}-${new Date().getTime()}.mp4`;

    if (!(await exists(dir))) {
      await util.promisify(fs.mkdir)(dir);
    }

    return path.join(dir, base);
  }

  static async getLocation(key: string, options: {
    title: string,
    folder?: boolean,
    defaultName?: string;
    executable?: boolean;
    platformDefaults?: { darwin?: string[], win32?: string[], linux?: string[] },
    validator?: (res: string) => Promise<boolean> | boolean,
    onAdd?: (file: string) => Promise<any> | any;
  }) {
    key = `chronicler.${key}`;

    if (!this._config.get(key)) {
      const platform = os.platform();

      const folders = options.platformDefaults ? (options.platformDefaults[platform as 'darwin' | 'win32'] || options.platformDefaults.linux || []) : [];

      let valid = undefined;

      if (options.folder) {
        for (const p of folders) {
          if (await exists(p)) {
            valid = p;
            break;
          }
        }
      } else if (options.defaultName) {
        const paths = [...folders];
        if (options.executable) {
          paths.unshift(...(process.env.PATH || '').split(path.delimiter));
        }
        for (const p of paths) {
          if (await exists(path.resolve(p, options.defaultName))) {
            valid = p;
            break;
          }
        }
      }

      let file;

      if (valid) {
        file = valid;
      } else {
        const res = await vscode.window.showOpenDialog({
          openLabel: `Select ${options.title}`,
          canSelectFiles: !options.folder,
          canSelectFolders: options.folder,
          canSelectMany: false,
          defaultUri: valid ? vscode.Uri.file(valid) : undefined
        });

        if (!res || res.length === 0) {
          return;
        }

        file = res[0].fsPath;
      }

      if ((await exists(file)) && (!options.validator || (await options.validator(file)))) {
        await this._config.update(key, file, vscode.ConfigurationTarget.Global);
      } else {
        throw new Error(`Invalid location for ${options.title}: ${file}`);
      }

      if (options.onAdd) {
        await options.onAdd(file);
      }
    }
    return this._config.get(key) as string;
  }

  static async getFFmpegBinary() {
    const res = await this.getLocation('ffmpeg-binary', {
      title: 'FFMpeg Binary',
      folder: false,
      defaultName: 'ffmpeg',
      executable: true,
      validator: file => /ffmpeg/i.test(file)
    });

    if (!res) {
      await this._config.update('chronicler.ffmpeg-binary', 'false', vscode.ConfigurationTarget.Global);
    }

    return res;
  }
}