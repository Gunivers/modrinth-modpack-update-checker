import * as core from "@actions/core"
import fs from "fs"
import * as cache from "@actions/cache"

const modrinthModpackSlug: string = core.getInput("modrinth-modpack-slug") || "map-making-modpack"
const modrinthVersionsGetterUrl: string = core.getInput("modrinth-versions-getter-url") || "https://api.modrinth.com/v2/project/{}/version"
const modrinthVersionGetterUrl: string = core.getInput("modrinth-version-getter-url") || "https://api.modrinth.com/v2/version/{}"
const skippedVersions: string[] = core.getInput("skipped-versions").replace(/\s/g, "").split(",") || []
const modrinthProjectGetterUrl: string = core.getInput("modrinth-project-getter-url") || "https://api.modrinth.com/v2/project/{}"

const minecraftVersionUrlGetter = "https://raw.githubusercontent.com/PixiGeko/Minecraft-generated-data/refs/heads/master/index.json"
const modrinthModpackUrl = modrinthVersionsGetterUrl.replace("{}", modrinthModpackSlug)

const maximumQueriesPerMinute = 280
let queries = 0

type ModpackVersionMetadata = {
    gameVersion: string,
    versionId: string,
    versionType: string,
}

type VersionDetails = {
    dependencies: {
        project_id: string,
    }[]
}

type ModModrinthPayload = {
    game_versions: string[],
    title: string
}

type MinecraftVersionIndex = {
    versions: {
        [key: string]: {
            id: string
            type: "snapshots" | "releases"
        }
    }
}

main();

async function main() {
    const latestModpackVersionMetadata = await getLatestModpackGameVersion()
    const versionDetails = latestModpackVersionMetadata ? await getModpackVersionInfo(latestModpackVersionMetadata.versionId) : undefined
    if(versionDetails && latestModpackVersionMetadata) {
        const nextMinecraftVersion = await getNextMinecraftVersion(latestModpackVersionMetadata.gameVersion)
        if(nextMinecraftVersion) {
            const newVersionMetadata = await getModpackVersionInfo(latestModpackVersionMetadata.versionId)
            if(newVersionMetadata) {
                core.info(`New Minecraft version found: ${nextMinecraftVersion}`)
                const supported: string[] = [] 
                const unsupported: string[] = []
                for(const dependency of versionDetails.dependencies) {
                    if(queries >= maximumQueriesPerMinute) {
                        await new Promise(resolve => setTimeout(resolve, 60000))
                        queries = 0
                    }
                    if(dependency.project_id) { // The dependencies not comming from the Modrinth are not supported
                        const modSupport = await checkDependencyVersion(dependency.project_id, nextMinecraftVersion)
                        if(modSupport && modSupport.support) {
                            supported.push(modSupport.name)
                        } else if(modSupport) {
                            unsupported.push(modSupport.name)
                        }
                    }
                }
                core.setOutput("current-version", latestModpackVersionMetadata.gameVersion)
                core.setOutput("searched-version", nextMinecraftVersion)
                core.setOutput("supported", supported.join(","))
                core.setOutput("unsupported", unsupported.join(","))
                core.setOutput("can-upgrade", unsupported.length === 0 ? "true" : "false")
                core.setOutput("is-up-to-date", "false")
            } else {
                core.info("No new Minecraft version found")
            }
        } else {
            core.setOutput("is-up-to-date", "true")
        }
    }
}

/**
 * Get the latest version of the modpack
 */
async function getLatestModpackGameVersion(): Promise<ModpackVersionMetadata | undefined> {
    const response = await fetch(modrinthModpackUrl)
    queries++
    if(!response.ok) {
        core.setFailed("Failed to fetch modpack versions")
        return undefined
    }
    const modrinthModpack: any = await response.json()
    const latestVersion = modrinthModpack[0]
    return latestVersion ? {
        gameVersion: latestVersion?.game_versions[0],
        versionId: latestVersion?.id,
        versionType: latestVersion?.version_type,
    } : undefined
}

/**
 * Get the version information of the modpack
 * @param versionId The id of the version to get information for
 * @returns The version information
 */
async function getModpackVersionInfo(versionId: string): Promise<VersionDetails | undefined> {
    const cacheKey = `modrinth-modpack-version-${versionId}`
    const cachePath = `./.cache/${cacheKey}.json`

    return await getCached(cacheKey, cachePath, modrinthVersionGetterUrl.replace("{}", versionId))
}

/**
 * Get the cached data from the cache or fetch it from the url
 * @param cacheKey The key to use for the cache
 * @param cachePath The path to the cache file
 * @param url The url to fetch the data from
 * @returns The cached data or the data from the url
 */
async function getCached<T>(cacheKey: string, cachePath: string, url: string): Promise<T | undefined> {
    await cache.restoreCache(["./.cache/*.json"], cacheKey, [cacheKey])
    if(!fs.existsSync(cachePath)) {
        const response = await fetch(url)
        queries++
        if(!response.ok) {
            core.setFailed("Failed to fetch " + url)
            return undefined
        }
        const result: any = await response.json()
        if (!fs.existsSync("./.cache")){
            fs.mkdirSync("./.cache")
        }
        fs.writeFileSync(cachePath, JSON.stringify(result))
        await cache.saveCache(["./.cache/*.json"], cacheKey)
        return result
    }
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"))
}

/**
 * Get the next Minecraft version that is not skipped
 * @param minecraftVersion The current Minecraft version
 * @returns The next Minecraft version, null if no version is found or undefined if the request failed
 */
async function getNextMinecraftVersion(minecraftVersion: string): Promise<string | null | undefined> {
    const response = await fetch(minecraftVersionUrlGetter)
    queries++
    if(!response.ok) {
        core.setFailed("Failed to fetch minecraft versions")
        return undefined
    }
    const minecraftVersions: MinecraftVersionIndex = await response.json() as MinecraftVersionIndex
    return Object.entries(minecraftVersions.versions)
        .filter(([version, details]) => details.type === "releases" && version > minecraftVersion && !skippedVersions.includes(version))?.[0]?.[1]?.id ?? null
}

/**
 * Check if a mod is supported on the next Minecraft version
 * @param projectId The id of the mod to check
 * @param nextMinecraftVersion The next Minecraft version to check
 * @returns The mod details or undefined if the request failed
 */
async function checkDependencyVersion(projectId: string, nextMinecraftVersion: string): Promise<{ name: string, support: boolean } | undefined> {
    const url = modrinthProjectGetterUrl.replace("{}", projectId)
    const response = await fetch(url)
    queries++
    if(!response.ok) {
        core.setFailed("Failed to fetch dependency versions: " + url)
        return undefined
    }
    const modrinthModDetails: ModModrinthPayload = await response.json() as ModModrinthPayload
    const support = modrinthModDetails.game_versions.includes(nextMinecraftVersion)
    return {
        name: modrinthModDetails.title,
        support
    }
}