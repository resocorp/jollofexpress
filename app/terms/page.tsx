'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { FileText, Clock } from 'lucide-react';

export default function TermsPage() {
  const sections = [
    {
      title: '1. Our Promise',
      content: `We at myshawarma.express are committed to giving you the best shawarma experience in Awka. We will always do our best to get your order right, deliver it fresh and on time, and make sure you are happy.`
    },
    {
      title: '2. If Something Goes Wrong',
      content: `We are human, and sometimes things don't go as planned. If your order is wrong, missing items, late, or not up to standard, please reach out to us on WhatsApp (+234 810 682 8147) and we will do our best to resolve it. Whether that means a replacement, a refund, or making it right another way, we will work with you.`
    },
    {
      title: '3. Orders and Payment',
      content: `All prices are in Nigerian Naira (₦). Prices may change from time to time. You pay the price shown when you place your order. We accept card payments, bank transfers, and other methods available on our platform. Delivery fees depend on your location.`
    },
    {
      title: '4. Delivery',
      content: `We deliver within Awka and surrounding areas. We aim to deliver within 30-45 minutes, but sometimes things like traffic or weather can cause delays. Please make sure your delivery address and phone number are correct so we can reach you.`
    },
    {
      title: '5. Cancellations and Refunds',
      content: `You can cancel your order within 5 minutes of placing it. After that, we may have already started preparing your food. If there is a genuine issue with your order, contact us within 24 hours and we will sort it out. Refunds go back to your original payment method within 5-10 business days.`
    },
    {
      title: '6. Your Account',
      content: `Keep your account details safe. You are responsible for what happens on your account. If you notice anything suspicious, let us know immediately.`
    },
    {
      title: '7. Food Safety',
      content: `We take hygiene seriously and prepare all food following proper food safety practices. Please note that we cannot guarantee allergen-free meals — if you have allergies, ordering is at your own risk. Once your food is delivered, please consume it promptly.`
    },
    {
      title: '8. Be Kind',
      content: `We ask that you treat our staff and delivery riders with respect. We are all working hard to get you great food. Any form of harassment or abuse towards our team will not be tolerated.`
    },
    {
      title: '9. Governing Law',
      content: `These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes will be handled in the courts of Anambra State, Nigeria. But honestly, we would rather just chat it out on WhatsApp and fix things.`
    },
    {
      title: '10. Contact Us',
      content: `Got questions? Reach out anytime:

WhatsApp: +234 810 682 8147
Email: myshawarmaexpress@gmail.com
Location: Solution Arena, Abakaliki Street, Awka.`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 text-white py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="flex items-center justify-center mb-6">
              <FileText className="h-16 w-16" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Terms & Conditions</h1>
            <p className="text-xl text-orange-50">
              Please read these terms carefully before using our services
            </p>
          </motion.div>
        </div>
      </section>

      {/* Last Updated */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Clock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Last Updated</h3>
                  <p className="text-blue-800 text-sm">
                    These Terms and Conditions were last updated on October 22, 2025. 
                    We may update these terms periodically, and your continued use of our services 
                    constitutes acceptance of any changes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">Welcome to myshawarma.express</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These are the terms that apply when you use our website and delivery services. 
                  By ordering from us, you agree to these terms. They are simple and straightforward.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Terms Sections */}
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
                    <h2 className="text-2xl font-bold mb-4 text-orange-900">
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

          {/* Acknowledgment */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12"
          >
            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">That's It!</h3>
                <p className="text-muted-foreground mb-6">
                  We keep things simple. If you have any questions, just reach out to us.
                </p>
                <p className="text-sm text-muted-foreground">
                  Contact us at{' '}
                  <a href="mailto:myshawarmaexpress@gmail.com" className="text-orange-600 hover:text-orange-700 font-medium">
                    myshawarmaexpress@gmail.com
                  </a>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
