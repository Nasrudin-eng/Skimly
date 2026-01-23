import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Brain,
  Sparkles,
  BookOpen,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Lock,
  Lightbulb,
  Target,
  TrendingUp
} from 'lucide-react';

const Digest = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);

  const isPro = user?.tier === 'pro';

  useEffect(() => {
    if (isPro) {
      loadDigest();
    } else {
      setLoading(false);
    }
  }, [isPro]);

  const loadDigest = async () => {
    try {
      const data = await api.getDigest();
      setDigest(data);
    } catch (error) {
      if (error.response?.status !== 403) {
        toast.error('Failed to load digest');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { icon: Sparkles, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Knowledge Base', path: '/knowledge' },
    { icon: MessageSquare, label: 'Ask Your Brain', path: '/ask', pro: true },
    { icon: Calendar, label: 'Weekly Digest', path: '/digest', active: true, pro: true },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border/40 p-4 flex flex-col z-40">
        <Link to="/" className="flex items-center gap-2 mb-8 px-2" data-testid="sidebar-logo">
          <Brain className="w-8 h-8 text-primary" />
          <span className="text-xl font-semibold">Skimly</span>
        </Link>
        
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${item.active ? 'active' : ''}`}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.pro && user?.tier === 'free' && (
                <Badge variant="outline" className="ml-auto text-xs">Pro</Badge>
              )}
            </Link>
          ))}
        </nav>
        
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" />
              ) : (
                <span className="text-primary font-medium">{user?.name?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.tier} plan</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-light mb-2 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              Weekly Intelligence Digest
            </h1>
            <p className="text-muted-foreground">Your personalized summary of insights and patterns</p>
          </div>

          {!isPro ? (
            /* Pro Feature Lock */
            <Card className="max-w-md mx-auto text-center border-border/50">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-light mb-2">Pro Feature</h2>
                <p className="text-muted-foreground mb-6">
                  Weekly Digests surface patterns, connections, and forgotten insights from your knowledge base. 
                  Upgrade to Pro to receive automated intelligence reports.
                </p>
                <Button className="rounded-full" data-testid="upgrade-btn">
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="space-y-6">
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-48 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6" data-testid="digest-content">
              {/* Summary Card */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-xl font-medium flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    {digest?.period || 'This Week'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">{digest?.summary}</p>
                  <div className="mt-4 flex gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 flex-1 text-center">
                      <p className="text-3xl font-light">{digest?.item_count || 0}</p>
                      <p className="text-sm text-muted-foreground">Items Captured</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Insights */}
              {digest?.top_insights?.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-xl font-medium flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-accent" />
                      Top Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {digest.top_insights.map((insight, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Pending Actions */}
              {digest?.pending_actions?.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-xl font-medium flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Pending Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {digest.pending_actions.map((action, i) => (
                        <li key={i} className="flex gap-2 items-center text-foreground/90">
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!digest?.top_insights?.length && !digest?.pending_actions?.length && (
                <Card className="border-border/50 text-center">
                  <CardContent className="p-8">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No digest data yet. Keep capturing knowledge throughout the week!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Digest;
