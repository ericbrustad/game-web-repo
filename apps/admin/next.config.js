/** @type {import('next').NextConfig} */
const rawGameEnabled = process.env.GAME_ENABLED ?? process.env.NEXT_PUBLIC_GAME_ENABLED ?? '0';

const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  env: {
    GAME_ENABLED: rawGameEnabled,
    NEXT_PUBLIC_GAME_ENABLED: rawGameEnabled,
  },
};

module.exports = nextConfig;
