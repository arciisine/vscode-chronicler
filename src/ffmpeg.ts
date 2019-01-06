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
    darwinCommon: {
      capture_cursor: 1,
    },
    audio: {
      'b:a': '384k',
      'c:a': 'aac',
      ac: 1,
      //      vbr: 3
    },
    video: {
      preset: 'ultrafast',
      crf: 20,
      pix_fmt: 'yuv420p',
      'c:v': 'libx264',
    }
  };

  private static get(src: any, key: string, target: any, customKeyOverride?: string) {
    return [`-${key}`, src[customKeyOverride || key] || target[key]];
  }

  private static getAll(src: any, target: any, keys: string[] = Object.keys(target), override?: (x: string) => string) {
    return keys.reduce((acc, k) => {
      acc.push(...this.get(src, k, target, override ? override(k) : k));
      return acc;
    }, [] as string[]);
  }

  static async getInputDevices(opts: RecordingOptions) {
    const { bounds: b } = opts;
    const cropFilter = `crop=${b.width}:${b.height}:${b.x}:${b.y}`

    switch (os.platform()) {
      case 'darwin': {
        const res = await OSUtil.getMacScreenSize();
        return {
          video: {
            f: 'avfoundation',
            i: await OSUtil.getMacInputDevices(opts.ffmpegBinary, opts.audio)
          },
          filter: [
            `scale=${res.w}:${res.h}:flags=lanczos`,
            cropFilter
          ].join(',')
        };
      }
      case 'win32': {
        return {
          video: {
            f: 'dshow',
            i: opts.audio ?
              'video="UScreenCapture":audio="Microphone"' :
              'video="screen-capture-recorder"'
          },
          filter: cropFilter
        };
      }
      case 'linux': {
        return {
          video: { f: 'x11grab', i: `:0.0+${opts.bounds.x},${opts.bounds.y}` },
          ...(!opts.audio ? {} : {
            audio: { f: 'pulse', i: 'default' }
          })
        };
      }
    }
  }

  static async launchProcess(opts: RecordingOptions) {
    const custom = opts.flags || {};
    const platform = os.platform();

    const input = await this.getInputDevices(opts);
    if (!input) {
      throw new Error('Unsupported platform');
    }

    const getAll = this.getAll.bind(this, custom);

    const args: string[] = [
      ...getAll(this.recordingArgs.common),
      ...getAll((this.recordingArgs as any)[`${platform}Common`] || {}),
      '-r', `${opts.fps}`,
      '-video_size', `${opts.bounds.width}x${opts.bounds.height}`,
      ...getAll(input.video, ['f']),
      ...getAll(input.video, ['i'])
    ];

    if (opts.duration) {
      args.unshift('-t', `${opts.duration}`);
    }

    if (opts.audio) {
      if ('audio' in input) {
        args.push(
          ...getAll(input.audio, ['f'], x => `audio_${x}`),
          ...getAll(input.audio, ['i'], x => `audio_${x}`),
        );
      }
      args.push(
        ...getAll(this.recordingArgs.audio),
      );
    }

    args.push(
      ...getAll(this.recordingArgs.video),
      ...(input.filter ? ['-vf', `'${input.filter}'`] : [])
    );

    const { finish, kill, proc } = await Util.processToPromise(opts.ffmpegBinary, [...args, opts.file]);
    return { finish: finish.then(x => opts), kill, proc };
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