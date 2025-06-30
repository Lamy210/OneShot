/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        domains: ['your-domain.example', 'minio.your-domain.example'],
    },
    env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        KEYCLOAK_ID: process.env.KEYCLOAK_ID,
        KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET,
        KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    },
}

module.exports = nextConfig
