#!/usr/bin/env bash
set -e

# Keycloak initialization script
echo "🔐 Initializing Keycloak realm and clients"

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
ADMIN_USER="${KEYCLOAK_ADMIN_USER:-admin}"
ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"
REALM_NAME="${KEYCLOAK_REALM:-oneshot}"

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to be ready..."
until curl -f "$KEYCLOAK_URL/health/ready" &> /dev/null; do
    echo "Keycloak not ready yet, waiting..."
    sleep 5
done

echo "Keycloak is ready, proceeding with setup..."

# Login and get access token
ACCESS_TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$ADMIN_USER" \
    -d "password=$ADMIN_PASSWORD" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" | \
    jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ]; then
    echo "❌ Failed to get access token from Keycloak"
    exit 1
fi

echo "✅ Successfully authenticated with Keycloak"

# Create realm
echo "Creating realm: $REALM_NAME"
curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "realm": "'$REALM_NAME'",
        "displayName": "OneShot Platform",
        "enabled": true,
        "registrationAllowed": true,
        "loginWithEmailAllowed": true,
        "duplicateEmailsAllowed": false,
        "resetPasswordAllowed": true,
        "editUsernameAllowed": false,
        "bruteForceProtected": true,
        "permanentLockout": false,
        "maxFailureWaitSeconds": 900,
        "minimumQuickLoginWaitSeconds": 60,
        "waitIncrementSeconds": 60,
        "quickLoginCheckMilliSeconds": 1000,
        "maxDeltaTimeSeconds": 43200,
        "failureFactor": 30
    }'

# Create roles
echo "Creating roles..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/roles" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "USER",
        "description": "Standard user role"
    }'

curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/roles" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "ADMIN",
        "description": "Administrator role"
    }'

# Create frontend client
echo "Creating frontend client..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "clientId": "oneshot-frontend",
        "name": "OneShot Frontend",
        "description": "Frontend application client",
        "enabled": true,
        "clientAuthenticatorType": "client-secret",
        "redirectUris": [
            "https://your-domain.example/*",
            "http://localhost:3000/*"
        ],
        "webOrigins": [
            "https://your-domain.example",
            "http://localhost:3000"
        ],
        "protocol": "openid-connect",
        "publicClient": false,
        "bearerOnly": false,
        "standardFlowEnabled": true,
        "implicitFlowEnabled": false,
        "directAccessGrantsEnabled": true,
        "serviceAccountsEnabled": false,
        "frontchannelLogout": true,
        "attributes": {
            "pkce.code.challenge.method": "S256"
        }
    }'

# Create backend client
echo "Creating backend client..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "clientId": "oneshot-backend",
        "name": "OneShot Backend",
        "description": "Backend API client",
        "enabled": true,
        "clientAuthenticatorType": "client-secret",
        "protocol": "openid-connect",
        "publicClient": false,
        "bearerOnly": true,
        "standardFlowEnabled": false,
        "implicitFlowEnabled": false,
        "directAccessGrantsEnabled": false,
        "serviceAccountsEnabled": true
    }'

# Get client secrets
echo "Retrieving client secrets..."
FRONTEND_CLIENT_SECRET=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    jq -r '.[] | select(.clientId=="oneshot-frontend") | .id')

if [ "$FRONTEND_CLIENT_SECRET" != "null" ]; then
    FRONTEND_SECRET=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients/$FRONTEND_CLIENT_SECRET/client-secret" \
        -H "Authorization: Bearer $ACCESS_TOKEN" | \
        jq -r '.value')
    echo "Frontend client secret: $FRONTEND_SECRET"
fi

# Create default admin user
echo "Creating default admin user..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin",
        "email": "admin@oneshot.example",
        "firstName": "OneShot",
        "lastName": "Admin",
        "enabled": true,
        "emailVerified": true,
        "credentials": [{
            "type": "password",
            "value": "admin123",
            "temporary": false
        }]
    }'

# Assign admin role to admin user
ADMIN_USER_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users?username=admin" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    jq -r '.[0].id')

ADMIN_ROLE_ID=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM_NAME/roles/ADMIN" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    jq -r '.id')

curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users/$ADMIN_USER_ID/role-mappings/realm" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '[{
        "id": "'$ADMIN_ROLE_ID'",
        "name": "ADMIN"
    }]'

echo "✅ Keycloak realm setup completed successfully!"
echo ""
echo "Realm: $REALM_NAME"
echo "Admin user: admin / admin123"
echo "Frontend client: oneshot-frontend"
echo "Backend client: oneshot-backend"
echo ""
echo "Please update your .env.local file with the client secrets if needed."
