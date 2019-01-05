import * as os from 'os';
import * as path from 'path';

import { Config } from './config';
import { Util } from './util';

export interface FFmpegRecordOptions {
  fps: number;
  w: number;
  h: number;
  scale?: number;
}

export class FFmpegUtil {
  static async toAnimatedGif(mp4: string, opts: FFmpegRecordOptions) {
    const ffmpeg = await Config.getFFmpegBinary();

    if (!ffmpeg) {
      return;
    }

    let vf = `fps=${opts.fps}`;
    if (opts.scale) {
      vf = `${vf},scale=${Math.trunc(opts.w * opts.scale)}:${Math.trunc(opts.h * opts.scale)}`;
    } else {
      vf = `${vf},scale=${opts.w}:${opts.h}`;
    }

    vf = `${vf}:flags=lanczos`;

    const paletteFile = path.resolve(os.tmpdir(), 'palette-gen.png');
    const { finish: finishPalette } = Util.processToPromise(ffmpeg, ['-i', mp4, '-vf', `${vf},palettegen=stats_mode=diff`, '-y', paletteFile]);

    await finishPalette;

    const final = mp4.replace('.mp4', '.gif');
    const { finish, kill } = Util.processToPromise(ffmpeg, ['-i', mp4, '-i', paletteFile,
      '-lavfi', `"${vf},paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"`, '-y', final]);

    return { finish: finish.then(x => final), kill };
  }
}