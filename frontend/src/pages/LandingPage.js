import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  Calendar,
  ArrowRight,
  Check,
  Zap,
  Target,
  Lightbulb
} from 'lucide-react';

const LandingPage = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: Sparkles,
      title: 'Instant Understanding',
      description: 'Highlight any text. Get structured insights in seconds with key points, implications, and action items.'
    },
    {
      icon: BookOpen,
      title: 'Personal Knowledge Base',
      description: 'Every insight auto-saved and searchable. Build your second brain effortlessly over time.'
    },
    {
      icon: MessageSquare,
      title: 'Ask Your Brain',
      description: 'Query your accumulated knowledge naturally. "What do I know about X?" — instant answers.'
    },
    {
      icon: Calendar,
      title: 'Weekly Intelligence',
      description: 'Automated digests surface patterns, connections, and forgotten insights from your knowledge.'
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        '10 analyses per day',
        'Basic structured output',
        'Chrome extension',
        '7-day history'
      ],
      cta: 'Get Started',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$12',
      period: '/month',
      features: [
        'Unlimited analyses',
        'Full knowledge base',
        'Ask Your Brain mode',
        'Weekly digests',
        'Priority support',
        'Export anytime'
      ],
      cta: 'Start Pro Trial',
      highlighted: true
    }
  ];

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <Brain className="w-8 h-8 text-primary" />
            <span className="text-xl font-semibold">Skimly</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button className="rounded-full" data-testid="nav-dashboard-btn">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth" data-testid="nav-signin-btn">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth" data-testid="nav-getstarted-btn">
                  <Button className="rounded-full">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="stagger-children">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                AI-Powered Knowledge Layer
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.1] mb-6">
                Everything you read makes you{' '}
                <span className="italic text-primary">smarter forever</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl">
                Skimly transforms any digital content into structured, actionable knowledge. 
                Build your personal second brain without the cognitive overhead.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/auth" data-testid="hero-cta-btn">
                  <Button size="lg" className="rounded-full px-8 py-6 text-base">
                    Start for Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="rounded-full px-8 py-6 text-base" data-testid="hero-demo-btn">
                  Watch Demo
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-destructive/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide font-medium">Key Points</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2"><Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" /> Companies using AI see 40% productivity gains</li>
                      <li className="flex gap-2"><Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" /> Implementation requires cultural shift</li>
                    </ul>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide font-medium">Actions</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2"><Target className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Audit current workflow for AI opportunities</li>
                      <li className="flex gap-2"><Target className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Schedule team training session</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-3xl"></div>
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
              Your cognitive <span className="italic">upgrade</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Reduce mental overhead. Make knowledge compound. Think clearer.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="feature-card"
                data-testid={`feature-card-${index}`}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
              Three steps to <span className="italic">clarity</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '01', title: 'Highlight', desc: 'Select any text on any webpage. One click or hotkey.' },
              { num: '02', title: 'Understand', desc: 'AI extracts key points, implications, actions, and questions.' },
              { num: '03', title: 'Remember', desc: 'Auto-saved to your searchable knowledge base. Query anytime.' }
            ].map((step, index) => (
              <div key={index} className="text-center" data-testid={`step-${index}`}>
                <div className="text-6xl font-light text-primary/20 mb-4">{step.num}</div>
                <h3 className="text-2xl font-medium mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
              Simple, transparent <span className="italic">pricing</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`bg-card border rounded-2xl p-8 ${plan.highlighted ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
                data-testid={`pricing-${plan.name.toLowerCase()}`}
              >
                {plan.highlighted && (
                  <div className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Most Popular</div>
                )}
                <h3 className="text-2xl font-medium mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-light">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2 text-sm">
                      <Check className="w-5 h-5 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button 
                    className={`w-full rounded-full ${plan.highlighted ? '' : 'variant-outline'}`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    data-testid={`pricing-${plan.name.toLowerCase()}-cta`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight mb-6">
            Ready to think <span className="italic">better</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands who've upgraded their cognitive toolkit. Start building your second brain today.
          </p>
          <Link to="/auth" data-testid="bottom-cta-btn">
            <Button size="lg" className="rounded-full px-10 py-6 text-base">
              Get Started for Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <span className="font-semibold">Skimly</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Skimly. Everything you read makes you smarter forever.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
