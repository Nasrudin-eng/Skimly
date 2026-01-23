import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Brain,
  Sparkles,
  BookOpen,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  User,
  Target,
  BookMarked,
  Lightbulb,
  Plus,
  X,
  Loader2,
  Crown
} from 'lucide-react';

const SettingsPage = () => {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState(user?.name || '');
  const [interests, setInterests] = useState(user?.interests || []);
  const [goals, setGoals] = useState(user?.goals || []);
  const [projects, setProjects] = useState(user?.projects || []);
  const [learningThemes, setLearningThemes] = useState(user?.learning_themes || []);
  
  const [newInterest, setNewInterest] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newTheme, setNewTheme] = useState('');
  
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name,
        interests,
        goals,
        projects,
        learning_themes: learningThemes
      });
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (list, setList, value, setValue) => {
    if (value.trim() && !list.includes(value.trim())) {
      setList([...list, value.trim()]);
      setValue('');
    }
  };

  const removeItem = (list, setList, item) => {
    setList(list.filter(i => i !== item));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { icon: Sparkles, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Knowledge Base', path: '/knowledge' },
    { icon: MessageSquare, label: 'Ask Your Brain', path: '/ask', pro: true },
    { icon: Calendar, label: 'Weekly Digest', path: '/digest', pro: true },
    { icon: Settings, label: 'Settings', path: '/settings', active: true }
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
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-light mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground">Personalize Skimly to your interests and goals</p>
          </div>

          {/* Plan Card */}
          <Card className="border-border/50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user?.tier === 'pro' ? 'bg-accent/20' : 'bg-muted'}`}>
                    <Crown className={`w-6 h-6 ${user?.tier === 'pro' ? 'text-accent' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium capitalize">{user?.tier} Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.tier === 'pro' 
                        ? 'Unlimited access to all features' 
                        : '10 analyses per day'}
                    </p>
                  </div>
                </div>
                {user?.tier === 'free' && (
                  <Button className="rounded-full" data-testid="upgrade-btn">
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card className="border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile
              </CardTitle>
              <CardDescription>Your basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                  data-testid="name-input"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="mt-1 bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Intelligence Profile */}
          <Card className="border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="text-xl font-medium flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent" />
                Intelligence Profile
              </CardTitle>
              <CardDescription>
                Help Skimly personalize insights based on your context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interests */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" /> Interests
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="gap-1">
                      {interest}
                      <button onClick={() => removeItem(interests, setInterests, interest)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an interest..."
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem(interests, setInterests, newInterest, setNewInterest)}
                    data-testid="interest-input"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => addItem(interests, setInterests, newInterest, setNewInterest)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Goals */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4" /> Goals
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {goals.map((goal) => (
                    <Badge key={goal} variant="secondary" className="gap-1">
                      {goal}
                      <button onClick={() => removeItem(goals, setGoals, goal)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a goal..."
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem(goals, setGoals, newGoal, setNewGoal)}
                    data-testid="goal-input"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => addItem(goals, setGoals, newGoal, setNewGoal)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Projects */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <BookMarked className="w-4 h-4" /> Active Projects
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {projects.map((project) => (
                    <Badge key={project} variant="secondary" className="gap-1">
                      {project}
                      <button onClick={() => removeItem(projects, setProjects, project)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a project..."
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem(projects, setProjects, newProject, setNewProject)}
                    data-testid="project-input"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => addItem(projects, setProjects, newProject, setNewProject)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Learning Themes */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4" /> Learning Themes
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {learningThemes.map((theme) => (
                    <Badge key={theme} variant="secondary" className="gap-1">
                      {theme}
                      <button onClick={() => removeItem(learningThemes, setLearningThemes, theme)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a learning theme..."
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem(learningThemes, setLearningThemes, newTheme, setNewTheme)}
                    data-testid="theme-input"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => addItem(learningThemes, setLearningThemes, newTheme, setNewTheme)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full"
            data-testid="save-settings-btn"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
