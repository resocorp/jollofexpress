// Environment variable validator
// Run this on app startup to catch configuration issues early

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required for all environments
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_URL');
  } else if (!process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL does not look like a valid Supabase URL');
  }

  // Client-side API key (at least one required)
  const hasPublishableKey = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!hasPublishableKey && !hasAnonKey) {
    errors.push('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  } else if (hasAnonKey && !hasPublishableKey) {
    warnings.push('Using legacy NEXT_PUBLIC_SUPABASE_ANON_KEY. Consider upgrading to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  // Server-side API key (at least one required)
  const hasSecretKey = !!process.env.SUPABASE_SECRET_KEY;
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!hasSecretKey && !hasServiceRoleKey) {
    errors.push('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  } else if (hasServiceRoleKey && !hasSecretKey) {
    warnings.push('Using legacy SUPABASE_SERVICE_ROLE_KEY. Consider upgrading to SUPABASE_SECRET_KEY');
  }

  // Optional but recommended
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push('Missing NEXT_PUBLIC_APP_URL. Defaulting to http://localhost:3000');
  }

  // Payment configuration
  if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
    warnings.push('Missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY. Payment features will not work');
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    warnings.push('Missing PAYSTACK_SECRET_KEY. Payment verification will not work');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function logEnvironmentStatus(): void {
  const result = validateEnvironment();

  if (result.valid) {
    console.log('✅ Environment variables validated successfully');
    
    if (result.warnings.length > 0) {
      console.warn('⚠️  Environment warnings:');
      result.warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    // Log configuration summary (without sensitive data)
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📋 Configuration Summary:');
      console.log('   Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('   API Key Type:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'Publishable (New)' : 'Anon (Legacy)');
      console.log('   App URL:', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000 (default)');
      console.log('   Payment:', process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ? 'Configured' : 'Not configured');
      console.log('');
    }
  } else {
    console.error('❌ Environment validation failed!');
    console.error('\nMissing required environment variables:');
    result.errors.forEach(error => console.error(`   - ${error}`));
    
    if (result.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    console.error('\n📖 Please check LOCALHOST_TROUBLESHOOTING.md for setup instructions');
    console.error('   Or copy .env.example to .env.local and fill in your values\n');
  }
}

// Validate on import in development
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  logEnvironmentStatus();
}
