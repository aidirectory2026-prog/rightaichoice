<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:concurrency-rules -->
# Multiple sessions run in this repo at once — git protocol (MANDATORY)

Two+ Claude sessions work here simultaneously (e.g. feature work **and** the SEO
niche-page batch). They share one working tree, so a careless commit in one
session silently swallows another's uncommitted edits, and both pushing to
`main` interleaves/clobbers. Follow this EXACTLY:

1. **Stage only your own explicit paths.** `git add path/a path/b` — the full
   paths you personally edited. **NEVER `git add -A`, `git add .`, `git add -u`,
   or `git commit -a`.** Another session almost certainly has unrelated changes
   in the tree; a broad add captures them into your commit.
2. **Commit the instant a unit is done.** Never leave files staged across tool
   calls — that staged window is exactly when another session's add grabs them.
3. **Rebase right before every push:** `git pull --rebase origin main` then
   `git push`. If the push is rejected, rebase again — never `push --force` to a
   shared branch.
4. **Large or long-running streams MUST use a dedicated worktree + branch**, not
   the shared `main` tree. The SEO/niche stream already has one:
   `../rac-seo-docs` on `phase9-niche-pages` — that work belongs THERE, committed
   to that branch, **not to `main` in this directory.** To start a new isolated
   stream: `git worktree add ../rac-<stream> -b <stream>`; commit there; push the
   branch; integrate to `main` with a **server-side PR merge** (`gh pr merge
   --squash`) so the shared `main` tree is never the merge surface.
5. **Never edit or commit inside another session's worktree.** Check
   `git worktree list` if unsure which tree is yours.

Goal: each session commits only its own files, on its own branch/tree, and
integrates cleanly. `main` is for integrating finished work, not a scratch pad
two sessions scribble on at the same time.
<!-- END:concurrency-rules -->
