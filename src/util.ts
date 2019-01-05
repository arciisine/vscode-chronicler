import * as vscode from 'vscode';
import * as spawn from 'cross-spawn';
import * as child_process from 'child_process';
import * as path from 'path';

import { Log } from './log';

export class Util {
  static context: vscode.ExtensionContext;

  static getResource(rel: string) {
    return path.resolve(this.context.extensionPath, rel.replace(/\//g, path.sep));
  }

  static processToPromise(cmd: string, args: any[], opts?: child_process.SpawnOptions) {

    Log.info([cmd, ...args].join(' '));

    const proc = spawn(cmd, args, {
      cwd: vscode.workspace.workspaceFolders![0].uri.fsPath,
      shell: true,
      ...opts
    });

    proc.stderr.on('data', x => Log.debug(x.toString().trim()));

    const done = () => proc.kill();

    process.on('exit', done);

    const finish = new Promise<string>((resolve, reject) => {
      proc.once('error', () => {
        reject(new Error(`Cannot start ${cmd}`));
      });

      proc.once('exit', (code) => {
        process.removeListener('exit', done);
        if (code) {
          Log.error(`Invalid exit status: ${code}`);
          reject(new Error(`Invalid exit status: ${code}`));
        } else {
          Log.info('Successfully terminated');
          resolve();
        }
      });
    });

    const kill = (now: boolean = false) => proc.kill(now ? 'SIGKILL' : 'SIGTERM');

    return { finish, kill };
  }
}