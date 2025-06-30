const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
    const examplePath = path.join(process.cwd(), '.env.example');
    const localPath = path.join(process.cwd(), '.env.local');

    if (!fs.existsSync(examplePath)) {
        log('red', '❌ .env.example file not found');
        process.exit(1);
    }

    const exampleContent = fs.readFileSync(examplePath, 'utf8');
    const requiredVars = exampleContent
        .split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => line.split('=')[0].trim())
        .filter(key => key.length > 0);

    log('blue', `📋 Found ${requiredVars.length} required environment variables`);

    let localContent = '';
    if (fs.existsSync(localPath)) {
        localContent = fs.readFileSync(localPath, 'utf8');
    } else if (process.env.NODE_ENV === 'production') {
        // In production, check process.env instead
        log('yellow', '⚠️  .env.local not found, checking process.env in production mode');
    } else {
        log('red', '❌ .env.local file not found');
        process.exit(1);
    }

    const missingVars = [];
    const emptyVars = [];

    for (const varName of requiredVars) {
        let value;

        if (process.env.NODE_ENV === 'production') {
            value = process.env[varName];
        } else {
            const match = localContent.match(new RegExp(`^${varName}=(.*)$`, 'm'));
            value = match ? match[1].trim() : undefined;
        }

        if (value === undefined) {
            missingVars.push(varName);
        } else if (value === '' || value.includes('your-') || value.includes('sk_test_') || value.includes('pk_test_')) {
            emptyVars.push(varName);
        }
    }

    if (missingVars.length > 0) {
        log('red', '❌ Missing environment variables:');
        missingVars.forEach(varName => {
            log('red', `   - ${varName}`);
        });
    }

    if (emptyVars.length > 0) {
        log('yellow', '⚠️  Environment variables that need to be configured:');
        emptyVars.forEach(varName => {
            log('yellow', `   - ${varName}`);
        });
    }

    if (missingVars.length > 0) {
        log('red', '\n❌ Environment check failed');
        process.exit(1);
    }

    if (emptyVars.length > 0) {
        log('yellow', '\n⚠️  Some environment variables need to be configured');
        log('yellow', 'The application may not work correctly until these are set');
        if (process.env.CI !== 'true') {
            process.exit(1);
        }
    } else {
        log('green', '\n✅ All environment variables are properly configured');
    }
}

function checkDockerfiles() {
    const dockerDir = path.join(process.cwd(), 'docker');
    const dockerfiles = ['Dockerfile.frontend', 'Dockerfile.backend'];

    log('blue', '🐳 Checking Dockerfiles...');

    for (const dockerfile of dockerfiles) {
        const dockerfilePath = path.join(dockerDir, dockerfile);
        if (!fs.existsSync(dockerfilePath)) {
            log('red', `❌ ${dockerfile} not found`);
            process.exit(1);
        }

        const content = fs.readFileSync(dockerfilePath, 'utf8');

        // Check for security best practices
        if (!content.includes('USER ')) {
            log('yellow', `⚠️  ${dockerfile} doesn't specify a non-root user`);
        }

        if (content.includes('COPY . .')) {
            log('yellow', `⚠️  ${dockerfile} copies entire context (consider using .dockerignore)`);
        }

        log('green', `✅ ${dockerfile} exists and looks good`);
    }
}

function checkPackageJson() {
    const rootPackagePath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(rootPackagePath)) {
        log('red', '❌ Root package.json not found');
        process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));

    // Check for required scripts
    const requiredScripts = ['build', 'dev', 'lint', 'test'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

    if (missingScripts.length > 0) {
        log('red', '❌ Missing required scripts in package.json:');
        missingScripts.forEach(script => {
            log('red', `   - ${script}`);
        });
        process.exit(1);
    }

    log('green', '✅ Package.json scripts are properly configured');
}

function checkPrismaSchema() {
    const schemaPath = path.join(process.cwd(), 'apps/backend/prisma/schema.prisma');

    if (!fs.existsSync(schemaPath)) {
        log('red', '❌ Prisma schema not found');
        process.exit(1);
    }

    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Check for required models
    const requiredModels = ['User', 'Post', 'Report', 'Payment'];
    const missingModels = requiredModels.filter(model =>
        !schemaContent.includes(`model ${model}`)
    );

    if (missingModels.length > 0) {
        log('red', '❌ Missing required models in Prisma schema:');
        missingModels.forEach(model => {
            log('red', `   - ${model}`);
        });
        process.exit(1);
    }

    log('green', '✅ Prisma schema contains all required models');
}

function main() {
    log('blue', '🔍 Running comprehensive environment checks...\n');

    try {
        checkEnvironmentVariables();
        checkDockerfiles();
        checkPackageJson();
        checkPrismaSchema();

        log('green', '\n🎉 All checks passed! Your OneShot platform is ready to deploy.');
    } catch (error) {
        log('red', `\n❌ Check failed: ${error.message}`);
        process.exit(1);
    }
}

// Run checks
main();
