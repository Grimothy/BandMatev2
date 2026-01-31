import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { isGoogleOAuthEnabled, getGoogleOAuthUrl } from '../api/auth';

export function Login() {
  const { login, isAuthenticated, isLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [checkingOAuth, setCheckingOAuth] = useState(true);

  // Check if Google OAuth is enabled
  useEffect(() => {
    isGoogleOAuthEnabled()
      .then(setGoogleEnabled)
      .finally(() => setCheckingOAuth(false));
  }, []);

  // Handle OAuth callback and registration success
  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const oauthError = searchParams.get('error');
    const registered = searchParams.get('registered');

    if (oauth === 'success') {
      // OAuth was successful, refresh user data
      refreshUser().then(() => {
        navigate('/', { replace: true });
      });
    } else if (registered === 'true') {
      setSuccessMessage('Account created successfully! You can now log in.');
    } else if (oauthError) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'You cancelled the Google sign-in.',
        oauth_failed: 'Google sign-in failed. Please try again.',
        no_code: 'Google sign-in failed. Please try again.',
        no_account: 'No account found. You need an invitation to sign up.',
      };
      setError(errorMessages[oauthError] || 'Authentication failed.');
    }
  }, [searchParams, refreshUser, navigate]);

  if (isLoading || checkingOAuth) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleOAuthUrl();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <img 
          src="/logo.png" 
          alt="BandMate" 
          className="w-16 h-16 rounded object-contain mb-4"
        />
        <h1 className="text-4xl md:text-5xl font-bold text-primary italic">
          BandMate Login
        </h1>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 md:p-8">
        {/* Google OAuth Button */}
        {googleEnabled && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-muted">or</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus={!googleEnabled}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-500 text-sm text-center">{successMessage}</p>
            </div>
          )}

          {error && (
            <p className="text-error text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isSubmitting}
          >
            Log in
          </Button>
        </form>
      </div>

      {/* Register link (for display only - admin creates users) */}
      <div className="mt-4 w-full max-w-md">
        <div className="border border-border rounded-xl py-3 text-center">
          <span className="text-primary">Register</span>
        </div>
        <p className="text-muted text-xs text-center mt-2">
          Contact your administrator to create an account
        </p>
      </div>
    </div>
  );
}
