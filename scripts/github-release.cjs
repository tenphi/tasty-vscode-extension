const { readFileSync } = require('node:fs');
const { join } = require('node:path');

/** @typedef {{ owner: string, repo: string }} Repo */
/** @typedef {{ id: number, tag_name: string, target_commitish: string, draft: boolean, html_url: string }} Release */
/** @typedef {{ id: number, name: string, state: string }} Asset */
/**
 * @typedef {object} GitHub
 * @property {{ repos: {
 *   getReleaseByTag(params: Repo & { tag: string }): Promise<{ data: Release }>,
 *   createRelease(params: Repo & { tag_name: string, target_commitish: string, name: string, draft: boolean, generate_release_notes: boolean }): Promise<{ data: Release }>,
 *   updateRelease(params: Repo & { release_id: number, draft: boolean }): Promise<{ data: Release }>,
 *   listReleases: unknown,
 *   listReleaseAssets: unknown,
 *   deleteReleaseAsset(params: Repo & { asset_id: number }): Promise<unknown>,
 *   uploadReleaseAsset(params: Repo & { release_id: number, name: string, data: Buffer, headers: { 'content-type': string } }): Promise<unknown>
 * } }} rest
 * @property {(method: unknown, params: Repo & { release_id?: number }) => Promise<unknown[]>} paginate
 */

/**
 * A failed upload leaves a draft that the next run completes; an existing
 * published release can gain a missing asset.
 * @param {{ github: GitHub, context: { repo: Repo, sha: string }, core: { info(message: string): void } }} dependencies
 * @param {string} [directory]
 */
module.exports = async function release(
  { github, context, core },
  directory = process.cwd(),
) {
  const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  const tag = `v${pkg.version}`;
  const name = `${pkg.name}-${pkg.version}.vsix`;
  // Read the exact expected build before creating a release or changing its state.
  const data = readFileSync(join(directory, name));
  const repo = context.repo;
  /** @type {Release | undefined} */
  let release;
  try {
    ({ data: release } = await github.rest.repos.getReleaseByTag({
      ...repo,
      tag,
    }));
  } catch (error) {
    if (
      !error ||
      typeof error !== 'object' ||
      !('status' in error) ||
      error.status !== 404
    ) {
      throw error;
    }
    // The tag endpoint only promises published releases. List releases also
    // returns drafts to this workflow's write-authorized token.
    const releases = /** @type {Release[]} */ (
      await github.paginate(github.rest.repos.listReleases, repo)
    );
    release = releases.find((candidate) => candidate.tag_name === tag);
    if (!release) {
      ({ data: release } = await github.rest.repos.createRelease({
        ...repo,
        tag_name: tag,
        target_commitish: context.sha,
        name: tag,
        draft: true,
        generate_release_notes: true,
      }));
    }
  }

  if (release.draft && release.target_commitish !== context.sha) {
    throw new Error(
      'Draft targets another commit; rerun its original workflow.',
    );
  }
  const assets = /** @type {Asset[]} */ (
    await github.paginate(github.rest.repos.listReleaseAssets, {
      ...repo,
      release_id: release.id,
    })
  );
  const asset = assets.find((candidate) => candidate.name === name);
  // An interrupted GitHub upload can leave a zero-byte "starter" asset.
  if (asset && asset.state !== 'uploaded') {
    await github.rest.repos.deleteReleaseAsset({ ...repo, asset_id: asset.id });
  }
  if (!asset || asset.state !== 'uploaded') {
    await github.rest.repos.uploadReleaseAsset({
      ...repo,
      release_id: release.id,
      name,
      data,
      headers: { 'content-type': 'application/octet-stream' },
    });
    core.info(`Uploaded ${name}`);
  }
  if (release.draft) {
    ({ data: release } = await github.rest.repos.updateRelease({
      ...repo,
      release_id: release.id,
      draft: false,
    }));
  }
  core.info(`GitHub release ready: ${release.html_url}`);
};
