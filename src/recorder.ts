import { Recorder as ScreenRecorder, RecordingOptions as Recop, GIFCreator, GIFOptions } from '@arcsine/screen-recorder';

import { Config } from './config';
import { RecordingOptions } from './types';
import { ChildProcess } from 'child_process';

export class Recorder {

  private proc: {
    proc: ChildProcess,
    stop: (now?: boolean) => void,
    finish: Promise<Recop>
  };

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
        const result = await GIFCreator.generate({
          ...opts,
          scale: opts.gifScale || 1
        });

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
      delete (this as any)['proc'];
    }
  }

  async run(override: Partial<RecordingOptions> = {}) {
    const binary = (await Config.getFFmpegBinary())!;
    const defs = Config.getRecordingDefaults();

    const opts = {
      ...defs,
      file: await Config.getFilename(),
      ...override,
      ffmpeg: {
        binary,
        flags: defs.flags
      }
    };



    if (this.proc) {
      throw new Error('Recording already in progress');
    }

    this.proc = await ScreenRecorder.recordActiveWindow(opts);

    return {
      output: async () => {
        const newOpts: RecordingOptions = (await this.proc.finish) as any;
        return this.postProcess(newOpts);
      }
    };
  }

  get running() {
    return !!this.proc;
  }

  stop(force = false) {
    if (!this.running) {
      throw new Error('info:No recording running');
    }
    try {
      this.proc.stop(force);
    } catch {
      this.proc.stop(true);
    }
  }
}