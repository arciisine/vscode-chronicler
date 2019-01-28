import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

import { Log } from './log';

export class Util {
  static context: vscode.ExtensionContext;

  static getResource(rel: string) {
    return path.resolve(this.context.extensionPath, rel.replace(/\//g, path.sep)).replace(/\\/g, '/');
  }

  static processToPromise(cmd: string, args: any[], opts?: child_process.SpawnOptions) {

    Log.info([cmd, ...args].join(' '));

    const proc = child_process.spawn(cmd, args, {
      cwd: vscode.workspace.workspaceFolders![0].uri.fsPath,
      shell: true,
      ...opts
    });

    proc.stderr.on('data', x => Log.debug(x.toString().trim()));

    const kill = (now: boolean = false) => {
      if (!now) {
        (proc as any).quitting = !now;
        proc.kill('SIGTERM');
      } else {
        proc.kill('SIGKILL');
      }
    };

    const done = () => kill.bind(null, false);

    process.on('exit', done);

    const finish = new Promise<string>((resolve, reject) => {
      proc.once('error', () => {
        reject(new Error(`Cannot start ${cmd}`));
      });

      proc.once('exit', (code) => {
        process.removeListener('exit', done);
        if (code && !(proc as any).quitting) {
          Log.error(`Invalid exit status: ${code}`);
          reject(new Error(`Invalid exit status: ${code}`));
        } else {
          Log.info('Successfully terminated');
          resolve();
        }
      });
    });

    return { finish, kill, proc };
  }

  static async processToStd(cmd: string, args: string[], opts?: child_process.SpawnOptions, throwError = false) {
    const { proc, finish } = await this.processToPromise(cmd, args, opts);
    const output = { stdout: [] as Buffer[], stderr: [] as Buffer[], success: false };
    proc.stderr.removeAllListeners('data');

    proc.stdout.on('data', v => output.stdout.push(v));
    proc.stderr.on('data', v => output.stderr.push(v));

    try {
      await finish;
      output.success = true;
    } catch (e) {
      if (throwError) {
        throw new Error(Buffer.concat(output.stderr).toString());
      }
    }

    return {
      success: output.success,
      stderr: Buffer.concat(output.stderr).toString(),
      stdout: Buffer.concat(output.stdout).toString()
    };
  }
}