# Diagnostic Audio

Prototype VS Code extension that announces changes in diagnostics with short audio cues.

## Current scope

- Monitors the active editor only.
- Reacts to `Error` and `Warning` diagnostics.
- Plays different sounds when diagnostics appear or are resolved.
- Debounces rapid updates to avoid sound spam.

## Current limitations

- Linux-oriented MVP: uses `paplay` and standard sound files from `/usr/share/sounds/freedesktop/stereo`.
- No text-to-speech or screen-reader message output in this version.
- No manual command to list diagnostics yet.

## Settings

- `diagnosticAudio.enabled`
- `diagnosticAudio.volume`
- `diagnosticAudio.debounceMs`

## Development

```bash
npm install
npm run compile
```

Then press `F5` in VS Code to launch the extension development host.
