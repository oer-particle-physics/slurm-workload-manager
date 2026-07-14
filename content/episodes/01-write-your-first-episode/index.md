+++
title = "Write your first episode"
weight = 10
teaching = 10
exercises = 10
questions = ["How do I turn this sample into the first episode of my own lesson?"]
objectives = ["Identify the episode metadata and body content to replace.", "Use teaching and audience components in an episode.", "Create and order the next episode."]
keypoints = ["Each episode is a page bundle under `content/episodes`.", "Front matter drives navigation, timing, objectives, and generated lesson resources.", "Create new episodes from the shared archetype and give each one a unique weight."]
+++

This page is both a short introduction and an example to replace. It is written for a
{{< profile new-lesson-author >}} preparing their first {{< glossary episode >}}.

{{< lesson/image
  src="authoring-flow.svg"
  alt="A three-step authoring loop: edit the episode, preview the site, then add the next episode."
  width="720"
  class="hx:rounded-xl"
>}}

## Edit the front matter

The block at the top of this file describes the episode. Replace its `title`, `questions`,
`objectives`, and `keypoints`. Keep `weight` as a unique integer; Hugo uses it to order
episodes. The optional `teaching` and `exercises` values are minutes.

The shared [Front Matter](https://oer-particle-physics.github.io/hugo-styles/docs/frontmatter/)
page documents every field and includes copyable examples.

{{< challenge title="Outline one episode" >}}
Choose a topic from your lesson. Write one question learners should be able to answer,
one objective beginning with an action verb, and one key point they should remember.

{{< hint >}}
Keep the scope small enough to teach and practise in a single episode.
{{< /hint >}}

{{< solution >}}
For an episode about batch jobs, an outline could ask, “How can I tell whether a job
completed successfully?”, use “Interpret a job's exit status” as the objective, and
finish with “A zero exit status normally indicates success.”
{{< /solution >}}
{{< /challenge >}}

## Replace the sample body

Write the main explanation in Markdown. Use teaching components where they clarify the
learning flow rather than decorating ordinary prose. This page demonstrates a challenge,
hint, solution, image, and the audience-specific blocks below. The shared
[Components](https://oer-particle-physics.github.io/hugo-styles/docs/components/) page is
the full reference.

{{< learner >}}
When adapting this file, keep the instructions a learner must follow in the main text or
in a learner block like this one.
{{< /learner >}}

{{< instructor >}}
Use instructor blocks for pacing, expected difficulties, and debrief prompts that should
appear only in instructor view.
{{< /instructor >}}

## Preview the result

Run the local server from the repository root:

```bash
hugo server
```

Open the episode, switch between learner and instructor views, and check its challenge,
solution, links, and image.

## Create your next episode

{{< callout type="checklist" title="Continue building your lesson" >}}
Create a second page bundle from the shared episode archetype:

```bash
hugo new content --kind episode episodes/02-next-topic/index.md
```

Open the generated file, set `weight = 20`, and replace its placeholder questions,
objectives, and key points. Filenames help authors scan the repository, but only `weight`
controls episode order.
{{< /callout >}}
