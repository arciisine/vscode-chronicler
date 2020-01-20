import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';

import { OSUtil } from '@arcsine/screen-recorder/lib/os';

import { Recorder } from './recorder';
import { RecordingStatus } from './status';

import { Util } from './util';
import { RecordingOptions } from './types';
import { Config } from './config';

export async function activate(context: vscode.ExtensionContext) {

  Util.context = context;

  const recorder = new Recorder();
  const status = new RecordingStatus();

  async function stop() {
    await new Promise(resolve => setTimeout(resolve, 125)); // Allows for click to be handled properly
    if (status.counting) {
      status.stop();
    } else if (recorder.active) {
      status.stopping();
      recorder.stop();
    } else if (recorder.running) {
      status.stop();
      recorder.stop(true);
    }
  }

  async function initRecording() {
    if (!(await Config.getFFmpegBinary())) {
      vscode.window.showWarningMessage('FFmpeg binary location not defined, cannot record unless path is set.');
      return;
    }

    if (!(await Config.getDestFolder())) {
      vscode.window.showWarningMessage('Cannot record video without setting destination folder');
      return;
    }

    try {
      await status.countDown();
    } catch (err) {
      vscode.window.showWarningMessage('Recording cancelled');
      return;
    }

    return true;
  }

  async function record(opts: Partial<RecordingOptions> = {}) {
    try {
      if (!(await initRecording())) {
        return;
      }

      const run = await recorder.run(opts);
      status.start();

      const { file } = await run.output();
      status.stop();

      const choice = await vscode.window.showInformationMessage(`Session output ${file}`, 'View', 'Copy', 'Delete', 'Folder');
      switch (choice) {
        case 'View': await OSUtil.openFile(file); break;
        case 'Folder': await OSUtil.openFile(path.dirname(file)); break;
        case 'Copy': vscode.env.clipboard.writeText(file);
        case 'Delete': await fs.unlink(file); break;
      }
    } catch (e) {
      vscode.window.showErrorMessage(e.message);
      if (!recorder.active) {
        status.stop();
      }
    }
  }

  async function initializeLiveShare() {
    if (Config.getAutoRecordLiveShare()) {
      const vsls = await import('vsls');
      const liveShare = await vsls.getApi();

      if (liveShare) {
        liveShare.onDidChangeSession((e) => {
          if (e.session.role === vsls.Role.None) {
            stop();
          } else {
            record();
          }
        });
      }
    }
  }

  vscode.commands.registerCommand('chronicler.stop', stop);
  vscode.commands.registerCommand('chronicler.record', () => record());
  vscode.commands.registerCommand('chronicler.recordGif', () => record({ animatedGif: true }));
  vscode.commands.registerCommand('chronicler.recordWithAudio', () => record({ audio: true }));
  vscode.commands.registerCommand('chronicler.recordWithDuration', async () => {
    const time = await vscode.window.showInputBox({
      prompt: 'Duration of recording (time in seconds)',
      placeHolder: '120'
    });
    if (time) {
      record({ duration: parseInt(time, 10) });
    }
  });

  context.subscriptions.push(recorder, status);

  initializeLiveShare();
}