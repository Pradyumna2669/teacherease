/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Next does not route directories whose name begins with a dot, so the
      // Android Digital Asset Links file is served from an API route.
      {
        source: "/.well-known/assetlinks.json",
        destination: "/api/assetlinks",
      },
    ];
  },
};
export default nextConfig;
