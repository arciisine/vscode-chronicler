import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as util from 'util';

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
      port: 8088,
      ...(this._config.get('chronicler.recording-defaults') || {})
    };
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
    platformDefaults: { darwin?: string[], win32?: string[], linux: string[] },
    folder?: boolean,
    validator?: (res: string) => Promise<boolean> | boolean,
    onAdd?: (file: string) => Promise<any> | any;
  }) {
    key = `chronicler.${key}`;

    if (!this._config.get(key)) {
      const platform = os.platform();

      const paths = options.platformDefaults[platform as 'darwin' | 'win32'] || options.platformDefaults.linux;
      let valid = undefined;
      for (const p of paths) {
        if (await exists(p)) {
          valid = p;
          break;
        }
      }

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

      const file = res[0].fsPath;

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

  static async getVlcBinary() {
    return await this.getLocation('vlc-binary', {
      title: 'VLC Binary',
      platformDefaults: {
        darwin: ['/Applications/VLC.app/Contents/MacOS/VLC'],
        win32: ['C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'],
        linux: ['/usr/bin/vlc', '/usr/local/bin/vlc']
      },
      folder: false,
      onAdd: async (file) => {
        const base = path.dirname(file);
        for (const [sub, key] of [['plugins', 'vlc-plugins-folder'], ['share', 'vlc-data-folder']]) {
          if (await exists(path.resolve(base, sub))) {
            await this._config.update(`chronicler.${key}`, path.resolve(base, sub), vscode.ConfigurationTarget.Global);
          }
        }
      }
    });
  }

  static async getVlcPluginsFolder() {
    return this.getLocation('vlc-plugins-folder', {
      title: 'VLC Plugin Folder',
      platformDefaults: {
        darwin: ['/Applications/VLC.app/Contents/MacOS/plugins'],
        win32: ['C:\\Program Files (x86)\\VideoLAN\\VLC\\plugins'],
        linux: ['/usr/lib/vlc/plugins', '/usr/share/lib/vlc/plugins']
      },
      folder: true,
      validator: file => /vlc.*plugins/i.test(file)
    });
  }

  static async getVlcDataFolder() {
    return this.getLocation('vlc-data-folder', {
      title: 'VLC Data Folder',
      platformDefaults: {
        darwin: ['/Applications/VLC.app/Contents/MacOS/data'],
        win32: ['C:\\Program Files (x86)\\VideoLAN\\VLC\\data'],
        linux: ['/usr/lib/vlc/data', '/usr/share/lib/vlc/data']
      },
      folder: true,
      validator: file => /vlc.*data/i.test(file)
    });
  }

  static async getFFmpegBinary() {
    if (this._config.get('chronicler.ffmpeg-binary') === 'false') {
      return;
    }
    const res = await this.getLocation('ffmpeg-binary', {
      title: 'FFMpeg Binary',
      platformDefaults: {
        linux: ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']
      },
      folder: false,
      validator: file => /ffmpeg/i.test(file)
    });

    if (!res) {
      await this._config.update('chronicler.ffmpeg-binary', 'false', vscode.ConfigurationTarget.Global);
    }

    return res;
  }

  static async getVlcPaths() {
    const vlcBinary = await Config.getVlcBinary();

    if (!vlcBinary) {
      return; // User canceled
    }

    const vlcPlugins = await Config.getVlcPluginsFolder();

    if (!vlcPlugins) {
      return; // User canceled
    }

    const vlcData = await Config.getVlcDataFolder();

    if (!vlcData) {
      return; // User canceled
    }

    return {
      binary: vlcBinary,
      plugins: vlcPlugins,
      data: vlcData
    };
  }
}