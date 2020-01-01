import { window, debug, ThemeColor, StatusBarItem, StatusBarAlignment } from 'vscode';
import { Config } from './config';

function clean(x: number) {
  let res = `${Math.trunc(x)}`;
  if (res.length < 2) {
    res = `0${res}`;
  }
  return res;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const SECOND_MS = 1000;
const MINUTE_MS = SECOND_MS * 60;
const HOUR_MS = MINUTE_MS * 60;

export class RecordingStatus {

  private item: StatusBarItem;
  timeout: NodeJS.Timer;
  counting = false;

  constructor() {
    this.item = window.createStatusBarItem(StatusBarAlignment.Right);
    this.stop();
    this.item.show();
  }

  get mainColor() {
    return new ThemeColor(
      debug.activeDebugSession ?
        'statusBar.debuggingForeground' :
        'statusBar.foreground');
  }

  get contrastingColors() {
    // TODO: compute list based on theme dark/light
    return ['#ffff00', '#ffff33', '#ffff66', '#ffff99', '#ffffcc'];
  }

  get contrastingColorMain() {
    return this.contrastingColors[0];
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
    this.item.color = this.mainColor;

    this.counting = false;
  }

  stopping() {
    this.recordingStopped();
    this.item.text = '$(pulse) Chronicler Stopping...';
    this.item.color = this.contrastingColorMain;

    this.counting = false;
  }

  recordingStopped() {
    if (this.timeout) {
      clearInterval(this.timeout);
    }
  }

  updateTime(originalText: string, start: number) {
    const time = Date.now() - start;
    let timeStr = `${clean((time / MINUTE_MS) % 60)}:${clean((time / SECOND_MS) % 60)}`;
    if (time > HOUR_MS) {
      timeStr = `${Math.trunc(time / HOUR_MS)}:${timeStr}`;
    }
    this.item.text = `${originalText}: ${timeStr}`;
  }

  start() {
    this.item.command = 'chronicler.stop';
    this.item.text = '$(primitive-square) Chronicler';
    this.item.color = this.contrastingColorMain;

    const update = this.updateTime.bind(this, this.item.text, Date.now());

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

    const cols = this.contrastingColors;

    for (let i = seconds; i > 0; i--) {
      this.item.text = `$(pulse) Starting in ${i} seconds`;
      this.item.color = cols[Math.trunc((i - 1) / seconds * cols.length)];

      await sleep(1000);

      if (!this.counting) {
        throw new Error('Countdown canceled');
      }
    }

    this.counting = false;
    this.item.text = '$(pulse) Chronicler Starting ...';
    this.item.color = this.contrastingColorMain;
  }
}
