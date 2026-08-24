/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["mongoose"],
  experimental: {
    optimizePackageImports: ["react-icons"],
  },

  async redirects() {
    return [{ source: "/time/track", destination: "/time", permanent: false }];
  },
};

export default nextConfig;
