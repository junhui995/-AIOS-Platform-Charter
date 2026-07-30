/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: '/aios',
    transpilePackages: ['@aios/compiler', '@aios/data-service', '@aios/runtime', '@aios/tools'],
};

export default nextConfig;
