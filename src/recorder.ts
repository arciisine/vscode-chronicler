import { FFmpegUtil } from './ffmpeg';
import { Config } from './config';
import { RecordingOptions } from './types';
import { ChildProcess } from 'child_process';
import { OSUtil } from './os';

export class Recorder {

  private proc: { proc: ChildProcess, kill: (now: boolean) => void, finish: Promise<RecordingOptions> };


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
          opts.file = animated;
        }
      }
      return opts;
    } finally {
      this.proc.kill(true);
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

  async stop() {
    if (!this.proc) {
      throw new Error('No recording running');
    }
    try {
      this.proc.proc.stdin.write('q');
    } catch {
      this.proc.kill(true);
    }
  }
}