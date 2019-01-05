import * as vscode from 'vscode';

import { Recorder } from './recorder';
import { RecordingStatus } from './status';

import opn = require('opn');
import { FFmpegUtil } from './ffmpeg';

export function activate(context: vscode.ExtensionContext) {

  const controller = new Recorder();
  const status = new RecordingStatus();

  vscode.commands.registerCommand('chronicler.stop', async () => {
    try {
      const { file } = await controller.stop();
      vscode.window.showInformationMessage(file, 'Open', 'Copy', 'Dismiss')
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
  });

  vscode.commands.registerCommand('chronicler.record', async () => {
    try {
      await controller.start();
      status.setState(true);
    } catch (e) {
      vscode.window.showErrorMessage(e.message);
    }
    status.setState(controller.active);
  });

  context.subscriptions.push(controller, status);
}