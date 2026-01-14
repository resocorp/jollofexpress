'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, UserCheck, Bell, Globe } from 'lucide-react';

export default function PrivacyPage() {
  const highlights = [
    {
      icon: Shield,
      title: 'Data Protection',
      description: 'Your personal information is encrypted and securely stored'
    },
    {
      icon: Lock,
      title: 'Secure Transactions',
      description: 'All payments are processed through secure, encrypted channels'
    },
    {
      icon: Eye,
      title: 'Transparency',
      description: 'We clearly explain what data we collect and how we use it'
    },
    {
      icon: UserCheck,
      title: 'Your Rights',
      description: 'You have full control over your personal information'
    }
  ];

  const sections = [
    {
      icon: Database,
      title: '1. Information We Collect',
      content: `We collect several types of information to provide and improve our services:

**Information You Provide:**
• **Account Information:** Name, email address, phone number, delivery address
• **Payment Information:** Payment card details, billing address (processed securely through third-party payment processors)
• **Order Information:** Food preferences, delivery instructions, special requests
• **Communication Data:** Messages, feedback, customer service inquiries
• **Profile Data:** Dietary preferences, favorite items, saved addresses

**Information Collected Automatically:**
• **Device Information:** IP address, browser type, device type, operating system
• **Usage Data:** Pages visited, features used, time spent on platform, click patterns
• **Location Data:** Delivery location, GPS data (with your permission for delivery tracking)
• **Cookies and Tracking:** We use cookies and similar technologies to enhance user experience

**Information from Third Parties:**
• Payment processors (transaction verification)
• Social media platforms (if you choose to link your account)
• Analytics providers (aggregated usage statistics)`
    },
    {
      icon: UserCheck,
      title: '2. How We Use Your Information',
      content: `We use your personal information for the following purposes:

**Service Delivery:**
• Process and fulfill your food orders
• Arrange delivery to your specified location
• Send order confirmations and status updates
• Provide customer support

**Account Management:**
• Create and maintain your user account
• Authenticate your identity
• Remember your preferences and order history
• Enable saved addresses and payment methods

**Communication:**
• Send order updates and delivery notifications
• Respond to inquiries and support requests
• Send promotional offers and marketing materials (with your consent)
• Notify you of service updates or changes

**Business Operations:**
• Process payments and prevent fraud
• Analyze usage patterns to improve our services
• Conduct market research and customer surveys
• Comply with legal obligations and enforce our terms

**Platform Improvement:**
• Enhance user experience and interface
• Develop new features and services
• Personalize content and recommendations
• Monitor and improve service quality`
    },
    {
      icon: Globe,
      title: '3. How We Share Your Information',
      content: `We do not sell your personal information. We may share your data in the following circumstances:

**Service Providers:**
• Payment processors for transaction processing
• Delivery personnel (only name, phone, and delivery address for order fulfillment)
• Cloud hosting services for data storage
• Analytics providers for service improvement
• Customer service platforms for support management

**Legal Requirements:**
• When required by Nigerian law or legal process
• To protect our rights, property, or safety
• To prevent fraud or illegal activities
• In response to lawful requests from authorities

**Business Transfers:**
• In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity

**With Your Consent:**
• When you explicitly authorize us to share information
• For purposes not listed here, we will seek your permission

**Important:** We never share your payment card details with delivery personnel or third parties except secure payment processors.`
    },
    {
      icon: Lock,
      title: '4. Data Security',
      content: `We implement industry-standard security measures to protect your information:

**Technical Safeguards:**
• SSL/TLS encryption for data transmission
• Encrypted storage of sensitive information
• Secure payment processing through PCI-DSS compliant processors
• Regular security audits and vulnerability assessments
• Firewalls and intrusion detection systems

**Organizational Measures:**
• Access controls limiting employee access to personal data
• Staff training on data protection and privacy
• Confidentiality agreements with employees and contractors
• Regular security policy reviews and updates

**Account Security:**
• Secure password requirements
• Account activity monitoring
• Automatic logout after periods of inactivity
• Optional two-factor authentication

**Important Notice:**
While we implement robust security measures, no system is completely secure. We cannot guarantee absolute security of your data transmitted over the internet. You are responsible for maintaining the confidentiality of your account credentials.`
    },
    {
      icon: Eye,
      title: '5. Your Privacy Rights',
      content: `Under Nigerian data protection laws, you have the following rights:

**Access Rights:**
• Request a copy of your personal information we hold
• Ask about how your data is being used
• Obtain information about data sharing practices

**Correction Rights:**
• Update or correct inaccurate personal information
• Complete incomplete data in your profile

**Deletion Rights:**
• Request deletion of your personal information (subject to legal obligations)
• Close your account and remove associated data
• Withdraw consent for data processing

**Objection Rights:**
• Object to processing of your personal information
• Opt-out of marketing communications
• Refuse automated decision-making or profiling

**Data Portability:**
• Receive your data in a structured, commonly used format
• Request transfer of your data to another service provider

**Restriction Rights:**
• Request temporary restriction of data processing
• Limit how we use your information

**To Exercise Your Rights:**
Contact us at privacy@jollofexpress.ng with your request. We will respond within 30 days and may require identity verification for security purposes.`
    },
    {
      icon: Bell,
      title: '6. Cookies and Tracking Technologies',
      content: `We use cookies and similar technologies to enhance your experience:

**Types of Cookies We Use:**

**Essential Cookies:**
• Required for platform functionality
• Enable account access and order processing
• Maintain shopping cart contents
• Cannot be disabled without affecting service

**Performance Cookies:**
• Analyze how visitors use our platform
• Identify and fix technical issues
• Measure service performance
• Aggregated and anonymous data

**Functionality Cookies:**
• Remember your preferences and settings
• Provide personalized features
• Enable saved addresses and payment methods
• Enhance user experience

**Marketing Cookies:**
• Track effectiveness of advertising campaigns
• Deliver relevant promotional content
• Measure engagement with marketing materials
• Used only with your consent

**Managing Cookies:**
You can control cookies through your browser settings. Note that disabling essential cookies may affect platform functionality. Third-party cookies are subject to their respective privacy policies.`
    },
    {
      title: '7. Data Retention',
      content: `We retain your personal information only as long as necessary:

**Active Accounts:**
• Data retained while your account is active
• Order history maintained for service improvement and support

**Closed Accounts:**
• Most data deleted within 30 days of account closure
• Some information retained for legal compliance (tax records, transaction history)
• Anonymized data may be retained for analytics

**Retention Periods:**
• Order information: 7 years (tax and accounting requirements)
• Payment data: As required by payment processors and regulations
• Marketing data: Until you opt-out or object
• Support communications: 3 years for quality assurance
• Legal data: As required by applicable laws

You may request earlier deletion of your data, subject to our legal obligations.`
    },
    {
      title: '8. Children\'s Privacy',
      content: `JollofExpress services are not intended for individuals under 18 years of age:

• We do not knowingly collect information from children under 18
• Account registration requires users to be 18 or older
• Parents/guardians must create accounts for minors
• If we discover we've collected data from a child, we will delete it promptly

If you believe we have inadvertently collected information from a minor, please contact us immediately at privacy@jollofexpress.ng.`
    },
    {
      title: '9. International Data Transfers',
      content: `Your information is primarily stored and processed in Nigeria. However, some service providers may process data internationally:

• We ensure adequate safeguards for international transfers
• Data processing agreements comply with Nigerian data protection standards
• We work only with reputable international service providers
• Your data rights remain protected regardless of processing location

If you have concerns about international data transfers, please contact us.`
    },
    {
      title: '10. Third-Party Links',
      content: `Our platform may contain links to third-party websites, services, or social media:

• We are not responsible for third-party privacy practices
• External websites have their own privacy policies
• We recommend reviewing privacy policies before sharing information
• Links do not imply endorsement or partnership

Examples of third-party services:
• Payment processors (Paystack, Flutterwave)
• Social media platforms (Facebook, Instagram)
• Analytics services (Google Analytics)
• Customer service tools`
    },
    {
      title: '11. Marketing Communications',
      content: `We may send you marketing communications with your consent:

**What We May Send:**
• Promotional offers and discounts
• New menu items and special deals
• Company updates and news
• Surveys and feedback requests
• Event announcements

**Your Control:**
• Opt-out at any time via email unsubscribe link
• Manage preferences in your account settings
• Contact us to update communication preferences
• Transactional emails (order confirmations) cannot be opted out

**Our Commitment:**
• We will not spam you with excessive emails
• Your contact information won't be sold to marketers
• Communications will be relevant to our services
• Easy opt-out in every marketing email`
    },
    {
      title: '12. California Privacy Rights (CCPA)',
      content: `While JollofExpress primarily operates in Nigeria, we respect privacy rights of all users:

If you are a California resident, you have additional rights under CCPA:
• Right to know what personal information is collected
• Right to know if your information is sold or disclosed
• Right to opt-out of sale of personal information
• Right to deletion of personal information
• Right to non-discrimination for exercising your rights

Note: We do not sell personal information to third parties.`
    },
    {
      title: '13. European Privacy Rights (GDPR)',
      content: `For users in the European Union:

We comply with GDPR principles:
• Lawful, fair, and transparent processing
• Purpose limitation and data minimization
• Accuracy and storage limitation
• Integrity and confidentiality

**Legal Basis for Processing:**
• Contract fulfillment (order processing)
• Legitimate interests (service improvement)
• Legal compliance (tax, fraud prevention)
• Your consent (marketing communications)

**Your GDPR Rights:**
All rights listed in Section 5 apply, plus right to lodge a complaint with your supervisory authority.`
    },
    {
      title: '14. Changes to Privacy Policy',
      content: `We may update this Privacy Policy periodically:

**When We Update:**
• To reflect changes in our services
• To comply with new legal requirements
• To improve transparency and clarity
• To address new privacy concerns

**How We Notify You:**
• Email notification for significant changes
• Notice on our website and app
• Updated "Last Modified" date at top of policy
• Opportunity to review changes before they take effect

**Your Continued Use:**
Continued use of our services after changes constitutes acceptance of the updated policy. If you disagree with changes, please discontinue use and contact us about account closure.`
    },
    {
      title: '15. Contact Information',
      content: `For privacy-related questions, concerns, or requests:

**Data Protection Officer**
JollofExpress
Aroma Junction, Awka
Anambra State, Nigeria

**Email:** privacy@jollofexpress.ng
**General Inquiries:** hello@jollofexpress.ng
**Phone:** +234 810 682 8147

**Response Time:**
We aim to respond to privacy requests within 30 days. Complex requests may require additional time, and we will keep you informed of any delays.

**Complaints:**
If you're unsatisfied with our response, you may lodge a complaint with:
Nigeria Data Protection Bureau (NDPB)
Email: info@ndpb.gov.ng
Website: www.ndpb.gov.ng`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
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
              Your privacy is important to us. Learn how we collect, use, and protect your personal information.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Key Highlights */}
        <div className="max-w-6xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold mb-4">Our Privacy Commitment</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              We are committed to protecting your privacy and ensuring transparency in how we handle your data.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                        <Icon className="h-7 w-7 text-blue-600" />
                      </div>
                      <h3 className="font-bold mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Last Updated */}
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Bell className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Last Updated: October 22, 2025</h3>
                  <p className="text-blue-800 text-sm">
                    This Privacy Policy was last updated on October 22, 2025. We may update this policy 
                    from time to time, and we will notify you of any significant changes.
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
                  JollofExpress ("we," "our," or "us") is committed to protecting your privacy and 
                  ensuring the security of your personal information. This Privacy Policy explains how 
                  we collect, use, disclose, and safeguard your data when you use our website, mobile 
                  application, and food delivery services.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We comply with the Nigeria Data Protection Regulation (NDPR) 2019 and other applicable 
                  data protection laws. By using our services, you consent to the data practices described 
                  in this policy.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Please read this Privacy Policy carefully. If you do not agree with our policies and 
                  practices, please do not use our services. By accessing or using our platform, you 
                  acknowledge that you have read and understood this Privacy Policy.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Privacy Sections */}
          <div className="space-y-6">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-8">
                      <div className="flex items-start gap-4 mb-4">
                        {Icon && (
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-6 w-6 text-blue-600" />
                          </div>
                        )}
                        <h2 className="text-2xl font-bold text-blue-900 flex-1">
                          {section.title}
                        </h2>
                      </div>
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
              );
            })}
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
                  We are committed to maintaining the trust you place in us. If you have any questions 
                  or concerns about your privacy, please don't hesitate to reach out.
                </p>
                <div className="text-center">
                  <a 
                    href="mailto:privacy@jollofexpress.ng"
                    className="inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Contact Privacy Team
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
