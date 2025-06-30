/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        domains: ['your-domain.example', 'minio.your-domain.example'],
    },
    env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret',
        KEYCLOAK_ID: process.env.KEYCLOAK_ID || 'oneshot-frontend',
        KEYCLOAK_SECRET: process.env.KEYCLOAK_SECRET || 'dev-secret',
        KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/auth/realms/oneshot',
    },
}

module.exports = nextConfig
