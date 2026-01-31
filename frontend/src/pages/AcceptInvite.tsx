import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { validateInvitation, acceptInvitation, InvitationDetails } from '../api/invitations';
import { isGoogleOAuthEnabled } from '../api/auth';

export function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load invitation details
  useEffect(() => {
    async function loadInvitation() {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        const [inviteData, googleStatus] = await Promise.all([
          validateInvitation(token),
          isGoogleOAuthEnabled(),
        ]);
        setInvitation(inviteData);
        setGoogleEnabled(googleStatus);
        setName(inviteData.name || '');
      } catch {
        setError('This invitation is invalid or has expired');
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [token]);

  // Handle error from OAuth callback
  useEffect(() => {
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'You cancelled the Google sign-in.',
        oauth_failed: 'Google sign-in failed. Please try again.',
        no_code: 'Google sign-in failed. Please try again.',
      };
      setError(errorMessages[errorParam] || decodeURIComponent(errorParam));
    }
  }, [errorParam]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await acceptInvitation(token!, password, name || undefined);
      navigate('/login?registered=true');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Redirect to Google OAuth with invitation token
    window.location.href = `/api/auth/google?invitation=${token}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 md:p-8 text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Invalid Invitation</h1>
          <p className="text-muted mb-6">{error || 'This invitation link is invalid or has expired.'}</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <img
          src="/logo.png"
          alt="BandMate"
          className="w-16 h-16 rounded object-contain mb-4"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-primary italic">
          Join BandMate
        </h1>
      </div>

      {/* Invitation Card */}
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 md:p-8">
        {/* Invitation Info */}
        <div className="mb-6 text-center">
          <p className="text-muted text-sm">
            {invitation.invitedBy.name} invited you to join BandMate
          </p>
          <p className="text-primary font-medium mt-1">{invitation.email}</p>
          {invitation.projects.length > 0 && (
            <div className="mt-3">
              <p className="text-muted text-xs">You'll be added to:</p>
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {invitation.projects.map((project) => (
                  <span
                    key={project.id}
                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                  >
                    {project.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Google OAuth Button */}
        {googleEnabled && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
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
                <span className="px-2 bg-surface text-muted">or set a password</span>
              </div>
            </div>
          </>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Your Name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />

          <Input
            label="Password"
            type="password"
            placeholder="Create a password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          {error && <p className="text-error text-sm text-center">{error}</p>}

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Create Account
          </Button>
        </form>
      </div>

      {/* Already have account */}
      <div className="mt-4 text-center">
        <span className="text-muted text-sm">Already have an account? </span>
        <button
          onClick={() => navigate('/login')}
          className="text-primary text-sm hover:underline"
        >
          Log in
        </button>
      </div>
    </div>
  );
}
