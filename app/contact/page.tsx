'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  MessageCircle,
  Facebook,
  Instagram
} from 'lucide-react';

export default function ContactPage() {
  const contactInfo = [
    {
      icon: MapPin,
      title: 'Visit Us',
      details: [
        'Ur\' Shawarma Express',
        'Aroma Junction, Awka',
        'Anambra State, Nigeria'
      ],
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      details: [
        'Chat with us instantly',
        '+234 810 682 8147',
        'Available 8am - 10pm'
      ],
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: 'https://wa.me/2348106828147'
    }
  ];

  const businessHours = [
    { day: 'Monday - Friday', hours: '8:00 AM - 10:00 PM' },
    { day: 'Saturday', hours: '9:00 AM - 11:00 PM' },
    { day: 'Sunday', hours: '10:00 AM - 10:00 PM' },
    { day: 'Public Holidays', hours: '10:00 AM - 8:00 PM' }
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
            <h1 className="text-5xl md:text-6xl font-bold mb-6">Get In Touch</h1>
            <p className="text-xl text-orange-50">
              Have questions? Reach out to us on WhatsApp or follow us on social media!
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* Main WhatsApp CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-green-900">Chat With Us on WhatsApp</h2>
              <p className="text-green-700 mb-6 text-lg">
                The fastest way to reach us! Get instant responses for orders, inquiries, and support.
              </p>
              <a 
                href="https://wa.me/2348106828147" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6">
                  <MessageCircle className="h-6 w-6 mr-3" />
                  Message Us on WhatsApp
                </Button>
              </a>
              <p className="text-sm text-green-600 mt-4">+234 810 682 8147 • Available 8am - 10pm</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Business Hours */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-6 w-6 text-orange-600" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businessHours.map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b last:border-b-0">
                      <span className="font-medium">{schedule.day}</span>
                      <span className="text-muted-foreground">{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Location */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-red-600" />
                  Our Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold text-lg">Ur' Shawarma Express</p>
                  <p className="text-muted-foreground">Aroma Junction, Awka</p>
                  <p className="text-muted-foreground">Anambra State, Nigeria</p>
                </div>
                <div className="mt-6">
                  <a 
                    href="https://myshawarma.express/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Visit our website →
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Social Media Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Connect With Us on Social Media</h3>
              <p className="text-muted-foreground mb-6">
                Follow us for daily specials, behind-the-scenes content, and exclusive offers!
              </p>
              <div className="flex justify-center gap-6">
                <a 
                  href="https://facebook.com/urshawarmaexpress" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 rounded-full bg-white border-2 border-blue-200 hover:border-blue-600 hover:scale-110 transition-all duration-200"
                >
                  <Facebook className="h-8 w-8 text-blue-600" />
                </a>
                <a 
                  href="https://instagram.com/urshawarmaexpress" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 rounded-full bg-white border-2 border-pink-200 hover:border-pink-600 hover:scale-110 transition-all duration-200"
                >
                  <Instagram className="h-8 w-8 text-pink-600" />
                </a>
                <a 
                  href="https://wa.me/2348106828147" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 rounded-full bg-white border-2 border-green-200 hover:border-green-600 hover:scale-110 transition-all duration-200"
                >
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
