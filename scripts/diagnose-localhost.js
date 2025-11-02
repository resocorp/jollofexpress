#!/usr/bin/env node

/**
 * Localhost Diagnostic Script
 * Run this to diagnose localhost connectivity issues
 * 
 * Usage: node scripts/diagnose-localhost.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔍 JollofExpress Localhost Diagnostic Tool\n');
console.log('=' .repeat(60));

// Check 1: .env.local exists
console.log('\n1️⃣  Checking .env.local file...');
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('   ✅ .env.local file found');
  
  // Read and parse (without logging sensitive data)
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const foundVars = {};
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key] = trimmed.split('=');
      if (requiredVars.includes(key)) {
        foundVars[key] = true;
      }
    }
  });
  
  console.log('\n   Required variables:');
  console.log('   - NEXT_PUBLIC_SUPABASE_URL:', foundVars['NEXT_PUBLIC_SUPABASE_URL'] ? '✅' : '❌ MISSING');
  console.log('   - Client Key (Publishable or Anon):', 
    (foundVars['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] || foundVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']) ? '✅' : '❌ MISSING');
  console.log('   - Server Key (Secret or Service Role):', 
    (foundVars['SUPABASE_SECRET_KEY'] || foundVars['SUPABASE_SERVICE_ROLE_KEY']) ? '✅' : '❌ MISSING');
  
} else {
  console.log('   ❌ .env.local file NOT FOUND');
  console.log('   💡 Copy .env.example to .env.local and fill in your values');
}

// Check 2: Supabase connectivity
console.log('\n2️⃣  Testing Supabase connectivity...');

// Try to read Supabase URL from .env.local
let supabaseUrl = null;
if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  if (match) {
    supabaseUrl = match[1].trim();
  }
}

if (supabaseUrl) {
  console.log(`   Testing: ${supabaseUrl}`);
  
  const url = new URL(supabaseUrl);
  const options = {
    hostname: url.hostname,
    port: 443,
    path: '/rest/v1/',
    method: 'GET',
    timeout: 5000,
  };
  
  const req = https.request(options, (res) => {
    if (res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 400) {
      console.log('   ✅ Supabase is reachable');
      console.log(`   Status: ${res.statusCode}`);
    } else {
      console.log(`   ⚠️  Unexpected status: ${res.statusCode}`);
    }
  });
  
  req.on('error', (error) => {
    console.log('   ❌ Cannot reach Supabase');
    console.log(`   Error: ${error.message}`);
  });
  
  req.on('timeout', () => {
    console.log('   ❌ Connection timeout');
    req.destroy();
  });
  
  req.end();
} else {
  console.log('   ⚠️  Cannot test - NEXT_PUBLIC_SUPABASE_URL not found');
}

// Check 3: Node modules
console.log('\n3️⃣  Checking dependencies...');
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
const hasNodeModules = fs.existsSync(nodeModulesPath);

if (hasNodeModules) {
  console.log('   ✅ node_modules directory exists');
  
  // Check critical packages
  const criticalPackages = [
    '@supabase/supabase-js',
    '@supabase/ssr',
    'next',
    '@tanstack/react-query',
  ];
  
  criticalPackages.forEach(pkg => {
    const pkgPath = path.join(nodeModulesPath, pkg);
    const exists = fs.existsSync(pkgPath);
    console.log(`   - ${pkg}: ${exists ? '✅' : '❌ MISSING'}`);
  });
} else {
  console.log('   ❌ node_modules directory NOT FOUND');
  console.log('   💡 Run: npm install');
}

// Check 4: Next.js config
console.log('\n4️⃣  Checking Next.js configuration...');
const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  console.log('   ✅ next.config.ts found');
} else {
  console.log('   ⚠️  next.config.ts not found');
}

// Summary and recommendations
console.log('\n' + '='.repeat(60));
console.log('\n📋 RECOMMENDATIONS:\n');

if (!envExists) {
  console.log('1. Create .env.local file:');
  console.log('   cp .env.example .env.local');
  console.log('');
}

console.log('2. Ensure Supabase CORS is configured:');
console.log('   - Go to: https://supabase.com/dashboard');
console.log('   - Settings → API → CORS Configuration');
console.log('   - Add: http://localhost:3000');
console.log('');

console.log('3. Restart your development server:');
console.log('   - Stop the server (Ctrl+C)');
console.log('   - Run: npm run dev');
console.log('');

console.log('4. Check browser console for errors:');
console.log('   - Open DevTools (F12)');
console.log('   - Look for CORS or network errors');
console.log('');

console.log('📖 For detailed troubleshooting, see:');
console.log('   LOCALHOST_TROUBLESHOOTING.md');
console.log('');

// Wait a bit for async operations to complete
setTimeout(() => {
  console.log('✨ Diagnostic complete!\n');
}, 2000);
