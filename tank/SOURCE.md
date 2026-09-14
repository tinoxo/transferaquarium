# Vendored build — do not edit by hand

The contents of this directory are a **production build** of
[tinoxo/fish-tank](https://github.com/tinoxo/fish-tank), copied in so the
dashboard can embed it without taking on a build step.

- Source commit: `e7f73227c75e7aa38bd62776405fe7c0a06c6def`
- Built with: `npx vite build --base=./`

`--base=./` matters: it makes every asset URL relative to this directory, so
the tank works whether it's served from `/`, from
`/transferaquarium/tank/`, or from a local dev server — no path baked in.

## Updating the tank

```
git clone https://github.com/tinoxo/fish-tank
cd fish-tank && npm ci && npx vite build --base=./
cp -r dist/* /path/to/transferaquarium/tank/
cp CREDITS.md /path/to/transferaquarium/tank/CREDITS.md
```

Then update the commit SHA above, **and re-apply the local patch below** — a
re-copy overwrites `index.html`.

## Local patch (must be re-applied after every re-copy)

`index.html` carries a `#back-to-dashboard` link plus its inline `<style>`,
added here and not present upstream. The tank fills the window and has no
chrome of its own, so without it there is no way back to the dashboard once
someone opens the tank in its own tab. It is marked with an
`ADDED FOR transferaquarium` comment in the file.

Model attribution travels with these files — see `CREDITS.md` in this
directory. Some entries there are marked as unconfirmed licensing; that
carries over to this repo too.
