import * as vscode from 'vscode';
import { OSUtil } from '@arcsine/screen-recorder/lib/os';

import { Recorder } from './recorder';
import { RecordingStatus } from './status';

import { Util } from './util';
import { RecordingOptions } from './types';
import { Config } from './config';

export function activate(context: vscode.ExtensionContext) {

  Util.context = context;

  const recorder = new Recorder();
  const status = new RecordingStatus();

  async function stop() {
    if (recorder.active) {
      status.stopping();
      recorder.stop();
    } else {
      status.setState(false);
      recorder.stop(true);
    }
  }

  async function record(opts: Partial<RecordingOptions> = {}) {
    try {
      if (!(await Config.getFFmpegBinary())) {
        vscode.window.showWarningMessage('FFmpeg binary location not defined, cannot record unless path is set.');
        return;
      }

      if (!(await Config.getDestFolder())) {
        vscode.window.showWarningMessage('Cannot record video without setting destination folder');
        return;
      }

      await status.countDown();
      const run = await recorder.run(opts)!;
      status.recording();

      const { file } = (await run.output)!;

      status.setState(false);

      const choice = await vscode.window.showInformationMessage(`Session output ${file}`, 'Open', 'Copy', 'Dismiss');

      if (choice === 'Open') {
        await OSUtil.openFile(file);
      } else if (choice === 'Copy') {
        vscode.env.clipboard.writeText(file);
      }

    } catch (e) {
      vscode.window.showErrorMessage(e.message);
    }

    if (!recorder.active) {
      status.setState(false);
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
}