'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { FileText, Clock } from 'lucide-react';

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing and using JollofExpress's website, mobile application, or services, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services. We reserve the right to modify these terms at any time, and your continued use of our services constitutes acceptance of any changes.`
    },
    {
      title: '2. Service Description',
      content: `JollofExpress provides online food ordering and delivery services in Awka and surrounding areas. We offer a platform connecting customers with quality Nigerian cuisine prepared by our kitchen and delivered to specified locations. Service availability may vary by location and time.`
    },
    {
      title: '3. Account Registration',
      content: `While browsing is available to all visitors, placing orders may require account registration. You agree to:
      
• Provide accurate, current, and complete information during registration
• Maintain the security of your password and account
• Accept responsibility for all activities under your account
• Notify us immediately of any unauthorized use
• Be at least 18 years of age or have parental/guardian consent

We reserve the right to suspend or terminate accounts that violate these terms.`
    },
    {
      title: '4. Orders and Payment',
      content: `**Order Placement:**
All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order for any reason, including product availability, errors in pricing or product information, or suspected fraudulent activity.

**Pricing:**
All prices are listed in Nigerian Naira (₦) and are subject to change without notice. The price charged will be the price displayed at the time of order placement.

**Payment Methods:**
We accept various payment methods including card payments, bank transfers, and cash on delivery where available. Payment is due at the time of order placement unless otherwise specified.

**Delivery Fees:**
Delivery charges vary based on location and order size. Minimum order values may apply for certain delivery zones.`
    },
    {
      title: '5. Delivery Terms',
      content: `**Delivery Times:**
We strive to deliver all orders within our estimated time frame (typically 30-45 minutes). However, delivery times are estimates and may vary due to factors beyond our control, including weather, traffic, or high order volume.

**Delivery Locations:**
We currently deliver to specified areas within Awka and surrounding neighborhoods. Please verify your location is within our delivery zone before placing an order.

**Delivery Responsibility:**
Our delivery personnel will attempt to deliver to the address provided. If delivery cannot be completed due to incorrect address, inaccessibility, or customer unavailability, additional charges may apply for re-delivery.

**Contactless Delivery:**
We offer contactless delivery options for customer safety. Please specify your preference when placing your order.`
    },
    {
      title: '6. Cancellation and Refund Policy',
      content: `**Order Cancellation:**
Orders may be cancelled within 5 minutes of placement without charge. After this period, cancellation may not be possible if food preparation has begun. Contact us immediately if you need to cancel an order.

**Refunds:**
Refunds will be processed in the following circumstances:
• Order not delivered within reasonable time
• Incorrect or missing items
• Food quality issues reported within 30 minutes of delivery
• Duplicate charges or payment errors

Refund requests must be submitted within 24 hours of order placement. Refunds will be processed to the original payment method within 5-10 business days.

**No Refund Conditions:**
No refunds will be provided for:
• Change of mind after order preparation has begun
• Customer unavailability at delivery
• Incorrect address provided by customer
• Allergies or dietary preferences not specified at order time`
    },
    {
      title: '7. Food Safety and Quality',
      content: `**Food Preparation:**
All meals are prepared in accordance with Nigerian food safety standards. We maintain high standards of hygiene and food handling practices.

**Allergen Information:**
While we make efforts to accommodate dietary requirements, we cannot guarantee that our food is completely free from allergens. Please inform us of any allergies or dietary restrictions when ordering.

**Food Handling:**
Once delivered, food safety becomes the customer's responsibility. We recommend consuming meals immediately or storing them appropriately. We are not liable for issues arising from improper storage or handling after delivery.

**Quality Concerns:**
If you experience any quality issues with your order, please contact us within 30 minutes of delivery with photographic evidence. We take food quality seriously and will investigate all complaints.`
    },
    {
      title: '8. User Conduct',
      content: `You agree not to:
• Use our services for any illegal or unauthorized purpose
• Violate any laws in your jurisdiction
• Interfere with or disrupt our services or servers
• Attempt to gain unauthorized access to our systems
• Harass, abuse, or harm our staff or delivery personnel
• Submit false or misleading information
• Use automated systems to access our services
• Resell or commercially exploit our services

Violation of these terms may result in account suspension or termination and possible legal action.`
    },
    {
      title: '9. Intellectual Property',
      content: `All content on JollofExpress platform, including but not limited to text, graphics, logos, images, software, and design, is the property of JollofExpress or its licensors and is protected by Nigerian and international copyright laws.

You may not:
• Reproduce, distribute, or create derivative works from our content
• Use our trademarks or branding without written permission
• Copy or scrape data from our platform
• Use our content for commercial purposes without authorization`
    },
    {
      title: '10. Limitation of Liability',
      content: `To the maximum extent permitted by law, JollofExpress shall not be liable for:
• Indirect, incidental, special, or consequential damages
• Loss of profits, revenue, or data
• Service interruptions or delays
• Third-party actions or content
• Food-related allergies or reactions (when allergens were not disclosed)
• Issues arising from customer-provided incorrect information

Our total liability for any claim arising from our services shall not exceed the amount paid for the specific order in question.`
    },
    {
      title: '11. Indemnification',
      content: `You agree to indemnify, defend, and hold harmless JollofExpress, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising from:
• Your use of our services
• Your violation of these terms
• Your violation of any third-party rights
• Any false or misleading information you provide`
    },
    {
      title: '12. Privacy and Data Protection',
      content: `Your use of our services is also governed by our Privacy Policy, which explains how we collect, use, and protect your personal information. By using our services, you consent to our data practices as described in our Privacy Policy.`
    },
    {
      title: '13. Third-Party Services',
      content: `Our platform may contain links to third-party websites or services (payment processors, social media, etc.). We are not responsible for the content, privacy policies, or practices of third-party sites. Your use of third-party services is at your own risk.`
    },
    {
      title: '14. Promotions and Discounts',
      content: `Promotional offers, discounts, and voucher codes are subject to specific terms and conditions:
• Offers cannot be combined unless explicitly stated
• One voucher per order unless specified
• Offers are valid for limited periods and may be withdrawn at any time
• We reserve the right to refuse redemption of vouchers suspected of fraud
• Cash alternatives are not available`
    },
    {
      title: '15. Force Majeure',
      content: `JollofExpress shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control, including but not limited to acts of God, natural disasters, war, civil unrest, government actions, strikes, power failures, or internet outages.`
    },
    {
      title: '16. Dispute Resolution',
      content: `**Informal Resolution:**
We encourage you to contact us first to resolve any disputes informally. Most concerns can be resolved quickly through our customer service team.

**Governing Law:**
These Terms and Conditions are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the exclusive jurisdiction of the courts in Anambra State, Nigeria.

**Arbitration:**
If informal resolution fails, disputes may be submitted to binding arbitration in accordance with Nigerian arbitration laws.`
    },
    {
      title: '17. Severability',
      content: `If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining terms continue in full force and effect.`
    },
    {
      title: '18. Entire Agreement',
      content: `These Terms and Conditions, together with our Privacy Policy, constitute the entire agreement between you and JollofExpress regarding the use of our services and supersede all prior agreements and understandings.`
    },
    {
      title: '19. Contact Information',
      content: `For questions about these Terms and Conditions, please contact us:

**JollofExpress**
Aroma Junction, Awka
Anambra State, Nigeria

**Email:** legal@jollofexpress.ng
**Phone:** +234 810 682 8147
**Website:** www.jollofexpress.ng

**Business Hours:**
Monday - Friday: 8:00 AM - 10:00 PM
Saturday: 9:00 AM - 11:00 PM
Sunday: 10:00 AM - 10:00 PM`
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
                <h2 className="text-2xl font-bold mb-4">Welcome to JollofExpress</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  These Terms and Conditions ("Terms") govern your use of JollofExpress's website, 
                  mobile application, and food delivery services. By accessing or using our platform, 
                  you agree to comply with and be bound by these Terms.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Please read these Terms carefully. If you do not agree with any part of these Terms, 
                  you should not use our services. We recommend printing or saving a copy of these 
                  Terms for your records.
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
                <h3 className="text-2xl font-bold mb-4">Acknowledgment</h3>
                <p className="text-muted-foreground mb-6">
                  By using JollofExpress services, you acknowledge that you have read, understood, 
                  and agree to be bound by these Terms and Conditions.
                </p>
                <p className="text-sm text-muted-foreground">
                  For questions or concerns about these Terms, please contact us at{' '}
                  <a href="mailto:legal@jollofexpress.ng" className="text-orange-600 hover:text-orange-700 font-medium">
                    legal@jollofexpress.ng
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
