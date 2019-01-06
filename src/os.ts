import * as win from 'active-win';
import * as os from 'os';
import * as path from 'path';
import opn = require('opn');

import { Util } from './util';

export class OSUtil {

  static async openFile(file: string) {
    const platform = os.platform();
    await opn(file, {
      wait: false,
      app: platform === 'darwin' ? 'google chrome' : (platform === 'linux' ? 'google-chrome' : 'chrome')
    });
  }

  static async getBounds() {
    const platform = os.platform();
    let info: win.Result;

    if (platform === 'win32') { // Run in separate process, as it uses ffi-napi, and is incompatible with vscode's electron
      info = JSON.parse(
        (await Util.processToStd('node', [path.resolve(__dirname, 'active-win-run')], { cwd: process.cwd() }, true)
        ).stdout.trim()
      );
    } else {
      info = await win();
    }

    let bounds = info.bounds!;

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
    } else if (platform === 'win32') {
      bounds.x += 16;
      bounds.y += 16;
      bounds.height -= 8;
      bounds.width -= 8;
    }

    return bounds!;
  }

  static async getMacInputDevices(ffmpegBinary: string, audio = false) {
    const { stderr: text } = await Util.processToStd(ffmpegBinary, ['-f', 'avfoundation', '-list_devices', 'true', '-i', '""']);
    const matchedIndex = text.match(/\[(\d+)\]\s+Capture\s+Screen/i)!;
    if (!matchedIndex) {
      throw new Error('Cannot find screen recording device');
    }
    const videoIndex = matchedIndex[1].toString();
    let audioIndex = 'none';
    if (audio) {
      const matchedAudioIndex = text.match(/\[(\d+)\]\s+Mac[^\n]*Microphone/i)!;
      if (!matchedAudioIndex) {
        throw new Error('Cannot find microphone recording device');
      }
      audioIndex = matchedAudioIndex[1].toString();
    }
    return { video: videoIndex, audio: audioIndex };
  }

  static async getWinDevices(ffmpegBinary: string, audio = false) {
    const { stderr: text } = await Util.processToStd(ffmpegBinary, ['-f', 'dshow', '-list_devices', 'true', '-i', 'dummy']);
    const matchedAudio = text.match(/\"(Microphone[^"]+)"/i)!;
    if (!matchedAudio) {
      throw new Error('Cannot find microphone recording device');
    }
    return { audio: matchedAudio[1].toString() };
  }

  static async getMacScreenSize() {
    const { stdout } = await Util.processToStd('osascript',
      ['-e', `'tell application "Finder" to get bounds of window of desktop'`], {}, true);
    const [, , w, h] = stdout.split(/\s*,\s*/).map(x => parseInt(x, 10));
    return { w, h };
  }
}