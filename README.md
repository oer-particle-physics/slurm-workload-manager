# Hugo Styles Lesson Template

Use this repository to start a lesson powered by the shared
[`hugo-styles`](https://oer-particle-physics.github.io/hugo-styles/) module.
The rendered site contains a short example that is meant to be replaced.

## Create your lesson

1. **Preview the site.** Install [Hugo Extended](https://gohugo.io/installation/), then run:

   ```bash
   hugo server
   ```

2. **Configure the lesson.** Replace the example values in `hugo.toml`, including
   `baseURL`, `title`, `[params.lesson]`, and the GitHub menu URL. Then update
   `CITATION.cff` and `AUTHORS`. Edit `LICENSE.md` only if your licensing differs from
   the template.

3. **Replace the sample content.** Start with
   `content/episodes/01-write-your-first-episode/`, then adapt or remove the example
   setup, instructor notes, glossary, profile, and reference pages. The
   [Authoring Guide](https://oer-particle-physics.github.io/hugo-styles/docs/authoring/)
   explains the content structure.

4. **Publish the site.** Set `baseURL` to `https://<account>.github.io/<repo>/`, enable
   GitHub Pages with **GitHub Actions** as its source, and push `main`. See the
   [Deployment Guide](https://oer-particle-physics.github.io/hugo-styles/docs/deployment/)
   for details.

For field and component reference, use the shared [Front Matter](https://oer-particle-physics.github.io/hugo-styles/docs/frontmatter/) and [Components](https://oer-particle-physics.github.io/hugo-styles/docs/components/) pages.

## Receive Hugo Styles updates

The scheduled **Refresh vendored Hugo modules** workflow updates the pinned module, managed files, and `_vendor/`, then opens a pull request for review. Configure the `WORKFLOW_SYNC_TOKEN` repository secret as described in the [Update Guide](https://oer-particle-physics.github.io/hugo-styles/docs/updates/) so the workflow can update managed workflow files.

Keep `_vendor/` committed. It lets lesson authors build locally with Hugo Extended alone; Go is not required for normal authoring.
