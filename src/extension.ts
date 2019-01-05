import * as vscode from 'vscode';

import { Recorder } from './recorder';
import { RecordingStatus } from './status';

import opn = require('opn');
import { Util } from './util';
import { RecordingOptions } from './types';
import { Config } from './config';

export function activate(context: vscode.ExtensionContext) {

  Util.context = context;

  const controller = new Recorder();
  const status = new RecordingStatus();

  async function stop() {
    status.stopping();
    controller.stop();
  }

  async function record(opts: Partial<RecordingOptions> = {}) {
    try {
      if (!(await Config.getFFmpegBinary())) {
        return;
      }
      await status.countDown();
      const run = await controller.run(opts)!;
      status.recording();

      const { file } = (await run.output)!;

      status.setState(false);

      const choice = await vscode.window.showInformationMessage(`Session output ${file}`, 'Open', 'Copy', 'Dismiss');

      if (choice === 'Open') {
        opn(file, { wait: false });
      } else if (choice === 'Copy') {
        vscode.env.clipboard.writeText(file);
      }

    } catch (e) {
      vscode.window.showErrorMessage(e.message);
    } finally {
      status.setState(false);
    }
  }

  vscode.commands.registerCommand('chronicler.stop', stop);
  vscode.commands.registerCommand('chronicler.record', () => record());
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

  context.subscriptions.push(controller, status);
}