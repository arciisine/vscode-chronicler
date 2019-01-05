import * as vscode from 'vscode';
import * as path from 'path';
import * as spawn from 'cross-spawn';
import * as util from 'util';
import * as net from 'net';
import { Config } from './config';

interface Bounds {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface VlcRecordOptions {
  vlcPath: string;
  port: number;
  duration?: number;
  fps: number;
  bounds: Bounds;
  transcode?: any;
  flags?: any;
  file: string;
}

export class VlcUtil {
  static output = vscode.window.createOutputChannel('chronicler');

  static buildArgs(opts: VlcRecordOptions) {

    const transcodeOpt = {
      vcodec: 'h264',
      venc: 'x264{preset=medium,profile=baseline,crf=22,qp=0}',
      quality: 100,
      fps: opts.fps,
      scale: 1,
      width: opts.bounds.width,
      height: opts.bounds.height,
      ...(opts.transcode || {})
    };

    const transcodeFlags = Object.keys(transcodeOpt)
      .filter(x => transcodeOpt[x])
      .map(x => `${x}=${transcodeOpt[x]}`).join(',');

    const outputOpt: { [key: string]: string } = {
      access: 'file',
      mux: 'mp4',
      dst: `"${opts.file}"`,
    };

    const outputFlags = Object.keys(outputOpt).map(x => `${x}=${outputOpt[x]}`).join(',');

    const configOpt: { [key: string]: any } = {
      'no-screen-follow-mouse': '',

      'ignore-config': '',
      'no-plugins-cache': '',
      verbose: Config.isDebugMode() ? 5 : 0,
      'no-media-library': '',
      config: 'blank',

      intf: 'dummy',
      // 'dummy-quiet': '',
      'screen-fps': transcodeOpt.fps,
      'screen-left': opts.bounds.x,
      'screen-top': opts.bounds.y,
      'screen-width': opts.bounds.width,
      'screen-height': opts.bounds.height,
      'run-time': opts.duration || Number.MAX_SAFE_INTEGER,

      // 'no-crashdump': '',
      extraintf: 'rc',

      'rc-host': `localhost:${opts.port}`,
      // 'rc-quiet': '', // TODO: maybe win specific
      'no-sout-audio': '',
      sout: `'#transcode{${transcodeFlags}}:duplicate{dst=std{${outputFlags}}}'`,
      ...(opts.flags || {})
    };

    const args = Object.keys(configOpt).map(x => {
      const v = configOpt[x];
      return `${x.length > 1 ? '--' : '-'}${x}${v === '' ? '' : `=${v}`}`;
    });

    return ['screen://', ...args];
  }

  static async launchProcess(opts: VlcRecordOptions) {
    const args = VlcUtil.buildArgs(opts);

    this.output.appendLine(`[INFO] ${[path.resolve(opts.vlcPath, 'vlc'), ...args].join(' ')}`);

    const proc = spawn(path.resolve(opts.vlcPath, 'vlc'), args, {
      cwd: vscode.workspace.workspaceFolders![0].uri.fsPath,
      shell: true,
      env: {
        ...process.env,
        VLC_PLUGIN_PATH: path.resolve(opts.vlcPath, 'plugins'),
        VLC_DATA_PATH: path.resolve(opts.vlcPath, 'share'),
      }
    });

    proc.stderr.on('data', x => {
      if (Config.isDebugMode()) {
        this.output.appendLine(`[ERROR] ${x.toString()}`.trim());
      }
    });

    const done = () => proc.kill();

    process.on('exit', done);

    const finish = new Promise<string>((resolve, reject) => {
      proc.once('error', () => {
        reject(new Error(`Cannot find VLC in ${opts.vlcPath}`));
      });

      proc.once('exit', (code) => {
        process.removeListener('exit', done);
        if (code) {
          this.output.appendLine(`[ERROR] Invalid exit status: ${code}`);
          reject(new Error(`Invalid exit status: ${code}`));
        } else {
          this.output.appendLine('[INFO] Successfully terminated');
          resolve(opts.file);
        }
      });
    });

    return { finish, kill: (now: boolean = false) => proc.kill(now ? 'SIGKILL' : 'SIGTERM') };
  }

  static async connect(port: number) {

    for (let i = 0; i < 5; i++) {
      try {
        return await new Promise<() => Promise<void>>((resolve, reject) => {
          const stream = net.connect({ port }, () => {
            this.output.appendLine(`[INFO] Connected to: ${port}`);
            stream!.removeAllListeners('error');
            const write = util.promisify(stream.write).bind(stream) as any as (msg: string) => Promise<void>;
            resolve(() => {
              this.output.appendLine('[INFO] Sending Quit');
              return write('quit');
            });
          });
          stream.setNoDelay();
          stream.on('error', reject);
        });
      } catch {
        this.output.appendLine(`[INFO] Trying to connect after ${(i + 1)}s`);
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s
      }
    }
    throw new Error('Could not connect');
  }
}