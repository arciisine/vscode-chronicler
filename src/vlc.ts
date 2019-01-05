import * as net from 'net';
import { Config } from './config';
import { Log } from './log';
import { Util } from './util';

interface Bounds {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface VlcRecordOptions {
  paths: {
    binary: string;
    plugins: string;
    data: string;
  };

  port: number;
  duration?: number;
  fps: number;
  bounds: Bounds;
  transcode?: any;
  flags?: any;
  file: string;
}

export class VlcUtil {

  static buildArgs(opts: VlcRecordOptions) {

    const transcodeOpt = {
      vcodec: 'h264',
      venc: 'x264{preset=ultrafast,profile=baseline,crf=0}',
      acodec: 'none',
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
      // 'no-sout-audio': '',
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

    const { finish, kill } = await Util.processToPromise(
      opts.paths.binary, args, {
        env: {
          ...process.env,
          VLC_PLUGIN_PATH: opts.paths.plugins,
          VLC_DATA_PATH: opts.paths.data,
        }
      }
    );

    return { finish: finish.then(x => opts), kill };
  }

  static async connect(port: number) {

    for (let i = 0; i < 5; i++) {
      try {
        return await new Promise<() => Promise<void>>((resolve, reject) => {
          const stream = net.connect({ port }, () => {
            Log.info(`Connected to: ${port}`);
            stream!.removeAllListeners('error');
            resolve(() => new Promise((res, rej) => {
              Log.info('Sending Quit');
              stream.write('quit\r\n', (err: any) => err ? rej(err) : res());
            }));
          });
          stream.setNoDelay();
          stream.on('error', reject);
        });
      } catch {
        Log.info(`Trying to connect after ${(i + 1)}s`);
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s
      }
    }
    throw new Error('Could not connect');
  }
}