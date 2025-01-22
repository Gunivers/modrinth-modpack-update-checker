# Modrinth's Modpack Update Checker

A GitHub action that checks if a modpack can be upgraded to a new Minecraft version.

## Usage

```yaml
name: 'Modrinth Modpack Update Checker'

on:
  schedule:
    - cron: '*/60 * * * *' # Every hours
  workflow_dispatch: # Allow running the workflow manually

jobs:
  check-updates:
    runs-on: ubuntu-latest
    steps:
      - name: 'Check Modrinth Modpack updates'
        uses: Gunivers/modrinth-modpack-update-checker@v1
        id: check
        with:
          modrinth-modpack-slug: 'example-modpack'

      - name: Print if the modpack can be upgraded
        if: ${{ steps.check.outputs.can-upgrade == 'true' }}
        run: "echo \"The modpack can be upgraded to the new Minecraft version\""
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `modrinth-modpack-slug` | The slug of the modpack to check | true | |
| `modrinth-project-getter-url` | The API endpoint to get project information | false | `https://api.modrinth.com/v2/project/{}` |
| `modrinth-versions-getter-url` | The API endpoint to get versions of a modpack | false | `https://api.modrinth.com/v2/project/{}/version` |
| `modrinth-version-getter-url` | The API endpoint to get version information | false | `https://api.modrinth.com/v2/version/{}` |
| `skipped-versions` | Array of Minecraft version to skip in tests, separated by commas, example: `1.21.1, 1.21.2` | false | |

## Outputs

<!-- A table of outputs with their description -->

| Output | Description |
|--------|-------------|
| `current-version` | The current version of the modpack |
| `searched-version` | The version of Minecraft that was checked |
| `supported` | The mods that are supported on the searched version, separated by commas |
| `unsupported` | The mods that are not supported on the searched version, separated by commas |
| `can-upgrade` | Whether the modpack can be upgraded to the searched version |

