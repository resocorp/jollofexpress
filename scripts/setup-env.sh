#!/bin/bash
# Setup environment variables for print worker
# Run this on your production server

echo "🔧 Print Worker Environment Setup"
echo "=================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found!"
  echo "Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo "✅ Created .env.local"
  echo ""
fi

# Check for required variables
echo "Checking required environment variables..."
echo ""

MISSING=()

# Check PRINT_PROCESSOR_SECRET
if ! grep -q "^PRINT_PROCESSOR_SECRET=" .env.local || grep -q "^PRINT_PROCESSOR_SECRET=your_secure_random_secret_here" .env.local; then
  echo "⚠️  PRINT_PROCESSOR_SECRET not set"
  PRINT_SECRET=$(openssl rand -base64 32)
  sed -i "s|^PRINT_PROCESSOR_SECRET=.*|PRINT_PROCESSOR_SECRET=$PRINT_SECRET|" .env.local
  echo "✅ Generated PRINT_PROCESSOR_SECRET: $PRINT_SECRET"
  MISSING+=("PRINT_PROCESSOR_SECRET")
fi

# Check PRINTER_IP_ADDRESS
if ! grep -q "^PRINTER_IP_ADDRESS=10.250.40.14" .env.local; then
  echo "⚠️  PRINTER_IP_ADDRESS not set to correct value"
  sed -i "s|^PRINTER_IP_ADDRESS=.*|PRINTER_IP_ADDRESS=10.250.40.14|" .env.local
  echo "✅ Set PRINTER_IP_ADDRESS=10.250.40.14"
  MISSING+=("PRINTER_IP_ADDRESS")
fi

# Check PRINTER_PORT
if ! grep -q "^PRINTER_PORT=" .env.local; then
  echo "⚠️  PRINTER_PORT not set"
  echo "PRINTER_PORT=9100" >> .env.local
  echo "✅ Set PRINTER_PORT=9100"
fi

echo ""
echo "=================================="

if [ ${#MISSING[@]} -eq 0 ]; then
  echo "✅ All required variables are set!"
else
  echo "✅ Fixed ${#MISSING[@]} missing variable(s)"
fi

echo ""
echo "📋 Current printer configuration:"
grep "^PRINTER_IP_ADDRESS=" .env.local
grep "^PRINTER_PORT=" .env.local
echo "PRINT_PROCESSOR_SECRET=<set> (hidden for security)"

echo ""
echo "🚀 Next steps:"
echo "   1. pm2 restart all --update-env"
echo "   2. pm2 save"
echo "   3. pm2 logs print-worker"
