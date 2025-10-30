/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  async rewrites() {
    const defaultSlug = process.env.NEXT_PUBLIC_DEFAULT_GAME_SLUG || 'default';
    const defaultChannel = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || 'published';
    return [
      { source: '/', destination: `/?slug=${defaultSlug}&channel=${defaultChannel}` },
      { source: '/g/:slug', destination: '/?slug=:slug&channel=' + defaultChannel },
      { source: '/:slug', destination: '/?slug=:slug&channel=' + defaultChannel },
    ];
  },
};

module.exports = nextConfig;
