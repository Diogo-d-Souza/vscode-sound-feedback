import * as path from "node:path";
import { spawn } from "node:child_process";
import * as vscode from "vscode";

type DiagnosticKey = string;
type SoundEvent = "appeared" | "resolved";
type SupportedSeverity = vscode.DiagnosticSeverity.Error | vscode.DiagnosticSeverity.Warning;

type SoundDescriptor = {
  event: SoundEvent;
  severity: SupportedSeverity;
};

const CONFIG_SECTION = "diagnosticAudio";

const SOUND_FILES: Record<string, string> = {
  "appeared:error": "/usr/share/sounds/freedesktop/stereo/suspend-error.oga",
  "resolved:error": "/usr/share/sounds/freedesktop/stereo/complete.oga",
  "appeared:warning": "/usr/share/sounds/freedesktop/stereo/dialog-warning.oga",
  "resolved:warning": "/usr/share/sounds/freedesktop/stereo/message.oga"
};

const timers = new Map<string, NodeJS.Timeout>();
const stateByDocument = new Map<string, Set<DiagnosticKey>>();
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel("Diagnostic Audio");
  outputChannel.appendLine("Diagnostic Audio extension activated.");

  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand("diagnosticAudio.testSound", async () => {
      outputChannel.appendLine("Manual test sound requested.");
      await playSound({ event: "appeared", severity: vscode.DiagnosticSeverity.Error });
    }),
    vscode.languages.onDidChangeDiagnostics((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        outputChannel.appendLine("Diagnostics changed, but no active editor was found.");
        return;
      }

      const activeUri = activeEditor.document.uri;
      const activeUriString = activeUri.toString();

      if (!event.uris.some((uri) => uri.toString() === activeUriString)) {
        outputChannel.appendLine("Diagnostics changed outside the active editor. Ignoring.");
        return;
      }

      outputChannel.appendLine(`Diagnostics changed for active editor: ${activeEditor.document.fileName}`);
      scheduleAnnouncementForDocument(activeEditor.document);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) {
        return;
      }

      synchronizeDocumentState(editor.document);
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      const documentKey = document.uri.toString();
      stateByDocument.delete(documentKey);
      clearTimer(documentKey);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration(CONFIG_SECTION)) {
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        return;
      }

      synchronizeDocumentState(activeEditor.document);
    })
  );

  if (vscode.window.activeTextEditor) {
    synchronizeDocumentState(vscode.window.activeTextEditor.document);
  }
}

export function deactivate(): void {
  for (const timer of timers.values()) {
    clearTimeout(timer);
  }

  timers.clear();
}

function scheduleAnnouncementForDocument(document: vscode.TextDocument): void {
  if (!getEnabledSetting()) {
    outputChannel.appendLine("Extension is disabled. Synchronizing state without sound.");
    synchronizeDocumentState(document);
    return;
  }

  const documentKey = document.uri.toString();
  clearTimer(documentKey);

  const delay = getDebounceSetting();
  outputChannel.appendLine(`Scheduling diagnostic announcement in ${delay}ms.`);
  const timer = setTimeout(() => {
    timers.delete(documentKey);
    announceDiagnosticChanges(document);
  }, delay);

  timers.set(documentKey, timer);
}

function clearTimer(documentKey: string): void {
  const timer = timers.get(documentKey);
  if (!timer) {
    return;
  }

  clearTimeout(timer);
  timers.delete(documentKey);
}

function announceDiagnosticChanges(document: vscode.TextDocument): void {
  const documentKey = document.uri.toString();
  const currentState = collectDiagnosticKeys(document.uri);
  const previousState = stateByDocument.get(documentKey) ?? new Set<DiagnosticKey>();

  const previousOnly = difference(previousState, currentState);
  const currentOnly = difference(currentState, previousState);

  stateByDocument.set(documentKey, currentState);

  const soundQueue: SoundDescriptor[] = [];

  if (containsSeverity(currentOnly, "error")) {
    soundQueue.push({ event: "appeared", severity: vscode.DiagnosticSeverity.Error });
  }

  if (containsSeverity(currentOnly, "warning")) {
    soundQueue.push({ event: "appeared", severity: vscode.DiagnosticSeverity.Warning });
  }

  if (containsSeverity(previousOnly, "error")) {
    soundQueue.push({ event: "resolved", severity: vscode.DiagnosticSeverity.Error });
  }

  if (containsSeverity(previousOnly, "warning")) {
    soundQueue.push({ event: "resolved", severity: vscode.DiagnosticSeverity.Warning });
  }

  outputChannel.appendLine(
    `Diagnostics comparison: ${currentOnly.size} appeared, ${previousOnly.size} resolved, ${soundQueue.length} sound event(s).`
  );

  void playSoundQueue(soundQueue);
}

function synchronizeDocumentState(document: vscode.TextDocument): void {
  outputChannel.appendLine(`Synchronizing diagnostic state for: ${document.fileName}`);
  stateByDocument.set(document.uri.toString(), collectDiagnosticKeys(document.uri));
}

function collectDiagnosticKeys(uri: vscode.Uri): Set<DiagnosticKey> {
  const diagnostics = vscode.languages
    .getDiagnostics(uri)
    .filter((diagnostic) => isSupportedSeverity(diagnostic.severity));

  return new Set(
    diagnostics.map((diagnostic) => {
      const severityName = diagnostic.severity === vscode.DiagnosticSeverity.Error ? "error" : "warning";
      return [
        severityName,
        diagnostic.range.start.line,
        diagnostic.range.start.character,
        diagnostic.range.end.line,
        diagnostic.range.end.character,
        diagnostic.code ?? "",
        diagnostic.message
      ].join(":");
    })
  );
}

function isSupportedSeverity(
  severity: vscode.DiagnosticSeverity
): severity is SupportedSeverity {
  return severity === vscode.DiagnosticSeverity.Error || severity === vscode.DiagnosticSeverity.Warning;
}

function difference(source: Set<DiagnosticKey>, compareAgainst: Set<DiagnosticKey>): Set<DiagnosticKey> {
  const output = new Set<DiagnosticKey>();

  for (const item of source) {
    if (!compareAgainst.has(item)) {
      output.add(item);
    }
  }

  return output;
}

function containsSeverity(keys: Set<DiagnosticKey>, severityName: "error" | "warning"): boolean {
  for (const key of keys) {
    if (key.startsWith(`${severityName}:`)) {
      return true;
    }
  }

  return false;
}

async function playSoundQueue(soundQueue: SoundDescriptor[]): Promise<void> {
  if (soundQueue.length === 0 || !getEnabledSetting()) {
    return;
  }

  for (const descriptor of soundQueue) {
    await playSound(descriptor);
  }
}

function playSound(descriptor: SoundDescriptor): Promise<void> {
  const soundPath = SOUND_FILES[toSoundMapKey(descriptor)];
  const resolvedSoundPath = path.resolve(soundPath);
  const volume = clampVolume(getVolumeSetting());
  const volumeArgument = String(Math.round(volume * 65536));

  outputChannel.appendLine(`Playing sound: ${resolvedSoundPath} at volume ${volumeArgument}.`);

  return new Promise((resolve) => {
    const child = spawn("paplay", ["--volume", volumeArgument, resolvedSoundPath], {
      stdio: "ignore"
    });

    child.once("error", (error) => {
      outputChannel.appendLine(`Failed to start paplay: ${error.message}`);
      resolve();
    });

    child.once("close", (code) => {
      outputChannel.appendLine(`paplay finished with code: ${code ?? "unknown"}.`);
      resolve();
    });
  });
}

function toSoundMapKey(descriptor: SoundDescriptor): string {
  const severityName = descriptor.severity === vscode.DiagnosticSeverity.Error ? "error" : "warning";
  return `${descriptor.event}:${severityName}`;
}

function getEnabledSetting(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>("enabled", true);
}

function getDebounceSetting(): number {
  const configuredDelay = vscode.workspace.getConfiguration(CONFIG_SECTION).get<number>("debounceMs", 400);
  return Math.max(0, configuredDelay);
}

function getVolumeSetting(): number {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<number>("volume", 1);
}

function clampVolume(value: number): number {
  if (Number.isNaN(value)) {
    return 1;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}
