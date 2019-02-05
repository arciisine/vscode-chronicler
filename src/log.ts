import * as vscode from 'vscode';
import { Config } from './config';

export class Log {
    static output = vscode.window.createOutputChannel('chronicler');
	static showLog() {
		Log.output.show(true);
	}
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

enum LogLevel {
    info = 'info',
    error = 'error',
    debug = 'debug'
}

export namespace decorators {
    export function debug(message: string) {
        return trace(message, LogLevel.debug);
    }
    export function error(message: string) {
        return trace(message, LogLevel.error);
    }
    export function info(message: string) {
        return trace(message, LogLevel.info);
    }
}

const loggerMethods = {
    info: Log.info,
    error: Log.error,
    debug: Log.debug
};

function trace(message: string, logLevel: LogLevel) {
    return function(_: Object, __: string, descriptor: TypedPropertyDescriptor<any>) {
        const originalMethod = descriptor.value;
        descriptor.value = function(...args: any[]) {
            function writeSuccess() {
                // If log level is errors, then no need to log any success messages.
                if (logLevel === LogLevel.error) {
                    return;
                }
                writeToLog();
            }
            function writeError(ex: Error) {
                writeToLog(ex);
            }
            // tslint:disable-next-line:no-any
            function writeToLog(ex?: Error) {
                const messagesToLog = [message];
                if (ex) {
                    messagesToLog.push(`${ex}`);
                }
                loggerMethods[logLevel](messagesToLog.join(', '));
            }
            try {
                const result = originalMethod.apply(this, args);
                // If method being wrapped returns a promise then wait for it.
                if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                    (result as Promise<void>).then(writeSuccess).catch(writeError);
                } else {
                    writeSuccess();
                }
                return result;
            } catch (ex) {
                writeError(ex);
                throw ex;
            }
        };

        return descriptor;
    };
}
