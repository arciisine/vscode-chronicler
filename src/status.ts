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
}