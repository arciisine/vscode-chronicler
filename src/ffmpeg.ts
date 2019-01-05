import { Config } from './config';
import { Util } from './util';

export interface FfmpegRecordOptions {
  fps: string;
  w: number;
  h: number;
  scale?: number;
}

export class FFmpegUtl {
  static async toAnimatedGif(mp4: string, opts: FfmpegRecordOptions) {
    const ffmpeg = await Config.getFFmpegBinary();

    if (!ffmpeg) {
      return;
    }

    const args = ['-i', mp4, '-r', `${opts.fps}`, '-hide_banner'];
    if (opts.scale) {
      args.push('-vf', `scale=${Math.trunc(opts.w * opts.scale)}:${Math.trunc(opts.h * opts.scale)}`);
    }

    const final = mp4.replace('.mp4', '.gif');

    const { finish, kill } = await Util.processToPromise(ffmpeg, [...args, final]);

    return { finish: finish.then(x => final), kill };
  }
}