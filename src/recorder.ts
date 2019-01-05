import * as win from 'active-win';

import { VlcUtil, VlcRecordOptions } from './vlc';
import { FFmpegUtil } from './ffmpeg';
import { Config } from './config';

export class Recorder {

  private proc: { kill: (now: boolean) => void, finish: Promise<VlcRecordOptions> };
  private streamStop: () => Promise<void>;

  get active() {
    return !!this.proc;
  }

  dispose() {
    this.stop();
  }

  async start() {
    const { bounds } = await win();

    const paths = await Config.getVlcPaths();

    if (!paths) {
      return;
    }

    await Config.getFFmpegBinary();

    const opts = {
      ...Config.getRecordingDefaults(),
      bounds: bounds!,
      file: await Config.getFilename(),
      paths
    };

    if (this.proc) {
      throw new Error('Recording already in progress');
    }

    this.proc = await VlcUtil.launchProcess(opts);
    this.streamStop = await VlcUtil.connect(opts.port);
  }

  async convertToGif(opts: VlcRecordOptions) {
    const result = await FFmpegUtil.toAnimatedGif(opts.file, {
      fps: opts.fps,
      w: opts.bounds.width,
      h: opts.bounds.height
    });

    if (result) {
      const animated = await result.finish;
      opts.file = animated;
    }

    return opts;
  }

  async stop() {
    if (!this.proc) {
      throw new Error('No recording running');
    }
    try {
      await this.streamStop();
      this.proc.kill(false);

      const opts = await this.proc.finish;

      if (await Config.getFFmpegBinary()) {
        await this.convertToGif(opts);
      }

      return opts;
    } finally {
      this.proc.kill(true);
      delete this.proc;
    }
  }
}