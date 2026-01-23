import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { processGoogleCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      // Extract session_id from URL fragment
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (!sessionIdMatch) {
        toast.error('Authentication failed - no session found');
        navigate('/auth');
        return;
      }

      const sessionId = sessionIdMatch[1];

      try {
        const user = await processGoogleCallback(sessionId);
        toast.success(`Welcome, ${user.name}!`);
        navigate('/dashboard', { state: { user } });
      } catch (error) {
        console.error('Google auth error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/auth');
      }
    };

    processCallback();
  }, [location.hash, navigate, processGoogleCallback]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
