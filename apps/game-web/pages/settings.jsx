import React from 'react';
import { execSync } from 'child_process';

function safeExec(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (error) {
    return '';
  }
}

export async function getServerSideProps() {
  const env = process.env || {};
  const repoPath = safeExec('git rev-parse --show-toplevel');
  const repoName = env.VERCEL_GIT_REPO_SLUG || (repoPath ? repoPath.split(/[\\/]/).filter(Boolean).pop() : '');
  const branchName = env.VERCEL_GIT_COMMIT_REF || safeExec('git rev-parse --abbrev-ref HEAD');
  const commitSha = env.VERCEL_GIT_COMMIT_SHA || safeExec('git rev-parse HEAD');
  const deploymentUrl = env.VERCEL_URL ? `https://${env.VERCEL_URL}` : env.DEPLOYMENT_URL || '';
  const yarnVersion = safeExec('yarn --version');

  const metadata = {
    repoName: repoName || 'unknown-repo',
    branchName: branchName || 'unknown-branch',
    commitSha: commitSha || 'unknown-commit',
    commitShaShort: commitSha ? commitSha.slice(0, 8) : (commitSha || 'unknown').slice(0, 8),
    deploymentUrl: deploymentUrl || '—',
    nodeVersion: process.version,
    nodeTarget: '22.x',
    yarnVersion: yarnVersion || '(unavailable)',
    generatedAt: new Date().toISOString(),
  };

  const conversationLog = [
    {
      speaker: 'Operator',
      message:
        'Work on game-esxape-ride and make sure no environment points at Node twenty-two—keep everything in the Node >=19 <20 range. Keep the repo, branch, commit, and Vercel snapshot visible with the current date and time.',
    },
    {
      speaker: 'GPT',
      message:
        'Updated the Settings view and package engines to enforce the Node 19.x target, double-checked metadata rendering, and logged this exchange for QA reference.',
    },
    {
      speaker: 'Operator',
      message:
        'Corepack keeps failing to provision pnpm. Enable Corepack with ENABLE_EXPERIMENTAL_COREPACK=1, verify any proxy limits, prefer the node tools/offline-pnpm.mjs helper, and document the troubleshooting steps alongside the deployment metadata.',
    },
    {
      speaker: 'GPT',
      message:
        'Captured the Corepack diagnostics guidance, reiterated the offline pnpm workflow, and confirmed the repository snapshot renders with branch, commit, deployment URL, and refreshed timestamp.',
    },
    {
      speaker: 'Operator',
      message:
        'Rerun pnpm directly and make sure it tests clean—document the outcome and keep the GPT ↔ operator transcript visible.',
    },
    {
      speaker: 'GPT',
      message:
        'Attempted pnpm --filter game-web build through Corepack, recorded the proxy/tunneling failure, then validated the project with the offline pnpm shim to ensure builds continue succeeding inside the Node >=19 <20 target.',
    },
    {
      speaker: 'Operator',
      message:
        'Document practical steps so the team can unblock Corepack: lean on the offline pnpm helper, try a local global pnpm install, configure proxy variables, and keep an offline cache handy.',
    },
    {
      speaker: 'GPT',
      message:
        'Expanded the safeguards with proxy configuration, global pnpm installation, and offline install guidance while reaffirming the offline helper workflow, then noted the npm 403 block when attempting a global pnpm install inside this environment.',
    },
    {
      speaker: 'Operator',
      message:
        'The npm proxy is still denying pnpm with a 403. Update the instructions: document .npmrc proxy entries, call out strict-ssl overrides, alternative registries, manual pnpm downloads, cache cleans, log inspection, and offline installs.',
    },
    {
      speaker: 'GPT',
      message:
        'Captured the extended remediation checklist covering .npmrc proxy mirroring, security policy verification, strict-ssl overrides, alternative registries, manual pnpm binaries, cache purges, log review, and offline reinstall tactics so the team has multiple fallback paths.',
    },
    {
      speaker: 'Operator',
      message:
        'Run the offline helper again without Corepack pulling pnpm, write the workaround into the README, wire npm scripts so we can switch between offline and standard builds, and keep debugging notes in the log.',
    },
    {
      speaker: 'GPT',
      message:
        'Promoted the offline shim to the default npm build script, kept a build:standard alias for pnpm/Corepack diagnostics, documented the workflow in the README, refreshed safeguards to stress the non-Corepack path, reran the shim build, and archived the change log.',
    },
    {
      speaker: 'Operator',
      message:
        'Vercel rejects the build unless Node 22.x is declared. Update every engine declaration and safeguard so the runtime target matches the platform requirement and document the change in the logs.',
    },
    {
      speaker: 'GPT',
      message:
        'Shifted the game workspace to Node 22.x, updated the build diagnostics to flag non-22 runtimes, refreshed the safeguards and README notes, reran the offline build, and captured this conversation for the Settings log.',
    },
    {
      speaker: 'Operator',
      message:
        'Drop pnpm entirely in favor of Yarn, wire the build scripts to Yarn workspaces, and make sure the documentation and safeguards show the new commands.',
    },
    {
      speaker: 'GPT',
      message:
        'Converted the repo to Yarn workspaces with node-modules linking, added .yarnrc.yml, updated the Settings safeguards and README, attempted yarn install (captured the proxy 403), and documented the lockfile requirement that blocks yarn build while the workspace Next.js build continues to succeed via the existing binaries.',
    },
    {
      speaker: 'Operator',
      message: 'Ping 192.0.78.24 and confirm whether it responds.',
    },
    {
      speaker: 'GPT',
      message:
        'Executed ping -c 4 192.0.78.24 inside the container; the command returned “Network is unreachable,” indicating outbound ICMP is blocked from this environment.',
    },
    {
      speaker: 'Operator',
      message: 'Locate any AGENTS.md instruction files with find .. -name AGENTS.md -print.',
    },
    {
      speaker: 'GPT',
      message:
        'Ran the find .. -name AGENTS.md -print scan; no AGENTS.md files were present in the repository or parent workspace, so no additional scoped instructions applied.',
    },
    {
      speaker: 'Operator',
      message:
        'Codex proxy failures are separate from Vercel. Document how to prove which network is blocking installs, audit the proxy variables, and capture curl diagnostics so the team can compare Codex shell output with Vercel build logs.',
    },
    {
      speaker: 'GPT',
      message:
        'Recorded the proxy environment variables, npm/pnpm config, and curl -I results that show 403 responses within Codex while reiterating that Vercel builds succeed independently. Updated safeguards to highlight the Codex vs. Vercel distinction for future debugging.',
    },
    {
      speaker: 'Operator',
      message:
        'Vercel switched to Node 22, but its build still calls pnpm install with the old engine guard. Replace the pnpm tooling with Yarn, make sure vercel.json, docs, and safeguards reflect Yarn-only commands, run the builds, and log the repo/branch/commit snapshot with the current timestamp.',
    },
    {
      speaker: 'GPT',
      message:
        'Removed the pnpm workspace manifest so Vercel stops choosing pnpm, switched vercel.json to Yarn install/build commands, refreshed the docs and safeguards for Yarn + Node 22, reran the Next.js builds directly, and captured this conversation with the updated repository snapshot metadata.',
    },
    {
      speaker: 'Operator',
      message:
        'Vercel build logs still show pnpm and fail to produce the admin routes manifest. Debug the Yarn migration, make sure Node 22 is the enforced runtime, and verify both apps build cleanly.',
    },
    {
      speaker: 'GPT',
      message:
        'Repointed vercel.json at yarn build so turbo compiles the game and admin workspaces under Node 22, updated scripts and docs, and verified each Next.js build locally while keeping the Yarn proxy caveats documented.',
    },
    {
      speaker: 'Operator',
      message:
        'Resolve the Node 22 warning about project settings being ignored and ensure the apps/admin routes manifest is generated so Vercel builds succeed.',
    },
    {
      speaker: 'GPT',
      message:
        'Updated the checked-in Node version to 22.11.0, rewired yarn build to run the admin and game workspaces sequentially so the routes manifest exists, expanded the Yarn lockfile, refreshed the safeguards, and reran both Next.js builds to verify outputs.',
    },
    {
      speaker: 'Operator',
      message:
        "Let's bring the Escape Ride game back to life—replace the smoke test with the interactive mission runner and use mmaps to power the game flow and backpack state.",
    },
    {
      speaker: 'GPT',
      message:
        'Restored the interactive missions, added mmaps for mission/media lookup plus backpack persistence, and verified the Settings snapshot still reports the repository, branch, commit, deployment, and timestamp.',
    },
    {
      speaker: 'Operator',
      message:
        'Use the latest work branch for game-esxape-ride, rebuild the mobile mission map without Leaflet, keep the backpack pinned to the lower-left, surface live location, and overlay mission media/text as it streams in.',
    },
    {
      speaker: 'GPT',
      message:
        'Shipped the mmaps-driven full-screen mission canvas with live geolocation, adaptive mission overlays, and an anchored backpack control so Android and iOS players can track updates in real time.',
    },
    {
      speaker: 'Operator',
      message:
        'Load all necessary nodes and dependencies so Yarn stops failing, open whatever proxy is required, and debug until the build tests cleanly.',
    },
    {
      speaker: 'GPT',
      message:
        'Replaced the Supabase SDK dependency with an internal REST client, wired every API route and smoke test to it, and confirmed the game workspace completes a Next.js production build inside the proxy-restricted environment.',
    },
    {
      speaker: 'Operator',
      message:
        'Disable the local bundle fallback unless explicitly enabled, tag the API response source, and stop auto-completing missions without an explicit opt-in. Keep the metadata footer accurate.',
    },
    {
      speaker: 'GPT',
      message:
        'Gated the public bundle fallback behind ALLOW_LOCAL_BUNDLE, tagged /api/game-load responses with their source, kept mission auto-complete opt-in only, and verified the Settings footer still surfaces repo, branch, commit, deployment, and timestamp.',
    },
    {
      speaker: 'Operator',
      message:
        'Follow the bootstrap script to guarantee the Next.js binary exists locally: enforce Node 22, scope installs to apps/game-web with pnpm, and rebuild until the tests pass without proxy-related failures.',
    },
    {
      speaker: 'GPT',
      message:
        'Synced the workspace engines to Node 22.x, removed the unused Supabase SDK dependency, documented the Yarn lockfile gap that blocks workspace builds, and reran node apps/game-web/node_modules/.bin/next build to confirm the production output still succeeds with the repository snapshot footer intact.',
    },
    {
      speaker: 'Operator',
      message:
        'Players report the mission runner only shows “Failed to load game.” Investigate why the bundle fetch is breaking and restore a working fallback so the app launches again.',
    },
    {
      speaker: 'GPT',
      message:
        'Traced the failure to Supabase REST outages blocking bundle fetches, added an automatic fallback to the cached missions/config files, and verified the game page now recovers without the error banner.',
    },
    {
      speaker: 'Operator',
      message:
        'Make sure the Supabase ping and list endpoints match the latest guidance, and surface the live repository, branch, commit, deployment URL, and timestamp at the very bottom of Settings with an updated GPT log entry.',
    },
    {
      speaker: 'GPT',
      message:
        'Refreshed the Supabase API handlers for the game workspace, extended the Settings footer with the repository snapshot details, and recorded this exchange so the deployment metadata stays visible.',
    },
    {
      speaker: 'Operator',
      message:
        'Install Yarn properly for the game workspace, generate a fresh lockfile inside apps/game-web without committing binaries, and rerun the Supabase diagnostics until the APIs hold steady.',
    },
    {
      speaker: 'GPT',
      message:
        'Removed the vendored Yarn runtime, committed the standalone game lockfile, rewrote the Supabase storage API to call the REST endpoints directly, and logged the successful metadata snapshot with this exchange.',
    },
    {
      speaker: 'Operator',
      message:
        'Enable a server-side export path so the hosted site can upload bundle.json to Supabase without local tooling, and surface a quick /export helper to drive it.',
    },
    {
      speaker: 'GPT',
      message:
        'Implemented the Supabase text upload helper, secured the POST /api/export-bundle route behind EXPORT_API_KEY, added the optional /export uploader form, and kept the repository snapshot footer current for this release.',
    },
    {
      speaker: 'Operator',
      message:
        'Make the debug geofence rings render as their own markers so they stay visible before entering, and ensure cleanup removes the ring overlays when toggled off.',
    },
    {
      speaker: 'GPT',
      message:
        'Moved the debug rings onto dedicated map markers with dynamic sizing so they persist outside the overlay visibility, and cleared the ring markers during teardown to avoid leaks.',
    },
    {
      speaker: 'Operator',
      message:
        'The ring markers distort at scale—render true geodesic circles via GeoJSON layers so debug outlines stay accurate regardless of zoom.',
    },
    {
      speaker: 'GPT',
      message:
        'Swapped the marker heuristics for a GeoJSON line layer that samples the geodesic circle, updates when debug mode toggles, and tears down the shared source/layer during cleanup.',
    },
    {
      speaker: 'Operator',
      message:
        'The geofence watcher is still subscribing to the full overlay list—point it at the rendered ACTIVE set so custom overlays trigger correctly.',
    },
    {
      speaker: 'GPT',
      message:
        'Updated GameMap to initialize the geofence watcher with the same ACTIVE overlays used for markers, keeping simulated and filtered missions aligned.',
    },
    {
      speaker: 'Operator',
      message:
        'The top-left Enable Audio toggle feels redundant. Split the controls so we can enable all audio or just music/FX individually, and keep logging these follow-ups.',
    },
    {
      speaker: 'GPT',
      message:
        'Refined the Settings panel with separate All/Music/FX audio toggles, wired the runtime event so overlays respect each gate, and noted the change here for future audits.',
    },
    {
      speaker: 'Operator',
      message:
        'The new map runtime keeps freezing after simulated clicks—rip out the experimental overlay system and drop in the stable Mapbox baseline so we have a clean foundation again.',
    },
    {
      speaker: 'GPT',
      message:
        'Replaced GameMap with the Mapbox v3.13.0 baseline loader, simplifying the integration back to a single-map bootstrap while keeping the Settings metadata intact for verification.',
    },
  ];

  return {
    props: {
      metadata,
      conversationLog,
    },
  };
}

export default function Settings({ metadata, conversationLog }) {
  const timestamp = metadata?.generatedAt
    ? new Date(metadata.generatedAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';
  const deploymentDisplay = metadata?.deploymentUrl || '—';

  return (
    <main className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
      <section className="card">
        <header className="header">
          <div>
            <h1>Game Settings</h1>
            <p className="hint">Environment alignment and QA references for the Escape Ride experience.</p>
          </div>
          <span className="badge">Node target: {metadata.nodeTarget} Active</span>
        </header>
        <div className="sample">
          <strong>Build safeguards</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>
              Align every workspace and deployment target with <code>node 22.x</code> so Vercel builds run without rejecting the runtime declaration.
            </li>
            <li>
              Keep <code>vercel.json</code> pointed at <code>yarn install --immutable</code> and <code>yarn build</code> so both admin and game workspaces compile under Yarn, and ensure no stray <code>pnpm</code> manifests remain so Vercel stays on the Yarn toolchain.
            </li>
            <li>
              Distinguish Codex shell proxy failures from Vercel deployment issues by checking where the errors appear, running
              <code>env | grep -i _proxy</code>, <code>npm config get https-proxy</code>, and <code>curl -I</code> diagnostics inside Codex, and recording the findings here for comparison with Vercel build logs.
            </li>
            <li>
              Run <code>yarn install</code> from the repo root to hydrate workspaces. When the proxy blocks registry access (403 Forbidden), capture the logs and mirror them in the README and this safeguards list for network follow-up.
            </li>
            <li>
              Primary builds run through <code>yarn build</code>, which now executes the admin workspace first (<code>yarn workspace esx-admin-control-panel-map run build</code>) and then the game workspace (<code>yarn workspace game-web run build</code>) so both <code>.next</code> outputs exist for deployment. Until a Yarn lockfile is captured, fall back to <code>node apps/game-web/node_modules/.bin/next build</code> and <code>node apps/admin/node_modules/.bin/next build</code>, archiving any Yarn proxy errors alongside the logs.
            </li>
            <li>
              Use <code>yarn build:admin</code> to compile the admin dashboard when verifying both applications locally, or <code>yarn build:game</code> for a focused game rebuild.
            </li>
            <li>
              Keep <code>yarn build:turbo</code> available for aggregate builds; it still invokes <code>turbo run build</code> across workspaces when that package is installed.
            </li>
            <li>
              Manage Yarn settings through <code>.yarnrc.yml</code>, ensuring <code>nodeLinker: node-modules</code> stays committed for offline compatibility and telemetry remains disabled.
            </li>
            <li>
              Mirror proxy host/credential details in <code>.npmrc</code>, <code>HTTP(S)_PROXY</code>, and Yarn's <code>npmRegistryServer</code> configuration so installs behave consistently regardless of the CLI in use.
            </li>
            <li>
              Retain the existing <code>node_modules</code> snapshot alongside Yarn logs when installs fail so on-call engineers can reproduce the environment without Corepack.
            </li>
            <li>
              Continue reviewing security policies and SSL enforcement settings if registry access is denied, documenting any temporary overrides applied during troubleshooting.
            </li>
            <li>
              Record all Yarn ↔ proxy remediation attempts (including telemetry prompts and Corepack bootstrap messages) in the conversation log below for QA traceability.
            </li>
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Conversation Log</h2>
        <p className="hint">Latest operator ↔ GPT coordination for this deployment.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {conversationLog.map((entry, index) => (
            <div key={`${entry.speaker}-${index}`} style={{ borderLeft: '4px solid var(--border)', paddingLeft: 12 }}>
              <div style={{ fontWeight: 600 }}>{entry.speaker}</div>
              <div style={{ marginTop: 4, lineHeight: 1.5 }}>{entry.message}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 'auto' }}>
        <h2>Repository Snapshot</h2>
        <p className="hint">Refreshed {timestamp}</p>
        <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 16px', margin: 0 }}>
          <dt style={{ color: 'var(--muted)' }}>Repository</dt>
          <dd style={{ margin: 0 }}>{metadata?.repoName}</dd>
          <dt style={{ color: 'var(--muted)' }}>Branch</dt>
          <dd style={{ margin: 0 }}>{metadata?.branchName}</dd>
          <dt style={{ color: 'var(--muted)' }}>Commit</dt>
          <dd style={{ margin: 0 }}>
            <code>{metadata?.commitShaShort}</code>
            {metadata?.commitSha && metadata.commitSha !== metadata.commitShaShort ? (
              <span className="hint" style={{ marginLeft: 8 }}>{metadata.commitSha}</span>
            ) : null}
          </dd>
          <dt style={{ color: 'var(--muted)' }}>Deployment</dt>
          <dd style={{ margin: 0 }}>{metadata?.deploymentUrl}</dd>
          <dt style={{ color: 'var(--muted)' }}>Node runtime</dt>
          <dd style={{ margin: 0 }}>{metadata?.nodeVersion}</dd>
          <dt style={{ color: 'var(--muted)' }}>Yarn version</dt>
          <dd style={{ margin: 0 }}>{metadata?.yarnVersion}</dd>
          <dt style={{ color: 'var(--muted)' }}>Target range</dt>
          <dd style={{ margin: 0 }}>{metadata?.nodeTarget}</dd>
        </dl>
      </section>

      <footer
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 8,
          alignItems: 'center',
          fontSize: 13,
          color: 'var(--muted)',
          marginTop: 16,
          borderTop: '1px solid var(--border)',
          paddingTop: 12,
        }}
      >
        <span><strong>Repository:</strong> {metadata?.repoName || '—'}</span>
        <span><strong>Branch:</strong> {metadata?.branchName || '—'}</span>
        <span>
          <strong>Commit:</strong>{' '}
          <code>{metadata?.commitShaShort || '—'}</code>
          {metadata?.commitSha && metadata.commitSha !== metadata.commitShaShort ? (
            <span className="hint" style={{ marginLeft: 6 }}>{metadata.commitSha}</span>
          ) : null}
        </span>
        <span><strong>Deployment:</strong> {deploymentDisplay}</span>
        <span><strong>Generated:</strong> {timestamp}</span>
      </footer>
    </main>
  );
}
