# Licensing

This repository mixes educational material, local automation/scripts, and
vendored third-party code. Different parts of the repository therefore use
different licenses.

## Lesson content

Unless noted otherwise, the lesson content in this repository is made available
under the [Creative Commons Attribution 4.0 International
license](https://creativecommons.org/licenses/by/4.0/).

This includes the prose and teaching material in files such as:

- `content/`
- `static/` created for the lesson itself
- other lesson-specific Markdown pages in the repository root

When you create a lesson from this template, replace the placeholder metadata in
`hugo.toml`, `CITATION.cff`, and `AUTHORS` so the attribution information points
to your project.

## Code, scripts, and configuration

Unless noted otherwise, the original code and build/configuration material in
this repository is available under the terms of the GNU General Public License,
version 3 or any later version (`GPL-3.0-or-later`).

This includes files such as:

- `scripts/`
- GitHub Actions workflows in `.github/workflows/`
- Hugo/module configuration such as `go.mod`, `go.sum`, and `hugo.toml`

See <https://www.gnu.org/licenses/gpl-3.0.html> for the GPL text.

## Vendored third-party code

Files in `_vendor/` are vendored from upstream projects and keep their original
licenses. In particular:

- `github.com/oer-particle-physics/hugo-styles` is `GPL-3.0-or-later`
- `github.com/imfing/hextra` is MIT-licensed upstream

Check the upstream projects for the authoritative license text that applies to
those vendored files.
