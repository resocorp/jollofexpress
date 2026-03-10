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
  Loader2
} from 'lucide-react';
import { useRestaurantStatus } from '@/hooks/use-settings';

// TikTok icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function ContactPage() {
  const { data: status, isLoading: statusLoading } = useRestaurantStatus();

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
              Have questions? Reach out to us on WhatsApp or follow us on TikTok!
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
              <p className="text-sm text-green-600 mt-4">+234 810 682 8147</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Business Hours - from admin settings */}
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
                {statusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : status?.hours?.all ? (
                  <div className="space-y-3">
                    {Object.entries(status.hours.all).map(([day, hours]) => (
                      <div key={day} className="flex justify-between items-center py-3 border-b last:border-b-0">
                        <span className="font-medium">{DAY_LABELS[day] || day}</span>
                        <span className="text-muted-foreground">{hours as string}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Hours not available. Please contact us on WhatsApp.</p>
                )}
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
                  <p className="font-semibold text-lg">myshawarma.express</p>
                  <p className="text-muted-foreground">Solution Arena, Abakaliki Street, Awka.</p>
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

        {/* Social Media Section - TikTok only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Follow Us on TikTok</h3>
              <p className="text-muted-foreground mb-6">
                Follow us for daily specials, behind-the-scenes content, and exclusive offers!
              </p>
              <div className="flex justify-center gap-6">
                <a 
                  href="https://tiktok.com/@myshawarmaexpress" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 rounded-full bg-white border-2 border-gray-200 hover:border-black hover:scale-110 transition-all duration-200"
                >
                  <TikTokIcon className="h-8 w-8" />
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
