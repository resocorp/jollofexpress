'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  UtensilsCrossed, 
  Heart, 
  Clock, 
  Award, 
  Users, 
  Truck,
  ChefHat,
  Sparkles
} from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: 'Authentic Flavors',
      description: 'We preserve traditional Nigerian recipes passed down through generations, ensuring every dish tastes like home.',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: Award,
      title: 'Quality Ingredients',
      description: 'Fresh, locally-sourced ingredients prepared daily to guarantee the highest quality in every meal.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      icon: Clock,
      title: 'Fast Delivery',
      description: 'Hot, fresh meals delivered to your door in 30 minutes or less. Your satisfaction is our priority.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Users,
      title: 'Community First',
      description: 'We\'re proud to serve Awka and surrounding areas, supporting local farmers and creating jobs.',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Happy Customers' },
    { number: '50+', label: 'Menu Items' },
    { number: '30 min', label: 'Average Delivery' },
    { number: '4.8★', label: 'Customer Rating' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 text-white py-20">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto text-center"
          >
            <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 mr-1" />
              Since 2020
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              About JollofExpress
            </h1>
            <p className="text-xl md:text-2xl text-orange-50 leading-relaxed">
              Bringing the authentic taste of Nigerian cuisine to your doorstep, 
              one delicious meal at a time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <ChefHat className="h-8 w-8 text-orange-600" />
                <h2 className="text-4xl font-bold">Our Story</h2>
              </div>
              
              <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
                <p className="text-lg leading-relaxed">
                  JollofExpress was born from a simple idea: to make authentic Nigerian cuisine 
                  accessible to everyone in Awka and beyond. Founded in 2020 by a group of food 
                  enthusiasts and culinary experts, we set out to solve a common problem – the 
                  lack of quality, convenient Nigerian food delivery options.
                </p>
                
                <p className="text-lg leading-relaxed">
                  What started as a small kitchen operation has grown into a beloved local brand, 
                  serving thousands of customers every month. Our recipes come from family traditions, 
                  refined over generations, and prepared by skilled chefs who understand that food 
                  is more than sustenance – it's culture, comfort, and community.
                </p>
                
                <p className="text-lg leading-relaxed">
                  Today, we're proud to offer an extensive menu of traditional favorites – from 
                  perfectly seasoned Jollof rice to rich Egusi soup, crispy Suya to tender Asun. 
                  Every dish is prepared fresh, using locally-sourced ingredients, and delivered 
                  hot to your door within 30 minutes.
                </p>
                
                <p className="text-lg leading-relaxed">
                  But we're more than just a food delivery service. We're committed to supporting 
                  our local community by partnering with farmers, creating employment opportunities, 
                  and maintaining the highest standards of food safety and quality. When you order 
                  from JollofExpress, you're not just getting a meal – you're supporting local 
                  business and preserving Nigerian culinary heritage.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do, from sourcing ingredients 
              to delivering your meal.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full border-2 hover:border-orange-200 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className={`w-14 h-14 rounded-2xl ${value.bgColor} flex items-center justify-center mb-4`}>
                        <Icon className={`h-7 w-7 ${value.color}`} />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">{value.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center mb-4">
                    <UtensilsCrossed className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">Our Mission</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    To deliver authentic, high-quality Nigerian cuisine with exceptional 
                    service, making delicious home-cooked meals accessible to everyone 
                    in our community while supporting local producers and creating jobs.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4">
                    <Truck className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">Our Vision</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    To become Nigeria's most trusted food delivery brand, known for 
                    preserving culinary traditions while embracing innovation, and 
                    expanding our reach to serve communities across the nation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-orange-600 to-red-600 text-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-4xl font-bold mb-4">Experience the Difference</h2>
            <p className="text-xl text-orange-50 mb-8">
              Join thousands of satisfied customers who trust us for their daily meals.
            </p>
            <a
              href="/menu"
              className="inline-block bg-white text-orange-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-orange-50 transition-colors shadow-lg"
            >
              Order Now
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
