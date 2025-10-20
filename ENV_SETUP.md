# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=JollofExpress

# SMS Service (Termii or Africa's Talking)
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=JollofExpress

# Email Service (Resend or SendGrid)
EMAIL_API_KEY=your_email_api_key
EMAIL_FROM=noreply@jollofexpress.com

# Print Server Configuration
PRINT_SERVER_URL=http://192.168.1.100:8080
PRINT_VPN_ENABLED=true

# Security
JWT_SECRET=your_jwt_secret_generate_random_string
WEBHOOK_SECRET=your_webhook_secret_for_paystack
```

## Setup Instructions

1. Create Supabase project at https://supabase.com
2. Get Paystack API keys from https://dashboard.paystack.com
3. Configure SMS provider (Termii or Africa's Talking)
4. Set up email service (Resend or SendGrid)
5. Copy this template to `.env.local` and fill in your values
