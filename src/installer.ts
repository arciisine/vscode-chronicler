import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Log, decorators } from './log';
const ffbinaries = require('ffbinaries');

const installDirectoryKey = 'installDir1';

export type FFMpegInstallPickerOptions = {
    title: string;
    folder?: boolean;
    defaultName?: string;
    executable?: boolean;
    platformDefaults?: { darwin?: string[]; win32?: string[]; x11?: string[] };
    validator?: (res: string) => Promise<boolean> | boolean;
    onAdd?: (file: string) => Promise<any> | any;
};

export class Installer {
    constructor(private readonly context: vscode.ExtensionContext, private readonly helper: InstallerHelper) {}
    public async getInstallDirectory(options: FFMpegInstallPickerOptions): Promise<string | undefined> {
        const shouldInstall = await this.helper.shouldInstall();
        if (!shouldInstall) {
            return this.helper.pickExistingInstallation(options);
        }
        try {
            const existingDir = await this.getExistingInstallDirectory();
            if (existingDir) {
                return;
            }
            const dir = await this.helper.pickTargetInstallDirectory();
            if (!dir) {
                return;
            }
            await this.helper.ensureInstallDirectory(dir);
            const ffmpegFile = await this.helper.install(dir);
            await this.trackInstallation(ffmpegFile);
            return ffmpegFile;
        } catch (ex) {
            Log.error(`Failed to download ffmpeg, '${ex}'`);
            const showLogs = 'View Logs';
            const selection = await vscode.window.showErrorMessage('Failed to download ffmpeg', showLogs);
            if (selection === showLogs) {
                Log.showLog();
            }
        }
    }
    private async trackInstallation(dir: string): Promise<void> {
        await this.context.globalState.update(installDirectoryKey, dir);
    }
    private async getExistingInstallDirectory(): Promise<string | undefined> {
        const dir = this.context.globalState.get<string>(installDirectoryKey, '');
        if (dir.length === 0) {
            return;
        }
        return (await fs.pathExists(dir)) ? dir : '';
    }
}
export class InstallerHelper {
    constructor(private readonly context: vscode.ExtensionContext) {}
    public async shouldInstall(): Promise<boolean> {
        const msg = 'Please provide the install directory of ffmpeg or would you like to download and install it?';
        const existingInstall = 'Pick existing install';
        const downloadAndInstall = 'Download and install';
        const option = await vscode.window.showInformationMessage(msg, existingInstall, downloadAndInstall);
        return option === downloadAndInstall;
    }
    public async pickExistingInstallation(options: FFMpegInstallPickerOptions): Promise<string | undefined> {
        const res = await vscode.window.showOpenDialog({
            openLabel: `Select ${options.title}`,
            canSelectFiles: !options.folder,
            canSelectFolders: options.folder,
            canSelectMany: false
        });

        if (!res || res.length === 0) {
            return;
        }

        return res[0].fsPath;
    }
    public async pickTargetInstallDirectory(): Promise<string | undefined> {
        const res = await vscode.window.showOpenDialog({
            openLabel: 'Select target directory',
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
        });

        const dir = res && res.length === 1 ? res[0].fsPath : undefined;
        if (!dir) {
            return;
        }
        const files = await fs.readdir(dir);
        if (Array.isArray(files) && files.length > 0) {
            vscode.window.showErrorMessage('Please select an empty directory to install ffmpeg');
            return;
        }
        return dir;
    }
    @decorators.error('Failed to install ffmpeg')
    public async install(destination: string): Promise<string> {
        Log.info(`Installing ffmpeg into ${destination}`);
        await new Promise((resolve, reject) =>
            ffbinaries.downloadBinaries('ffmpeg', { destination }, (ex: any) => (ex ? reject(ex) : resolve()))
        );
        const fileName = path.join(destination, ffbinaries.getBinaryFilename('ffmpeg'));
        if (!(await fs.pathExists(fileName))) {
            const msg = `Downloaded ffmpeg file not found '${fileName}'`;
            throw new Error(msg);
        }
        return fileName;
    }
    @decorators.error('Failed to uninstall ffmpeg')
    public async uninstall(destination: string): Promise<void> {
        Log.info(`Uninstalling ffmpeg from ${destination}`);
        await fs.remove(destination);
    }
    @decorators.error('Failed to create ffmpeg install directory')
    public async ensureInstallDirectory(dir: string): Promise<void> {
        if (!(await fs.pathExists(dir))) {
            await fs.ensureDir(dir);
        }
    }
}
