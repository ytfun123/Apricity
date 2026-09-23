# Games library

Each subfolder here is one game/category shown in the "Games library" section
of the site. To add a new category (say, `docs/games/portal/`):

1. Create the folder and drop your `.8xp`/`.8xg`/etc. files in it.
   For Python games (TI-84 Plus CE Python / TI-84 Evo), drop the `.py` source in
   the folder and run `node scripts/py2appvar.js` from `apps/ti-flash/` — it
   generates the matching Python AppVar (`.8xv`) files and rewrites the
   manifest. Only the `.8xv` files are sent; the `.py` files stay as source.
2. Add a `manifest.json` in that same folder listing the files:

```json
[
  { "file": "portal-demo.8xp", "label": "Portal Demo" },
  { "file": "portal-levels.8xg", "label": "Extra levels" }
]
```

3. Register the category in `GAME_CATEGORIES` in `src/index.js`:

```js
{ key: 'portal', label: 'Portal', dir: 'games/portal' }
```

That's it — no other code changes needed. The site fetches `manifest.json`
at runtime, so you can keep adding/removing files by editing that one file
and committing.

Currently set up:
- `gd/` — Geometry Dash
- `mc/` — Minecraft
