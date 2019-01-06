import * as win from 'active-win';
import * as os from 'os';
import opn = require('opn');

import { Util } from './util';

export class OSUtil {

  static async openFile(file: string) {
    const platform = os.platform();
    await opn(file, {
      wait: false,
      app: platform === 'darwin' ? 'google chrome' : 'google-chrome'
    });
  }

  static async getBounds() {
    const info = await win();
    let bounds = info.bounds!;
    const platform = os.platform();

    if (!bounds) {
      switch (platform) {
        case 'linux': {
          const { stdout: text } = await Util.processToStd('xwininfo', ['-id', `${info.id}`], {}, true);
          const data = text
            .split(/\n/g)
            .map(l =>
              l.split(/:/)
                .map(p => p.trim())
            )
            .reduce((acc, [k, v]) => {
              acc[k] = /^\d+$/.test(v) ? parseInt(v, 10) : v;
              return acc;
            }, {} as { [key: string]: any });
          bounds = {
            x: data['Absolute upper-left X'],
            y: data['Absolute upper-left Y'],
            width: data['Width'],
            height: data['Height'],
          };
          break;
        }
      }
    }

    if (platform === 'linux') {
      if (bounds.width % 2) {
        bounds.width += 1;
      }
      if (bounds.height % 2) {
        bounds.height += 1;
      }
      if (bounds.x % 2) {
        bounds.x -= 1;
      }
      if (bounds.y % 2) {
        bounds.y -= 1;
      }
    }

    return bounds!;
  }

  static async getMacInputDevices(ffmpegBinary: string, audio?: boolean) {
    const { stderr: text } = await Util.processToStd(ffmpegBinary, ['-f', 'avfoundation', '-list_devices', 'true', '-i', '""']);
    const matchedIndex = text.match(/\[(\d+)\]\s+Capture\s+Screen/i)!;
    if (!matchedIndex) {
      throw new Error('Cannot find screen recording device');
    }
    const videoIndex = matchedIndex[1].toString();
    if (!audio) {
      return `'${videoIndex}:none'`;
    } else {
      const matchedAudioIndex = text.match(/\[(\d+)\]\s+Mac[^\n]*Microphone/i)!;
      if (!matchedAudioIndex) {
        throw new Error('Cannot find microphone recording device');
      }
      const audioIndex = matchedAudioIndex[1].toString();
      return `'${videoIndex}:${audioIndex}'`;
    }
  }

  static async getMacScreenSize() {
    const { stdout } = await Util.processToStd('osascript',
      ['-e', `'tell application "Finder" to get bounds of window of desktop'`], {}, true);
    const [, , w, h] = stdout.split(/\s*,\s*/).map(x => parseInt(x, 10));
    return { w, h };
  }
}