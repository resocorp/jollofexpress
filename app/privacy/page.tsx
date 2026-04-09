'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, Bell } from 'lucide-react';

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: `When you use myshawarma.express, we collect the following:

From you directly:
• Name, phone number, and delivery address when you place an order
• Payment information (processed securely by our payment provider, Paystack)
• Messages you send us on WhatsApp or through our platform

Automatically:
• Basic device info (browser type, IP address) to keep our site running well
• Cookies to remember your cart and preferences
• Delivery location data to fulfill your orders`
    },
    {
      title: '2. How We Use Your Information',
      content: `We use your information to:

• Process and deliver your orders
• Send you order updates via WhatsApp
• Improve our menu and service
• Respond to your questions and complaints
• Prevent fraud and keep transactions secure
• Comply with Nigerian tax and business laws

We will never use your data for anything unrelated to our food delivery service without your permission.`
    },
    {
      title: '3. Who We Share Your Data With',
      content: `We do not sell your personal information to anyone.

We only share your data with:
• Our delivery riders (your name, phone, and address so they can deliver your food)
• Paystack (our payment processor, to handle your payments securely)
• Our hosting provider (to store data securely)

We will share data with authorities if required by Nigerian law.`
    },
    {
      title: '4. Data Security',
      content: `We take reasonable steps to protect your data:

• All payments are encrypted and processed through Paystack
• We use SSL encryption on our website
• Access to customer data is limited to authorized staff only
• We do not store your full card details on our servers

No system is 100% secure, but we do our best to keep your information safe.`
    },
    {
      title: '5. Your Rights Under NDPR',
      content: `Under the Nigeria Data Protection Regulation (NDPR), you have the right to:

• Know what personal data we hold about you
• Request correction of inaccurate data
• Request deletion of your data (subject to legal requirements like tax records)
• Withdraw your consent for marketing messages
• Object to how we process your data

To exercise any of these rights, contact us at myshawarmaexpress@gmail.com or message us on WhatsApp. We will respond within 30 days.`
    },
    {
      title: '6. Cookies',
      content: `We use cookies to:

• Keep items in your shopping cart
• Remember your preferences
• Understand how people use our site so we can improve it

You can disable cookies in your browser settings, but some features may not work properly.`
    },
    {
      title: '7. Data Retention',
      content: `We keep your data only as long as needed:

• Order records are kept for up to 7 years for tax purposes
• Account data is kept while your account is active
• If you ask us to delete your account, we will remove your personal data within 30 days (except what we are legally required to keep)`
    },
    {
      title: '8. Changes to This Policy',
      content: `We may update this policy from time to time. If we make significant changes, we will notify you via WhatsApp or on our website. Continued use of our service means you accept the updated policy.`
    },
    {
      title: '9. Contact Us',
      content: `For any privacy-related questions or requests:

Email: myshawarmaexpress@gmail.com
WhatsApp: +234 810 682 8147
Address: Solution Arena, Abakaliki Street, Awka, Anambra State, Nigeria

If you are not satisfied with our response, you can lodge a complaint with the Nigeria Data Protection Bureau (NDPB) at info@ndpb.gov.ng.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="flex items-center justify-center mb-6">
              <Shield className="h-16 w-16" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-xl text-blue-50">
              How we handle your personal information at myshawarma.express.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Last Updated */}
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Bell className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Last Updated: March 2026</h3>
                  <p className="text-blue-800 text-sm">
                    We may update this policy from time to time. We will notify you of any significant changes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">Introduction</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  myshawarma.express ("we," "our," or "us") is a local food delivery business based in Awka, Anambra State, Nigeria. This Privacy Policy explains how we collect, use, and protect your personal data when you use our website and services.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We comply with the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act 2023. By using our services, you consent to the practices described here.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Privacy Sections */}
          <div className="space-y-6">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-8">
                    <h2 className="text-2xl font-bold text-blue-900 mb-4">
                      {section.title}
                    </h2>
                    <div className="prose prose-sm max-w-none">
                      {section.content.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12"
          >
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4 text-center">Your Privacy Matters</h3>
                <p className="text-muted-foreground text-center mb-6">
                  We are a small local business and we value the trust you place in us. If you have any questions about your data, just reach out.
                </p>
                <div className="text-center">
                  <a 
                    href="mailto:myshawarmaexpress@gmail.com"
                    className="inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Contact Us
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
