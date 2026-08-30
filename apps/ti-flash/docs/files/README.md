# Built-in files

Drop your calculator files here and reference them from `BUILTIN_FILES` in
`src/index.js`:

- `jailbreak.8xp` — the arTIfiCE (or similar) jailbreak file that restores
  ASM/C program support on OS versions where TI has locked it down.
- `cesium.8xp` — the Cesium shell file, commonly installed right after
  jailbreaking to make launching homebrew games/programs easier.

These are plain `.8xp` calculator files. The app fetches them the same way it
reads a file you pick from disk, so no special format is needed — just make
sure the filenames match what's configured in `BUILTIN_FILES`.
