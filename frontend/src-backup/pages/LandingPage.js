import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowRight, Sparkles, Shield, TrendingUp, Brain, Moon, Sun } from 'lucide-react';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = () => navigate('/sign-in');
  const handleSignup = () => navigate('/sign-up');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const features = [
    {
      icon: TrendingUp,
      title: 'Smart Finance Tracking',
      description: 'Track income, expenses, and investments with real-time insights and beautiful charts.',
      link: '/sign-up'
    },
    {
      icon: Brain,
      title: 'AI Financial Q&A',
      description: 'Ask AI about SIP, taxes, investments, insurance, retirement, and debt management.',
      link: '/sign-up',
      highlight: true
    },
    {
      icon: Shield,
      title: 'GST & Tax Management',
      description: 'Manage invoices, calculate GST, and get tax summaries designed for Indian businesses.',
      link: '/sign-up'
    },
    {
      icon: Sparkles,
      title: 'Market Intelligence',
      description: 'Monitor crypto and stock markets with live data, trends, and analytics in one place.',
      link: '/sign-up'
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />

      {/* Header */}
      <header className="relative z-10 border-b border-border glass-strong">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">TradeTrack Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={toggleTheme} variant="ghost" size="icon" className="rounded-full">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="outline" onClick={handleLogin} className="rounded-full px-6">
              Sign In
            </Button>
            <Button onClick={handleSignup} className="rounded-full px-6">
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-4 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Powered by AI & Real-time Data</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            Your All-in-One
            <span className="block bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Financial Command Center
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Track expenses, manage GST, analyze markets, and get AI-powered financial insights—all designed for Indian users.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={handleSignup} size="lg" className="rounded-full px-8 py-6 text-lg shadow-lg">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-8 py-6 text-lg glass-strong">
              Learn More
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-20 max-w-6xl mx-auto"
        >
          <div className="rounded-3xl glass-strong p-2 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1754738381739-5efb94a4525b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGdsYXNzbW9ycGhpc20lMjBnZW9tZXRyaWMlMjBzaGFwZXMlMjBuZW9uJTIwYmx1ZSUyMHB1cnBsZXxlbnwwfHx8fDE3NzQwMDU3OTN8MA&ixlib=rb-4.1.0&q=85"
              alt="Dashboard Preview"
              className="w-full h-auto rounded-2xl"
            />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Production-ready features built specifically for Indian users and businesses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`p-6 rounded-2xl glass hover-lift cursor-pointer ${feature.highlight ? 'border-2 border-primary' : ''}`}
                  onClick={() => navigate(feature.link)}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {feature.highlight && (
                    <div className="mb-2">
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary text-primary-foreground">NEW</span>
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-3xl glass-strong p-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Ready to Take Control?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of users managing their finances smarter with TradeTrack Pro.
            </p>
            <Button onClick={handleSignup} size="lg" className="rounded-full px-8 py-6 text-lg shadow-lg">
              Start Free Today
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2026 TradeTrack Pro. Built for Indian users with ❤️</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;