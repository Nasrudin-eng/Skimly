import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Brain,
  Sparkles,
  BookOpen,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Send,
  Loader2,
  Lock,
  BookMarked
} from 'lucide-react';

const AskBrain = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const isPro = user?.tier === 'pro';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: question }]);
    setLoading(true);

    try {
      const response = await api.askBrain(question);
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: response.answer,
        relevantItems: response.relevant_items
      }]);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Ask Your Brain is a Pro feature');
      } else {
        toast.error('Failed to get answer');
      }
      setMessages(prev => prev.slice(0, -1)); // Remove user message on error
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
    { icon: MessageSquare, label: 'Ask Your Brain', path: '/ask', active: true, pro: true },
    { icon: Calendar, label: 'Weekly Digest', path: '/digest', pro: true },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  const suggestedQuestions = [
    "What do I know about productivity?",
    "Summarize my insights on technology",
    "What patterns have I noticed?",
    "What are my pending action items?"
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
      <main className="ml-64 h-screen flex flex-col">
        {/* Header */}
        <div className="p-8 pb-4">
          <h1 className="text-3xl font-light mb-2 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Ask Your Brain
          </h1>
          <p className="text-muted-foreground">Query your personal knowledge base naturally</p>
        </div>

        {!isPro ? (
          /* Pro Feature Lock */
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="max-w-md text-center border-border/50">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-light mb-2">Pro Feature</h2>
                <p className="text-muted-foreground mb-6">
                  Ask Your Brain lets you query your entire knowledge base using natural language. 
                  Upgrade to Pro to unlock this powerful feature.
                </p>
                <Button className="rounded-full" data-testid="upgrade-btn">
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Chat Interface */
          <>
            <ScrollArea ref={scrollRef} className="flex-1 px-8">
              <div className="max-w-3xl mx-auto py-4 space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
                    <p className="text-muted-foreground mb-6">
                      Ask questions about your stored knowledge
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {suggestedQuestions.map((q, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setInput(q)}
                          data-testid={`suggested-q-${i}`}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`chat-bubble ${msg.type}`} data-testid={`message-${i}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.relevantItems?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/20">
                            <p className="text-xs opacity-70 mb-2 flex items-center gap-1">
                              <BookMarked className="w-3 h-3" /> Sources
                            </p>
                            <div className="space-y-1">
                              {msg.relevantItems.map((item, j) => (
                                <div key={j} className="text-xs opacity-80">
                                  • {item.source_title || item.key_points?.[0] || 'Knowledge item'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="chat-bubble ai">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-8 pt-4 border-t border-border/40">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your brain anything..."
                  className="flex-1 rounded-full px-6"
                  disabled={loading}
                  data-testid="ask-input"
                />
                <Button 
                  type="submit" 
                  disabled={loading || !input.trim()}
                  className="rounded-full px-6"
                  data-testid="ask-submit"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AskBrain;
