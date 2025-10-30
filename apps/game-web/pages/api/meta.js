export default function handler(req, res) {
  const repository = process.env.VERCEL_GIT_REPO_SLUG || process.env.REPOSITORY_NAME || null;
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.BRANCH_NAME || null;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || null;
  const deployment = process.env.VERCEL_URL || process.env.DEPLOYMENT_URL || null;
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || null;
  res.status(200).json({
    repository,
    branch,
    commit,
    deployment,
    environment,
    timestamp: new Date().toISOString(),
  });
}
