/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,

  // Fix: Changed from false to {} to avoid the boolean expectation error
  experimental: {
    turbo: {},
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
      // Remove "node:" from import specifiers
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );

    return webpackConfig;
  },
};

module.exports = nextConfig;
