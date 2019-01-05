import * as vscode from 'vscode';

import { Recorder } from './recorder';
import { RecordingStatus } from './status';

import opn = require('opn');
import { Util } from './util';
import { VlcRecordOptions } from './vlc';

export function activate(context: vscode.ExtensionContext) {

  Util.context = context;

  const controller = new Recorder();
  const status = new RecordingStatus();

  async function stop() {
    try {
      const { file } = await controller.stop();
      vscode.window.showInformationMessage(`Session output ${file}`, 'Open', 'Copy', 'Dismiss')
        .then(res => {
          if (res === 'Open') {
            opn(file, { wait: false });
          } else if (res === 'Copy') {
            vscode.env.clipboard.writeText(file);
          }
        });
    } catch (e) {
      vscode.window.showErrorMessage(e.message);
    }
    status.setState(controller.active);
  }

  async function record(opts: Partial<VlcRecordOptions> = {}) {
    try {
      await status.countDown(5);
      await controller.start(opts);
      status.setState(true);
    } catch (e) {
      vscode.window.showErrorMessage(e.message);
    }
    status.setState(controller.active);
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
      record({ duration: parseInt(time, 10) * 1000 });
    }
  });

  context.subscriptions.push(controller, status);
}