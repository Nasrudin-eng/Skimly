import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  Save,
  Lightbulb,
  Target,
  HelpCircle,
  Users,
  TrendingUp,
  Loader2,
  ChevronRight,
  RefreshCw,
  Compass,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Analyze form
  const [textToAnalyze, setTextToAnalyze] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, historyData, recsData] = await Promise.all([
        api.getStats(),
        api.getHistory({ limit: 5 })
      ]);
      setStats(statsData);
      setRecentItems(historyData.items);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!textToAnalyze.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }
    
    setAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const result = await api.analyze(textToAnalyze);
      setAnalysisResult(result);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analysisResult) return;
    
    setSaving(true);
    try {
      await api.save({
        original_text: textToAnalyze,
        analysis: analysisResult.analysis,
        source_url: analysisResult.source_url,
        source_title: analysisResult.source_title,
        tags: []
      });
      toast.success('Knowledge saved!');
      setTextToAnalyze('');
      setAnalysisResult(null);
      loadDashboardData(); // Refresh stats
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { icon: Sparkles, label: 'Dashboard', path: '/dashboard', active: true },
    { icon: BookOpen, label: 'Knowledge Base', path: '/knowledge' },
    { icon: MessageSquare, label: 'Ask Your Brain', path: '/ask', pro: true },
    { icon: Calendar, label: 'Weekly Digest', path: '/digest', pro: true },
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
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-light mb-2">
              Welcome back, <span className="italic">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-muted-foreground">Ready to make today's reading count?</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="border-border/50" data-testid="stat-total">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Knowledge</p>
                    <p className="text-2xl font-light">{stats?.total_items || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50" data-testid="stat-today">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Today</p>
                    <p className="text-2xl font-light">{stats?.today_count || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50" data-testid="stat-week">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">This Week</p>
                    <p className="text-2xl font-light">{stats?.week_count || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50" data-testid="stat-remaining">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Remaining Today</p>
                    <p className="text-2xl font-light">
                      {stats?.remaining_today !== null ? stats?.remaining_today : '∞'}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Analyze */}
          <Card className="border-border/50 mb-8" data-testid="analyze-section">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Quick Analyze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste any text here to extract insights..."
                value={textToAnalyze}
                onChange={(e) => setTextToAnalyze(e.target.value)}
                className="min-h-[120px] mb-4 resize-none"
                data-testid="analyze-textarea"
              />
              <div className="flex gap-3">
                <Button 
                  onClick={handleAnalyze} 
                  disabled={analyzing || !textToAnalyze.trim()}
                  className="rounded-full"
                  data-testid="analyze-btn"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
                {analysisResult && (
                  <Button 
                    onClick={handleSave}
                    disabled={saving}
                    variant="outline"
                    className="rounded-full"
                    data-testid="save-btn"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save to Knowledge Base
                  </Button>
                )}
              </div>

              {/* Analysis Result */}
              {analysisResult && (
                <div className="mt-6 space-y-4 animate-fade-in" data-testid="analysis-result">
                  <div className="analysis-section">
                    <h4><Lightbulb className="inline w-4 h-4 mr-1" /> Key Points</h4>
                    <ul>
                      {analysisResult.analysis.key_points.map((point, i) => (
                        <li key={i}>• {point}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="analysis-section">
                    <h4><TrendingUp className="inline w-4 h-4 mr-1" /> Implications</h4>
                    <ul>
                      {analysisResult.analysis.implications.map((imp, i) => (
                        <li key={i}>• {imp}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="analysis-section">
                    <h4><Target className="inline w-4 h-4 mr-1" /> Actions</h4>
                    <ul>
                      {analysisResult.analysis.actions.map((action, i) => (
                        <li key={i}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="analysis-section">
                    <h4><HelpCircle className="inline w-4 h-4 mr-1" /> Questions</h4>
                    <ul>
                      {analysisResult.analysis.questions.map((q, i) => (
                        <li key={i}>• {q}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="analysis-section">
                    <h4><Users className="inline w-4 h-4 mr-1" /> Personal Relevance</h4>
                    <ul>
                      {analysisResult.analysis.personal_relevance.map((rel, i) => (
                        <li key={i}>• {rel}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Knowledge */}
          <Card className="border-border/50" data-testid="recent-section">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-medium flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Recent Knowledge
              </CardTitle>
              <Link to="/knowledge">
                <Button variant="ghost" size="sm" data-testid="view-all-btn">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-4 bg-muted/30 rounded-lg">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : recentItems.length === 0 ? (
                <div className="empty-state">
                  <BookOpen className="empty-state-icon" />
                  <p className="text-muted-foreground">No knowledge captured yet. Start analyzing!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentItems.map((item) => (
                    <Link 
                      key={item.item_id} 
                      to={`/knowledge/${item.item_id}`}
                      className="knowledge-card block"
                      data-testid={`recent-item-${item.item_id}`}
                    >
                      <p className="text-sm line-clamp-2 mb-2">{item.original_text}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        {item.tags?.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{item.tags.slice(0, 2).join(', ')}</span>
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
