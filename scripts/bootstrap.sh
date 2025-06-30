#!/usr/bin/env bash
set -e

echo "🚀 OneShot Platform Bootstrap Script"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
    fi
    
    print_success "Prerequisites check completed"
}

# Copy environment file
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env.local ]; then
        if [ -f .env.example ]; then
            cp .env.example .env.local
            print_warning "Please edit .env.local with your actual values before proceeding"
            print_warning "Press Enter to continue after editing .env.local..."
            read
        else
            print_error ".env.example file not found"
            exit 1
        fi
    else
        print_success "Environment file .env.local already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install --frozen-lockfile
    else
        pnpm install
    fi
    
    print_success "Dependencies installed"
}

# Build applications
build_applications() {
    print_status "Building applications..."
    
    # Build packages first
    pnpm turbo run build --filter=@oneshot/utils
    
    # Build applications
    pnpm turbo run build --filter=@oneshot/backend
    pnpm turbo run build --filter=@oneshot/frontend
    
    print_success "Applications built successfully"
}

# Start infrastructure services
start_infrastructure() {
    print_status "Starting infrastructure services..."
    
    # Start core services first
    docker-compose up -d postgres redis minio
    
    print_status "Waiting for services to be ready..."
    sleep 15
    
    # Check if PostgreSQL is ready
    until docker-compose exec -T postgres pg_isready -U oneshot; do
        print_status "Waiting for PostgreSQL to be ready..."
        sleep 5
    done
    
    print_success "Infrastructure services started"
}

# Setup Keycloak
setup_keycloak() {
    print_status "Starting Keycloak..."
    
    docker-compose up -d keycloak
    
    print_status "Waiting for Keycloak to be ready..."
    sleep 30
    
    # Wait for Keycloak to be ready
    until curl -f http://localhost:8080/health/ready &> /dev/null; do
        print_status "Waiting for Keycloak to be ready..."
        sleep 10
    done
    
    print_status "Setting up Keycloak realm and clients..."
    if [ -f "scripts/keycloak-init.sh" ]; then
        bash scripts/keycloak-init.sh
    else
        print_warning "Keycloak initialization script not found. Please set up Keycloak manually."
    fi
    
    print_success "Keycloak setup completed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    cd apps/backend
    npx prisma migrate dev --name init
    npx prisma generate
    
    # Seed database
    if [ -f "prisma/seed.ts" ]; then
        npx prisma db seed
    fi
    
    cd ../..
    print_success "Database migrations completed"
}

# Start application services
start_applications() {
    print_status "Starting application services..."
    
    docker-compose up -d backend frontend caddy
    
    print_status "Waiting for services to be ready..."
    sleep 20
    
    print_success "Application services started"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Check backend health
    if curl -f http://localhost:3001/health &> /dev/null; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend (through Caddy)
    if curl -f http://localhost &> /dev/null; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    print_success "All health checks passed"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    docker-compose down
}

# Main execution
main() {
    echo "Starting OneShot Platform setup..."
    
    # Trap to cleanup on script exit
    trap cleanup EXIT
    
    check_prerequisites
    setup_environment
    install_dependencies
    build_applications
    start_infrastructure
    setup_keycloak
    run_migrations
    start_applications
    health_check
    
    echo ""
    print_success "🎉 OneShot Platform is now running!"
    echo ""
    echo "Access the application at: http://localhost (or your configured domain)"
    echo "Admin panel: http://localhost:8080 (Keycloak)"
    echo "Monitoring: http://localhost:9090 (Prometheus)"
    echo "Logs: http://localhost:3001 (Grafana)"
    echo ""
    echo "To stop the platform: docker-compose down"
    echo "To view logs: docker-compose logs -f"
    echo ""
}

# Run main function
main "$@"
