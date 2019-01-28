import * as win from '@arcsine/process-win';

import { Util } from './util';

export class OSUtil {

  static async openFile(file: string) {
    let cmd: string;
    const args: string[] = [`file://${file.replace(/[\\/]+/g, '/')}`];
    if (process.platform === 'darwin') {
      cmd = 'open';
    } else if (process.platform === 'win32') {
      cmd = 'cmd';
      args.unshift('/c', 'start');
    } else {
      cmd = 'xdg-open';
    }
    await Util.processToPromise(cmd, args);
  }

  static async getActiveWindow() {
    const info = await win.getActive();
    const b = info.bounds!;

    if (process.platform !== 'darwin') {
      b.width += (b.width % 2);
      b.height += (b.height % 2);
      b.x -= (b.x % 2);
      b.y -= (b.y % 2);
    }

    return info!;
  }

  static async getMacInputDevices(ffmpegBinary: string, window: win.Response, audio = false) {
    const { stderr: text } = await Util.processToStd(ffmpegBinary, ['-f', 'avfoundation', '-list_devices', 'true', '-i', '""']);
    const matched: string[] = [];
    text.replace(/\[(\d+)\]\s+Capture\s+Screen/ig, (all, index: string) => {
      matched.push(index);
      return '';
    });

    const matchedIndex = matched[window.screens[0].index];

    if (matchedIndex === undefined) {
      throw new Error('Cannot find screen recording device');
    }
    const videoIndex = matchedIndex.toString();
    let audioIndex = 'none';
    if (audio) {
      const matchedAudioIndex = text.match(/\[(\d+)\]\s+Mac[^\n]*Microphone/ig)!;
      if (!matchedAudioIndex) {
        throw new Error('Cannot find microphone recording device');
      }
      audioIndex = matchedAudioIndex[1].toString();
    }
    return { video: videoIndex, audio: audioIndex };
  }

  static async getWinDevices(ffmpegBinary: string, audio = false) {
    const { stderr: text } = await Util.processToStd(ffmpegBinary, ['-f', 'dshow', '-list_devices', 'true', '-i', 'dummy']);
    const matchedAudio = text.match(/\"(Microphone[^"]+)"/ig)!;
    const out: { audio?: string, video?: string } = {};
    if (audio) {
      if (!matchedAudio) {
        throw new Error('Cannot find microphone recording device');
      } else {
        out.audio = matchedAudio[1].toString();
      }
    }
    return out;
  }
}