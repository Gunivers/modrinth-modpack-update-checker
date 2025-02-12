# Modrinth's Modpack Update Checker

A GitHub action that checks if a modpack can be upgraded to a new Minecraft version.
This action may be used with [Modrinth's Modpack Updater Printer](https://github.com/Gunivers/modrinth-modpack-updater-printer) to automatically create and update an issue to track modpack's mods compatibility with the next Minecraft version.

## Usage

```yaml
name: 'Modrinth Modpack Update Checker'

on:
  schedule:
    - cron: '0 * * * *' # Every hours
  workflow_dispatch: # Allow running the workflow manually

jobs:
  check-updates:
    runs-on: ubuntu-latest
    steps:
      - name: 'Check Modrinth Modpack updates'
        uses: Gunivers/modrinth-modpack-update-checker@v1.1.0
        id: check
        with:
          modrinth-modpack-slug: 'example-modpack'

      - name: Print if the modpack can be upgraded
        if: ${{ steps.check.outputs.can-upgrade == 'true' }}
        run: "echo \"The modpack can be upgraded to the new Minecraft version\""
```

## Inputs

| Input | Description | Required | Default | Supported since |
|-------|-------------|----------|---------|----------------|
| `modrinth-modpack-slug` | The slug of the modpack to check | true | | v1.0.0 |
| `modrinth-project-getter-url` | The API endpoint to get project information | false | `https://api.modrinth.com/v2/project/{}` | v1.0.0 |
| `modrinth-versions-getter-url` | The API endpoint to get versions of a modpack | false | `https://api.modrinth.com/v2/project/{}/version` | v1.0.0 |
| `modrinth-version-getter-url` | The API endpoint to get version information | false | `https://api.modrinth.com/v2/version/{}` | v1.0.0 |
| `skipped-versions` | Array of Minecraft version to skip in tests, separated by commas, example: `1.21.1, 1.21.2` | false | | v1.0.0 |

## Outputs

<!-- A table of outputs with their description -->

| Output | Description | Supported since |
|--------|-------------|----------------|
| `current-version` | The current version of the modpack | v1.0.0 |
| `is-up-to-date` | Whether the modpack is up to date | v1.1.0 |
| `searched-version` | The version of Minecraft that was checked | v1.0.0 |
| `supported` | The mods that are supported on the searched version, separated by commas | v1.0.0 |
| `unsupported` | The mods that are not supported on the searched version, separated by commas | v1.0.0 |
| `can-upgrade` | Whether the modpack can be upgraded to the searched version | v1.0.0 |
