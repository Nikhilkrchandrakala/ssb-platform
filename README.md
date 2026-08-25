# SSB Platform — Deploy Kit

This folder is everything you need to push your code changes live on the
production server (ssbwithisv.in). Read this once, then it's a
double-click every time after.

## What's in this folder

| File | What it is |
|---|---|
| `deploy.bat` | The script you run to deploy. |
| `ssb_deploy_key` | A private SSH key that lets `deploy.bat` log into the server. Treat it like a password — see "Keeping the key safe" below. |
| `README.md` | This file. |

## How the whole thing works

The live site runs on a VPS (a server, IP `88.222.214.155`), as a process
managed by a tool called PM2, under the name `ssb-platform`. The VPS has
its own copy of the git repo checked out at `/var/www/ssb-platform`.

Deploying = getting your code from your laptop onto that VPS copy,
rebuilding it, and restarting the process. `deploy.bat` does this in three
steps:

1. **Push to GitHub** — commits anything changed in your local folder and
   pushes it to `origin/main` on GitHub. This is your normal git remote,
   nothing special happens here.
2. **Pull + build on the VPS** — the script SSHs into the VPS and runs
   `git pull origin main && npm run build` there. This fetches the code
   you just pushed and compiles it into a production build, still inside
   the *old* running process — nothing user-facing changes yet.
3. **Restart with PM2** — only if step 2 succeeded, it runs
   `pm2 restart ssb-platform` on the VPS, which swaps in the new build.
   PM2 runs the app as 2 instances (cluster mode) and restarts them one
   at a time, so there's no real downtime.

**Why order matters:** the build happens *before* the restart, and the
restart only happens if the build didn't error out. So a broken build
never takes the live site down — the old process just keeps serving
traffic until a build actually succeeds.

## How to use it

**One-time setup:**
1. Make sure you have a local clone of the `ssb-platform` GitHub repo
   somewhere on your machine, with your changes committed (or ready to
   be committed — the script will `git add .` and commit anything
   pending automatically, see the warning below).
2. Open `deploy.bat` in Notepad (right-click → Edit, don't double-click
   yet).
3. Find this line near the top:
   ```
   set REPO_DIR=SET_THIS_TO_YOUR_LOCAL_ssb-platform_FOLDER
   ```
   Replace the right-hand side with the actual full path to your local
   `ssb-platform` folder, e.g.:
   ```
   set REPO_DIR=C:\Users\yourname\Documents\ssb-platform
   ```
4. Save and close.

**Every time you want to deploy:**
1. Double-click `deploy.bat` (or run it from a terminal).
2. Watch the output. It prints `[1/3]`, `[2/3]`, `[3/3]` as it goes.
3. When you see `Deployment Complete!`, the live site is updated.
   Give it a few seconds, then check https://ssbwithisv.in in a
   browser to confirm.

That's it — no need to SSH manually, no need to remember commands.

## If something goes wrong (nothing breaks the live site)

The script stops immediately at the first failure and tells you which
step failed. In every case, **the live site keeps running the last
successful build** — nothing is torn down mid-way.

- **Fails at step 1 (git push)** — most commonly because someone else
  pushed changes you don't have yet. Nothing was touched on the VPS at
  all. Fix: in your terminal, run `git pull origin main` inside your
  repo folder, resolve any conflicts if it asks, then re-run
  `deploy.bat`.
- **Fails at step 2 (pull/build on VPS)** — either the VPS couldn't pull
  (rare, usually a network hiccup) or `npm run build` hit a real code
  error (TypeScript error, etc.). The old build is still running live,
  untouched. Read the error printed in the terminal, fix the code
  locally, push again, and re-run.
- **Fails at step 3 (PM2 restart)** — very rare; would mean PM2 itself
  had a problem on the server. The old process is usually still up in
  this case too. If the site does seem down after this, message Ayush.

There is no automatic rollback if a deploy *succeeds* but the new code
has a bug that only shows up in production — if that happens, the fix
is to correct the code and deploy again (or ask Ayush to revert the VPS
to a previous commit).

## Keeping the key safe

`ssb_deploy_key` grants full (root) access to the production server —
it is effectively a password. A few rules:

- **Never** upload it to GitHub, Slack public channels, or anywhere
  outside a private, direct share with someone who's supposed to have
  it.
- Keep it in the same folder as `deploy.bat` (the script looks for it
  right next to itself).
- If you ever think this file leaked (wrong channel, stolen laptop,
  etc.), tell Ayush immediately so the key can be revoked on the server
  and a new one issued.

## Requirements on your machine

- **Git** installed and on your PATH (you already need this to work on
  the repo at all).
- **OpenSSH client** — comes bundled with Git for Windows, so if `git`
  works from your terminal, `ssh` almost certainly does too. Nothing
  extra to install in that case.

## Questions

If a step fails and the message doesn't make sense, or the site looks
wrong after a deploy, message Ayush with a screenshot of the `deploy.bat`
output — that's the first thing needed to debug it.
