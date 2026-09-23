# Built-in files

Drop your calculator files here and reference them from `BUILTIN_FILES` in
`src/index.js`:

- `jailbreak.8xp` — the arTIfiCE jailbreak file that restores
  ASM/C program support on CE-family OS versions where TI has locked it down.
- `cesium.8xp` — the Cesium shell file for the CE line, commonly installed
  right after jailbreaking to make launching homebrew games/programs easier.
- `ion.8xg` — the ION shell for the classic (Z80) TI-84 Plus line. Sent to a
  Plus instead of arTIfiCE/Cesium; games then show up under the APPS menu.

Each entry has a `family` field: `ce` files are offered on the TI-84 Plus CE /
TI-83 Premium CE line, `plus` files on the classic TI-84 Plus.

These are plain `.8xp`/`.8xg` calculator files. The app fetches them the same
way it reads a file you pick from disk, so no special format is needed — just
make sure the filenames match what's configured in `BUILTIN_FILES`.
