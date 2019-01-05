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
    this.item.text = !active ? '$(device-camera-video) Record Screen' : '$(diff-modified)  Stop Recording';
    this.item.color = !active ? 'white' : '#880000';
  }
}