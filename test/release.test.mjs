import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import release from '../scripts/github-release.cjs';

/**
 * @param {import('node:test').TestContext} t
 * @param {{ exists?: boolean, draft?: boolean, asset?: boolean, starter?: boolean, failUpload?: boolean, lookupStatus?: number, target?: string }} [options]
 */
function setup(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'tasty-release-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(
    join(directory, 'package.json'),
    JSON.stringify({ name: 'tasty-syntax-highlighting', version: '4.1.0' }),
  );
  writeFileSync(
    join(directory, 'tasty-syntax-highlighting-4.1.0.vsix'),
    'build',
  );
  /** @type {string[]} */
  const events = [];
  let exists = options.exists ?? false;
  let asset = options.asset ?? false;
  let failUpload = options.failUpload ?? false;
  let starter = options.starter ?? false;
  const state = {
    id: 7,
    tag_name: 'v4.1.0',
    target_commitish: options.target ?? 'tested-commit',
    draft: options.draft ?? true,
    html_url:
      'https://github.com/tenphi/tasty-vscode-extension/releases/tag/v4.1.0',
  };
  /** @type {Parameters<typeof release>[0]} */
  const dependencies = {
    context: {
      repo: { owner: 'tenphi', repo: 'tasty-vscode-extension' },
      sha: 'tested-commit',
    },
    core: { info: () => {} },
    github: {
      rest: {
        repos: {
          getReleaseByTag: async (params) => {
            assert.equal(params.tag, 'v4.1.0');
            events.push('lookup');
            if (options.lookupStatus)
              throw Object.assign(new Error('lookup failed'), {
                status: options.lookupStatus,
              });
            if (!exists || state.draft)
              throw Object.assign(new Error('missing'), { status: 404 });
            return { data: state };
          },
          createRelease: async (params) => {
            assert.equal(params.target_commitish, 'tested-commit');
            assert.equal(params.draft, true);
            events.push('create draft');
            exists = true;
            return { data: state };
          },
          listReleaseAssets: 'list-assets',
          listReleases: 'list-releases',
          deleteReleaseAsset: async (params) => {
            assert.equal(params.asset_id, 9);
            events.push('delete starter');
            starter = false;
          },
          uploadReleaseAsset: async (params) => {
            assert.equal(params.name, 'tasty-syntax-highlighting-4.1.0.vsix');
            assert.equal(params.data.toString(), 'build');
            assert.equal(
              params.headers['content-type'],
              'application/octet-stream',
            );
            events.push('upload');
            if (failUpload) {
              failUpload = false;
              throw new Error('upload interrupted');
            }
            asset = true;
          },
          updateRelease: async (params) => {
            assert.equal(asset, true, 'publish only after a successful upload');
            assert.equal(params.draft, false);
            events.push('publish');
            state.draft = false;
            return { data: state };
          },
        },
      },
      paginate: async (method) => {
        if (method === 'list-releases') {
          events.push('find draft');
          return exists ? [state] : [];
        }
        return asset || starter
          ? [
              {
                id: 9,
                name: 'tasty-syntax-highlighting-4.1.0.vsix',
                state: starter ? 'starter' : 'uploaded',
              },
            ]
          : [];
      },
    },
  };
  return { directory, dependencies, events, state };
}

test('create a release at the tested commit, upload, then publish', async (t) => {
  const fixture = setup(t);
  await release(fixture.dependencies, fixture.directory);
  assert.deepEqual(fixture.events, [
    'lookup',
    'find draft',
    'create draft',
    'upload',
    'publish',
  ]);
});
test('resume a failed asset upload on the same draft', async (t) => {
  const fixture = setup(t, { failUpload: true });
  await assert.rejects(
    release(fixture.dependencies, fixture.directory),
    /interrupted/,
  );
  assert.equal(fixture.state.draft, true);
  await release(fixture.dependencies, fixture.directory);
  assert.deepEqual(fixture.events, [
    'lookup',
    'find draft',
    'create draft',
    'upload',
    'lookup',
    'find draft',
    'upload',
    'publish',
  ]);
});
test('repair a published release with a missing asset', async (t) => {
  const fixture = setup(t, { exists: true, draft: false });
  await release(fixture.dependencies, fixture.directory);
  assert.deepEqual(fixture.events, ['lookup', 'upload']);
});
test('an already complete release is unchanged', async (t) => {
  const fixture = setup(t, { exists: true, draft: false, asset: true });
  await release(fixture.dependencies, fixture.directory);
  assert.deepEqual(fixture.events, ['lookup']);
});
test('publish a draft whose asset is already uploaded', async (t) => {
  const fixture = setup(t, { exists: true, asset: true });
  await release(fixture.dependencies, fixture.directory);
  assert.deepEqual(fixture.events, ['lookup', 'find draft', 'publish']);
});
test('replace the starter asset left by an interrupted GitHub upload', async (t) => {
  const fixture = setup(t, { exists: true, starter: true });
  await release(fixture.dependencies, fixture.directory);
  assert.deepEqual(fixture.events, [
    'lookup',
    'find draft',
    'delete starter',
    'upload',
    'publish',
  ]);
});
test('do not publish a draft using a build from a different commit', async (t) => {
  const fixture = setup(t, { exists: true, target: 'another-commit' });
  await assert.rejects(
    release(fixture.dependencies, fixture.directory),
    /original workflow/,
  );
  assert.deepEqual(fixture.events, ['lookup', 'find draft']);
});
test('do not create a release when the exact build is missing', async (t) => {
  const fixture = setup(t);
  rmSync(join(fixture.directory, 'tasty-syntax-highlighting-4.1.0.vsix'));
  await assert.rejects(
    release(fixture.dependencies, fixture.directory),
    /ENOENT/,
  );
  assert.deepEqual(fixture.events, []);
});
test('permission errors do not trigger release creation', async (t) => {
  const fixture = setup(t, { lookupStatus: 403 });
  await assert.rejects(
    release(fixture.dependencies, fixture.directory),
    /lookup failed/,
  );
  assert.deepEqual(fixture.events, ['lookup']);
});
