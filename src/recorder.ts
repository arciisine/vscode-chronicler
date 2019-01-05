import * as win from 'active-win';

import { VlcUtil } from './vlc';
import { Config } from './config';

export class Recorder {

  private proc: { kill: (now: boolean) => void, finish: Promise<any> };
  private streamStop: () => Promise<void>;

  get active() {
    return !!this.proc;
  }

  dispose() {
    this.stop();
  }

  async start() {
    const info = await win();
    const vlcPath = await Config.getVlcLocation();

    if (!vlcPath) {
      return; // User canceled
    }

    const opts = {
      ...Config.getRecordingDefaults(),
      bounds: info.bounds!,
      file: await Config.getFilename(),
      vlcPath
    };

    if (this.proc) {
      throw new Error('Recording already in progress');
    }

    this.proc = await VlcUtil.launchProcess(opts);
    this.streamStop = await VlcUtil.connect(opts.port);
  }

  async stop() {
    if (!this.proc) {
      throw new Error('No recording running');
    }
    try {
      await this.streamStop();
      this.proc.kill(false);
      return await this.proc.finish;
    } finally {
      this.proc.kill(true);
      delete this.proc;
    }
  }
}