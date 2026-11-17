/** @type {import('next').NextConfig} */

// Optional server-only adapters, each imported lazily (`await import(...)`) and
// only when configured — object storage (S3) or live Stripe. They are not in
// dependencies by default. Keep the production build from trying to resolve
// packages that may not be installed by treating them as runtime externals; the
// adapters already `.catch()` a missing module and fall back to the stub/memory
// implementations. Install them only when those integrations go live:
//   pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner stripe
const OPTIONAL_EXTERNALS = ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'stripe']

const nextConfig = {
  serverExternalPackages: OPTIONAL_EXTERNALS,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push(({ request }, callback) => {
        if (OPTIONAL_EXTERNALS.includes(request)) {
          return callback(null, 'commonjs ' + request)
        }
        return callback()
      })
    }
    return config
  },
}

export default nextConfig
