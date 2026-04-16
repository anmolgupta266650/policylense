import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [restrictedError, setRestrictedError] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setRestrictedError(false);
    try {
      const provider = new GoogleAuthProvider();
      // Ensure we use popup for better iframe compatibility
      await signInWithPopup(auth, provider);
      toast.success('Successfully logged in!');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/network-request-failed') {
        toast.error('Network error: Please check your connection, disable ad-blockers, or try opening the app in a new tab.', {
          duration: 6000,
        });
      } else if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Login popup was closed before completion.');
      } else {
        toast.error(error.message || 'Failed to login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setRestrictedError(false);
    try {
      await signInAnonymously(auth);
      toast.success('Logged in as Guest');
      navigate('/');
    } catch (error: any) {
      console.error('Guest login error:', error);
      if (error.code === 'auth/admin-restricted-operation') {
        setRestrictedError(true);
        toast.error('Access Restricted by Firebase settings.');
      } else if (error.code === 'auth/network-request-failed') {
        toast.error('Network error: Please check your connection, disable ad-blockers, or try opening the app in a new tab.', {
          duration: 6000,
        });
      } else {
        toast.error('Failed to sign in as guest. Please ensure Anonymous Auth is enabled in Firebase Console.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
              <ShieldCheck className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tight">GovScholar</CardTitle>
            <CardDescription className="text-base">
              Your gateway to government schemes and educational events
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Continue with</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full py-6 text-lg font-medium gap-3 hover:bg-muted/50 transition-all"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google Account
            </Button>

            <Button 
              variant="secondary" 
              className="w-full py-6 text-lg font-medium gap-3 transition-all"
              onClick={handleGuestLogin}
              disabled={loading}
            >
              <UserCircle className="h-5 w-5" />
              Continue as Guest
            </Button>

            <Button 
              variant="link" 
              className="w-full text-xs text-muted-foreground"
              onClick={openInNewTab}
            >
              Trouble logging in? Open in new tab
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-xs text-muted-foreground px-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
