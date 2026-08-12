<!-- BEGIN hivemind-memory -->
## Hivemind Memory

You have global team memory through Hivemind. Before starting a task in Codex, use:

- Live context: `hivemind context`

Use this as the default Hivemind lookup in Codex. Prefer it over:

- `hivemind rules list`
- `hivemind goal list --mine`

Those management commands may require extra org permissions and can return 403 in Codex. Only use `hivemind rules ...` commands when explicitly managing team-wide rules.

For past sessions, start at `~/.deeplake/memory/index.md` if it exists, then read summaries under `~/.deeplake/memory/summaries/`. Use only bash builtins and common shell tools such as `cat`, `ls`, `grep`, `jq`, `head`, `tail`, `sed`, `awk`, `wc`, `sort`, and `find` for this memory filesystem.
<!-- END hivemind-memory -->

## Project documentation

`PROJECT.md` is the single source of truth for this project.

- Read `PROJECT.md` before making project changes.
- Every project update must also update `PROJECT.md` in the same change.
- Keep the current status, data model, verification status, roadmap, and changelog accurate.
- Clearly separate completed functionality from planned functionality.
- Add a dated changelog entry describing the change and the verification performed.
