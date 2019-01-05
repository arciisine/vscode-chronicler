import * as vscode from 'vscode';
import { Config } from './config';

export class Log {
  static output = vscode.window.createOutputChannel('chronicler');

  static info(msg: string) {
    this.output.appendLine(`[INFO] ${msg}`);
  }

  static error(error: string) {
    this.output.appendLine(`[ERROR] ${error}`);
  }

  static debug(msg: string) {
    if (Config.isDebugMode()) {
      this.output.appendLine(`[ERROR] ${msg}`);
    }
  }
}