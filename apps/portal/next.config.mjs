/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: '/aios',
    transpilePackages: ['@aios/compiler', '@aios/runtime', '@aios/tools'],
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: ['@aios/data-service'],
    },
    webpack: (config, { isServer }) => {
        // node: scheme builtins (used by @aios/data-service for scrypt) must not be bundled nor parsed.
        if (isServer) {
            if (!Array.isArray(config.externals)) config.externals = [];
            config.externals.push(({ request }, callback) => {
                if (typeof request === 'string' && (request.startsWith('node:') || request === '@aios/data-service')) {
                    return callback(null, `commonjs ${request}`);
                }
                return callback();
            });
        }
        return config;
    },
};

export default nextConfig;