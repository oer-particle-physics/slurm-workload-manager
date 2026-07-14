+++
title = "Setup"
weight = 10
+++

Install Hugo Extended before editing the lesson. The shared module is already available
in `_vendor/`, so normal authoring does not require Go.

{{< tabs >}}
{{< tab name="macOS" selected=true >}}
```bash
brew install hugo
```
{{< /tab >}}
{{< tab name="Linux" >}}
```bash
sudo apt install hugo
```
{{< /tab >}}
{{< tab name="Windows" >}}
```powershell
winget install Hugo.Hugo.Extended
```
{{< /tab >}}
{{< /tabs >}}

From the repository root, verify the installation and start the preview server:

```bash
hugo version
hugo server
```

The version output should include `extended`.

## Next step

Continue with [Write your first episode]({{< relref "/episodes/01-write-your-first-episode" >}}).
