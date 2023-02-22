import * as vscode from "vscode";
import { dirname } from "path";
import { promises as fs } from "fs";

import { Recorder } from "./recorder";
import { RecordingStatus } from "./status";

import { Util } from "./util";
import { RecordingOptions } from "./types";
import { Config } from "./config";

export async function activate(context: vscode.ExtensionContext) {
  Util.context = context;

  const recorder = new Recorder();
  const status = new RecordingStatus();

  var disposable: vscode.Disposable;
  var lastFile: string;
  var lastHeartbeat: number = 0;
  var lastDebug: boolean = false;
  var lastCompile: boolean = false;
  var fetchTodayInterval: number = 60000;
  var lastFetchToday: number = 0;
  var disabled: boolean = false;
  var isCompiling: boolean = false;
  var isDebugging: boolean = false;
  var currentlyFocusedFile: string;

  async function stop() {
    await new Promise((resolve) => setTimeout(resolve, 125)); // Allows for click to be handled properly
    if (status.counting) {
      status.stop();
    } else if (recorder.active) {
      status.stopping();
      recorder.stop();
    } else if (recorder.running) {
      status.stop();
      recorder.stop(true);
    }
  }

  async function initRecording() {
    if (!(await Config.getFFmpegBinary())) {
      vscode.window.showWarningMessage(
        "FFmpeg binary location not defined, cannot record unless path is set."
      );
      return;
    }

    if (!(await Config.getDestFolder())) {
      vscode.window.showWarningMessage(
        "Cannot record video without setting destination folder"
      );
      return;
    }

    try {
      await status.countDown();
    } catch (err) {
      vscode.window.showWarningMessage("Recording cancelled");
      return;
    }

    return true;
  }

  async function record(opts: Partial<RecordingOptions> = {}) {
    try {
      if (!(await initRecording())) {
        return;
      }

      const run = await recorder.run(opts);
      var intervalId = setInterval(checkIfAFK, 131000);
      status.start();
      const { file } = await run.output();
      status.stop();
      clearInterval(intervalId);

      const choice = await vscode.window.showInformationMessage(
        `Session output ${file}`,
        "View",
        "Copy",
        "Delete",
        "Folder"
      );
      console.log(vscode.Uri.file(file));
      switch (choice) {
        case "View":
          await vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.file(file)
          );
          break;
        case "Folder":
          await vscode.env.openExternal(vscode.Uri.file(dirname(file)));
          break;
        case "Copy":
          vscode.env.clipboard.writeText(file);
          break;
        case "Delete":
          await fs.unlink(file);
          break;
      }
    } catch (e) {
      vscode.window.showErrorMessage(e.message);
      if (!recorder.active) {
        status.stop();
      }
    }
  }

  async function initializeLiveShare() {
    if (Config.getAutoRecordLiveShare()) {
      const vsls = await import("vsls");
      const liveShare = await vsls.getApi();

      if (liveShare) {
        liveShare.onDidChangeSession((e) => {
          if (e.session.role === vsls.Role.None) {
            stop();
          } else {
            record();
          }
        });
      }
    }
  }

  async function initialiazeAutoRecord() {
    let subscriptions: vscode.Disposable[] = [];
    vscode.window.onDidChangeTextEditorSelection(onChange, null, subscriptions);
    vscode.window.onDidChangeActiveTextEditor(onChange, null, subscriptions);
    vscode.workspace.onDidSaveTextDocument(onSave, null, subscriptions);

    vscode.tasks.onDidStartTask(onDidStartTask, null, subscriptions);
    vscode.tasks.onDidEndTask(onDidEndTask, null, subscriptions);

    vscode.debug.onDidChangeActiveDebugSession(
      onDebuggingChanged,
      null,
      subscriptions
    );
    vscode.debug.onDidChangeBreakpoints(
      onDebuggingChanged,
      null,
      subscriptions
    );
    vscode.debug.onDidStartDebugSession(
      onDidStartDebugSession,
      null,
      subscriptions
    );
    vscode.debug.onDidTerminateDebugSession(
      onDidTerminateDebugSession,
      null,
      subscriptions
    );

    // create a combined disposable for all event subscriptions
    disposable = vscode.Disposable.from(...subscriptions);
    context.subscriptions.push(disposable);
  }

  function onDebuggingChanged(): void {
    onEvent(false);
  }

  function onDidStartDebugSession(): void {
    isDebugging = true;
    onEvent(false);
  }

  function onDidTerminateDebugSession(): void {
    isDebugging = false;
    onEvent(false);
  }

  function onDidStartTask(e: vscode.TaskStartEvent): void {
    if (e.execution.task.isBackground) return;
    isCompiling = true;
    onEvent(false);
  }

  function onDidEndTask(): void {
    isCompiling = false;
    onEvent(false);
  }

  function onChange(): void {
    onEvent(false);
  }

  function onSave(): void {
    onEvent(true);
  }

  function onEvent(isWrite: boolean): void {
    if (disabled) return;

    let editor = vscode.window.activeTextEditor;
    if (editor) {
      let doc = editor.document;
      if (doc) {
        let file: string = doc.fileName;
        if (file) {
          let time: number = Date.now();
          console.log(enoughTimePassed(time));
          if (
            isWrite ||
            enoughTimePassed(time) ||
            lastFile !== file ||
            lastDebug !== isDebugging ||
            lastCompile !== isCompiling
          ) {
            lastFile = file;
            lastHeartbeat = time;
            lastDebug = isDebugging;
            lastCompile = isCompiling;
            if(!recorder.active){
              console.log("ok");
              record();
            }
          }
        }
      }
    }
  }

  function enoughTimePassed(time: number): boolean {
    return lastHeartbeat + 120000 < time;
  }

  function checkIfAFK(): void {
    if (enoughTimePassed(Date.now())) {
      stop();
    }
  }


  vscode.commands.registerCommand("chronicler.stop", stop);
  vscode.commands.registerCommand("chronicler.record", () => record());
  vscode.commands.registerCommand("chronicler.recordGif", () =>
    record({ animatedGif: true })
  );
  vscode.commands.registerCommand("chronicler.recordWithAudio", () =>
    record({ audio: true })
  );
  vscode.commands.registerCommand("chronicler.recordWithDuration", async () => {
    const time = await vscode.window.showInputBox({
      prompt: "Duration of recording (time in seconds)",
      placeHolder: "120",
    });
    if (time) {
      record({ duration: parseInt(time, 10) });
    }
  });
  context.subscriptions.push(recorder, status);

  initializeLiveShare();
  initialiazeAutoRecord();
}
