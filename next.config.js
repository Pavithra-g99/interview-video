/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // Disable Turbopack to avoid the Webpack conflict
  experimental: {
    turbo: false,
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },

  // Image domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },

  // Custom Webpack modifications
  webpack: (webpackConfig, { webpack }) => {
    webpackConfig.plugins.push(
      // Remove "node:" from import specifiers (Next.js doesn't support node: scheme yet)
      // See: https://github.com/vercel/next.js/issues/28774
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );

    return webpackConfig;
  },
};

module.exports = nextConfig;
