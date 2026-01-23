import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Brain,
  Sparkles,
  BookOpen,
  MessageSquare,
  Calendar,
  Settings,
  LogOut,
  Search,
  Download,
  Trash2,
  Tag,
  Filter,
  ChevronLeft,
  ChevronRight,
  Lightbulb
} from 'lucide-react';

const KnowledgeBase = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [tags, setTags] = useState([]);
  const [pagination, setPagination] = useState({ skip: 0, limit: 20, total: 0 });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, itemId: null });

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadItems();
  }, [pagination.skip, searchQuery, selectedTag]);

  const loadTags = async () => {
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory({
        skip: pagination.skip,
        limit: pagination.limit,
        search: searchQuery || undefined,
        tag: selectedTag || undefined
      });
      setItems(data.items);
      setPagination(prev => ({ ...prev, total: data.total }));
    } catch (error) {
      toast.error('Failed to load knowledge');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, skip: 0 }));
  };

  const handleDelete = async () => {
    if (!deleteDialog.itemId) return;
    try {
      await api.deleteKnowledgeItem(deleteDialog.itemId);
      toast.success('Item deleted');
      loadItems();
    } catch (error) {
      toast.error('Failed to delete');
    }
    setDeleteDialog({ open: false, itemId: null });
  };

  const handleExport = async () => {
    try {
      const data = await api.exportKnowledge();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skimly-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Knowledge exported!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { icon: Sparkles, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Knowledge Base', path: '/knowledge', active: true },
    { icon: MessageSquare, label: 'Ask Your Brain', path: '/ask', pro: true },
    { icon: Calendar, label: 'Weekly Digest', path: '/digest', pro: true },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.skip / pagination.limit) + 1;

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-light mb-2">Knowledge Base</h1>
              <p className="text-muted-foreground">{pagination.total} items stored</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleExport}
              className="rounded-full"
              data-testid="export-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search your knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full"
                data-testid="search-input"
              />
            </form>
            <Select value={selectedTag} onValueChange={(v) => { setSelectedTag(v === 'all' ? '' : v); setPagination(p => ({...p, skip: 0})); }}>
              <SelectTrigger className="w-48" data-testid="tag-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.tag} value={tag.tag}>
                    {tag.tag} ({tag.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Knowledge Items */}
          {loading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-5">
                    <Skeleton className="h-4 w-full mb-3" />
                    <Skeleton className="h-4 w-3/4 mb-4" />
                    <Skeleton className="h-3 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <BookOpen className="empty-state-icon" />
              <h3 className="text-lg font-medium mb-2">No knowledge found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedTag 
                  ? "Try adjusting your search or filters" 
                  : "Start analyzing content to build your knowledge base"}
              </p>
              {!searchQuery && !selectedTag && (
                <Link to="/dashboard">
                  <Button className="rounded-full" data-testid="start-analyzing-btn">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Analyzing
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <Card 
                  key={item.item_id} 
                  className="border-border/50 hover:shadow-md transition-shadow"
                  data-testid={`knowledge-item-${item.item_id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2 mb-3">{item.original_text}</p>
                        
                        {item.analysis?.key_points?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" /> Key Points
                            </p>
                            <ul className="text-sm text-foreground/80 space-y-1">
                              {item.analysis.key_points.slice(0, 2).map((point, i) => (
                                <li key={i} className="truncate">• {point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          {item.source_title && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">{item.source_title}</span>
                            </>
                          )}
                        </div>
                        
                        {item.tags?.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => setDeleteDialog({ open: true, itemId: item.item_id })}
                        data-testid={`delete-${item.item_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPagination(p => ({ ...p, skip: p.skip - p.limit }))}
                data-testid="prev-page"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPagination(p => ({ ...p, skip: p.skip + p.limit }))}
                data-testid="next-page"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, itemId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this knowledge item from your base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive" data-testid="confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KnowledgeBase;
