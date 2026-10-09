#!/bin/bash
set -e

# Ensure VAULT_ADDR is set in the environment
export VAULT_ADDR=$VAULT_ADDR

# Authenticate to Vault
VAULT_TOKEN=$(vault login -method=userpass \
    username="$VAULT_USERNAME" \
    password="$VAULT_PASSWORD" \
    -format=json | jq -r .auth.client_token)
export VAULT_TOKEN

ENV_FILE="/app/.env"
: > "$ENV_FILE"  # empty or create the file

# Fetch secrets from Vault
entries=$(vault kv get -format=json env/crm-frontend | jq -r '.data.data | to_entries[] | @base64')

for entry in $entries; do
    decoded=$(echo "$entry" | base64 -d)
    key=$(echo "$decoded" | jq -r '.key')
    value=$(echo "$decoded" | jq -r '.value')

    # Convert literal \n into actual newlines for PEM or cert files
    formatted_value=$(echo -e "$value")

    # Escape newlines for .env file
    escaped_for_env=$(printf "%s" "$formatted_value" | sed ':a;N;$!ba;s/\n/\\n/g')

    # Write to .env
    echo "${key}=${escaped_for_env}" >> "$ENV_FILE"

    # Export for Node.js runtime
    export "$key"="$formatted_value"
done

# Ensure .env is readable
chmod 600 "$ENV_FILE"

# Start the Next.js app
exec npm run start
