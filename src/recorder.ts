import { FFmpegUtil } from './ffmpeg';
import { Config } from './config';
import { RecordingOptions } from './types';
import { ChildProcess } from 'child_process';
import { OSUtil } from './os';

export class Recorder {

  private proc: { proc: ChildProcess, stop: (now?: boolean) => void, finish: Promise<RecordingOptions> };

  get active() {
    return !!this.proc;
  }

  get finish() {
    return this.proc.finish;
  }

  dispose() {
    this.stop();
  }

  async postProcess(opts: RecordingOptions) {
    try {
      await this.proc.finish;
      if (opts.animatedGif) {
        const result = await FFmpegUtil.generateGIF(opts);

        if (result) {
          const animated = await result.finish;
          if (!opts.audio) { // Only default to GIF is not audio
            opts.file = animated;
          }
        }
      }
      return opts;
    } finally {
      this.proc.stop(true);
      delete this.proc;
    }
  }

  async run(override: Partial<RecordingOptions> = {}) {
    const binary = (await Config.getFFmpegBinary())!;

    const opts = {
      ...Config.getRecordingDefaults(),
      file: await Config.getFilename(),
      ...override,
      bounds: await OSUtil.getBounds(),
      ffmpegBinary: binary
    };

    if (this.proc) {
      throw new Error('Recording already in progress');
    }

    this.proc = await FFmpegUtil.launchProcess(opts);

    return { output: this.postProcess(opts) };
  }

  stop(force = false) {
    if (!this.proc) {
      throw new Error('No recording running');
    }
    try {
      this.proc.stop(force);
    } catch {
      this.proc.stop(true);
    }
  }
}