'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  MessageCircle,
  Send,
  Facebook,
  Instagram,
  Headphones
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Visit Us',
      details: [
        'JollofExpress Headquarters',
        'Aroma Junction, Awka',
        'Anambra State, Nigeria'
      ],
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: Phone,
      title: 'Call Us',
      details: [
        '+234 810 682 8147',
        '+234 810 682 8147',
        'Mon-Sun: 8am - 10pm'
      ],
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      action: 'tel:+2348106828147'
    },
    {
      icon: Mail,
      title: 'Email Us',
      details: [
        'hello@jollofexpress.ng',
        'support@jollofexpress.ng',
        'We respond within 24 hours'
      ],
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      action: 'mailto:hello@jollofexpress.ng'
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
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Send className="h-7 w-7 text-orange-600" />
                  Send Us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        required
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+234 800 000 0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        required
                        placeholder="Order inquiry"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      required
                      rows={6}
                      placeholder="Tell us how we can help you..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Business Hours */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-6 w-6 text-orange-600" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businessHours.map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <span className="font-medium text-sm">{schedule.day}</span>
                      <span className="text-sm text-muted-foreground">{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <Headphones className="h-6 w-6 text-orange-600" />
                  Need Immediate Help?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  For urgent matters, call or WhatsApp us directly. Our team is ready to assist you.
                </p>
                <div className="space-y-2">
                  <a href="tel:+2348106828147">
                    <Button variant="outline" className="w-full">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Now
                    </Button>
                  </a>
                  <a href="https://wa.me/2348106828147" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp Us
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contactInfo.map((info, index) => {
            const Icon = info.icon;
            return (
              <motion.div
                key={info.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${info.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`h-6 w-6 ${info.color}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-3">{info.title}</h3>
                    {info.details.map((detail, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground mb-1">
                        {detail}
                      </p>
                    ))}
                    {info.action && (
                      <a 
                        href={info.action}
                        target={info.action.startsWith('http') ? '_blank' : undefined}
                        rel={info.action.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium mt-2 inline-block"
                      >
                        Contact Now →
                      </a>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Social Media Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Connect With Us on Social Media</h3>
              <p className="text-muted-foreground mb-6">
                Follow us for daily specials, behind-the-scenes content, and exclusive offers!
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href="https://facebook.com/jollofexpress" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 rounded-full bg-white border-2 border-blue-200 hover:border-blue-600 hover:scale-110 transition-all duration-200"
                >
                  <Facebook className="h-6 w-6 text-blue-600" />
                </a>
                <a 
                  href="https://instagram.com/jollofexpress" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 rounded-full bg-white border-2 border-pink-200 hover:border-pink-600 hover:scale-110 transition-all duration-200"
                >
                  <Instagram className="h-6 w-6 text-pink-600" />
                </a>
                <a 
                  href="https://wa.me/2348106828147" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-3 rounded-full bg-white border-2 border-green-200 hover:border-green-600 hover:scale-110 transition-all duration-200"
                >
                  <MessageCircle className="h-6 w-6 text-green-600" />
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
