import * as os from 'os';
import * as path from 'path';

import { Config } from './config';
import { Util } from './util';
import { RecordingOptions } from './types';
import { OSUtil } from './os';

export class FFmpegUtil {

  static recordingArgs = {
    common: {
      threads: 4,
    },
    audio: {
      'b:a': '384k',
      'c:a': 'aac',
      ac: 1,
      //      vbr: 3
    },
    video: {
      preset: 'ultrafast',
      crf: 10,
      pix_fmt: 'yuv420p',
      'c:v': 'libx264',
    }
  };

  private static get(src: any, key: string, target: any, customKeyOverride?: string) {
    const val = src[customKeyOverride || key] || target[key];
    return val === undefined ? [] : [`-${key}`, val];
  }

  private static getAll(src: any, target: any, keys: string[] = Object.keys(target), override?: (x: string) => string) {
    return keys.reduce((acc, k) => {
      acc.push(...this.get(src, k, target, override ? override(k) : k));
      return acc;
    }, [] as string[]);
  }

  static async getWin32Args(opts: RecordingOptions) {
    const getAll = this.getAll.bind(this, opts.flags || {});
    const devs = await OSUtil.getWinDevices(opts.ffmpegBinary, opts.audio);
    const out: string[] = [];

    if (opts.duration) {
      out.unshift('-t', `${opts.duration}`);
    }

    out.push(
      ...getAll(this.recordingArgs.common),
      '-r', `${opts.fps}`,
      '-video_size', `${opts.bounds.width}x${opts.bounds.height}`,
    );

    if (opts.audio) {
      out.push(
        '-f', 'dshow',
        '-i', `audio="${devs.audio}"`,
      );
    }

    out.push(
      '-offset_x', `${opts.bounds.x}`,
      '-offset_y', `${opts.bounds.y}`,
      '-f', 'gdigrab',
      '-i', 'desktop',
      ...getAll(this.recordingArgs.video)
    );

    if (opts.audio) {
      out.push(
        ...getAll(this.recordingArgs.audio),
      );
    }

    return out;
  }

  static async getDarwinArgs(opts: RecordingOptions) {
    const { bounds: b } = opts;

    const getAll = this.getAll.bind(this, opts.flags || {});
    const res = await OSUtil.getMacScreenSize();
    const devs = await OSUtil.getMacInputDevices(opts.ffmpegBinary, opts.audio);

    const out: string[] = [];
    if (opts.duration) {
      out.unshift('-t', `${opts.duration}`);
    }
    out.push(
      '-capture_cursor', '1',
      ...getAll(this.recordingArgs.common),
      '-r', `${opts.fps}`,
      '-video_size', `${opts.bounds.width}x${opts.bounds.height}`,
      '-f', 'avfoundation',
      '-i', `${devs.video}:${devs.audio}`
    );

    if (opts.audio) {
      out.push(
        ...getAll(this.recordingArgs.audio),
      );
    }

    out.push(
      ...getAll(this.recordingArgs.video),
      '-vf', `'scale=${res.w}:${res.h}:flags=lanczos,crop=${b.width}:${b.height}:${b.x}:${b.y}'`
    );

    return out;
  }

  static async getLinuxArgs(opts: RecordingOptions) {
    const getAll = this.getAll.bind(this, opts.flags || {});
    const out: string[] = [];

    if (opts.duration) {
      out.unshift('-t', `${opts.duration}`);
    }

    out.push(
      ...getAll(this.recordingArgs.common),
      '-r', `${opts.fps}`,
      '-video_size', `${opts.bounds.width}x${opts.bounds.height}`,
      '-f', 'x11grab',
      '-i', `:0.0+${opts.bounds.x},${opts.bounds.y}`,
    );

    if (opts.audio) {
      out.push(
        '-f', 'pulse',
        '-i', 'default',
        ...getAll(this.recordingArgs.audio),
      );
    }

    out.push(
      ...getAll(this.recordingArgs.video),
    );

    return out;
  }

  static async launchProcess(opts: RecordingOptions) {
    const platform = os.platform();
    let args: string[];

    switch (platform) {
      case 'win32': args = await this.getWin32Args(opts); break;
      case 'darwin': args = await this.getDarwinArgs(opts); break;
      case 'linux':
      default:
        args = await this.getLinuxArgs(opts); break;
    }

    const { finish, kill, proc } = await Util.processToPromise(opts.ffmpegBinary, [...args, opts.file]);
    return {
      finish: finish.then(x => opts),
      stop: (now?: boolean) => {
        if (now) {
          kill(now);
        } else {
          proc.stdin.write('q'); // Send kill command
        }
      },
      proc
    };
  }

  static async generateGIF(opts: RecordingOptions & { scale?: number }) {
    const ffmpeg = await Config.getFFmpegBinary();

    if (!ffmpeg) {
      return;
    }

    let vf = `fps=${opts.fps}`;
    if (opts.scale) {
      vf = `${vf},scale=${Math.trunc(opts.bounds.width * opts.scale)}:${Math.trunc(opts.bounds.height * opts.scale)}`;
    } else {
      vf = `${vf},scale=${opts.bounds.width}:${opts.bounds.height}`;
    }

    vf = `${vf}:flags=lanczos`;

    const paletteFile = path.resolve(os.tmpdir(), 'palette-gen.png');
    const final = opts.file.replace('.mp4', '.gif');

    const { finish: finishPalette } = Util.processToPromise(ffmpeg, [
      '-i', opts.file,
      '-vf', `${vf},palettegen=stats_mode=diff`,
      '-y', paletteFile
    ]);

    await finishPalette;

    const { finish, kill } = Util.processToPromise(ffmpeg, [
      '-i', opts.file,
      '-i', paletteFile,
      '-lavfi', `"${vf},paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"`,
      '-y', final
    ]);

    return { finish: finish.then(x => final), kill };
  }
}