import * as vscode from 'vscode';
import { Config } from './config';

function clean(x: number) {
  let res = `${Math.trunc(x)}`;
  if (res.length < 2) {
    res = `0${res}`;
  }
  return res;
}

export class RecordingStatus {

  private item: vscode.StatusBarItem;
  timeout: NodeJS.Timer;
  counting = false;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.stop();
    this.item.show();
  }

  show() {
    this.item.show();
  }

  dispose() {
    this.recordingStopped();
    this.item.dispose();
  }

  stop() {
    this.recordingStopped();
    this.item.command = 'chronicler.record';
    this.item.text = '$(triangle-right) Chronicler';
    this.item.color = new vscode.ThemeColor('statusBar.foreground');
    this.counting = false;
  }

  stopping() {
    this.recordingStopped();
    this.counting = false;
    this.item.text = '$(pulse) Chronicler Stopping...';
    this.item.color = '#ffff00';
  }

  recordingStopped() {
    if (this.timeout) {
      clearInterval(this.timeout);
    }
  }

  start() {
    this.item.command = 'chronicler.stop';
    this.item.text = '$(primitive-square) Chronicler';
    this.item.color = '#ff8888';

    const start = Date.now();
    const og = this.item.text;
    const sec = 1000;
    const min = sec * 60;
    const hour = min * 60;

    const update = () => {
      const time = Date.now() - start;
      let timeStr = `${clean((time / min) % 60)}:${clean((time / sec) % 60)}`;
      if (time > hour) {
        timeStr = `${Math.trunc(time / hour)}:${timeStr}`;
      }
      this.item.text = `${og}: ${timeStr}`;
    };

    this.timeout = setInterval(update, 1000);

    update();
  }

  async countDown(seconds?: number) {
    if (seconds === undefined) {
      const defs = await Config.getRecordingDefaults();
      seconds = defs.countdown || 0;
    }

    this.item.command = 'chronicler.stop';

    this.counting = true;

    const colors = ['#ffff00', '#ffff33', '#ffff66', '#ffff99', '#ffffcc'];

    for (let i = seconds; i > 0; i--) {
      this.item.color = colors[i];
      this.item.text = `$(pulse) Starting in ${i} seconds`;
      await new Promise(r => setTimeout(r, 1000));
      if (!this.counting) {
        throw new Error('Countdown canceled');
      }
    }

    this.counting = false;
    this.item.text = '$(pulse) Chronicler Starting ...';
    this.item.color = colors[0];
  }
}
