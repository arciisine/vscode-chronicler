import * as vscode from 'vscode';

export class RecordingStatus {

  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this.setState(false);
    this.item.show();
  }

  show() {
    this.item.show();
  }

  dispose() {
    this.item.dispose();
  }

  setState(active: boolean) {
    this.item.command = !active ? 'chronicler.record' : 'chronicler.stop';
    this.item.text = !active ? '$(triangle-right) Chronicler' : '$(primitive-square) Chronicler';
    this.item.color = !active ? 'white' : '#880000';
  }

  async countDown(seconds = 5) {
    this.item.command = 'chronicler.stop';

    for (let i = seconds; i > 0; i--) {
      this.item.color = ['#FFFF00', '#FFFF33', '#FFFF66', '#FFFF99', '#FFFFC'][5 - i];
      this.item.text = `$(pulse) Starting in ${i} seconds`;
      await new Promise(r => setTimeout(r, 1000));
    }
    this.item.text = '$(pulse) Chronicler Starting ...';
    this.item.color = 'orange';
  }
}