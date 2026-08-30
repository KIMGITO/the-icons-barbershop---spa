import React, { useState } from 'react';
import { 
  Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, 
  AlertCircle, Loader2, Sparkles, KeyRound, UserCheck 
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { SEEDED_STAFF_ACCOUNTS } from '../../../services/authService';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

interface PortalAuthProps {
  onSuccess?: () => void;
  onExitPortal?: () => void;
}

export const PortalAuth: React.FC<PortalAuthProps> = ({ onSuccess, onExitPortal }) => {
  const { login, forgotPassword, resetPassword, changePassword, loading, error, clearError } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [forcedChange, setForcedChange] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('demo-token');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);
    const ok = await login(email, password);
    if (!ok) return;
    const { user } = useAuthStore.getState();
    if (user?.mustChangePassword) {
      setForcedChange(true);
      return;
    }
    if (onSuccess) onSuccess();
  };

  const handleForcedPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);
    if (newPassword.length < 8) {
      setFeedbackMessage('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedbackMessage('Passwords do not match.');
      return;
    }
    try {
      await changePassword(newPassword);
      setForcedChange(false);
      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to update password.');
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    clearError();
    setFeedbackMessage(null);
    const ok = await login(demoEmail, demoPass);
    if (!ok) return;
    const { user } = useAuthStore.getState();
    if (user?.mustChangePassword) {
      setForcedChange(true);
      return;
    }
    if (onSuccess) onSuccess();
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFeedbackMessage(null);
    const res = await forgotPassword(email);
    setFeedbackMessage(res.message);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFeedbackMessage(null);
    try {
      const res = await resetPassword(resetToken, newPassword);
      setFeedbackMessage(res.message);
      setTimeout(() => setMode('login'), 2000);
    } catch (err: any) {
      setFeedbackMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle brand ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/40 text-primary mx-auto shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-serif">
              THE ICONS
            </h1>
            <p className="text-xs uppercase tracking-widest text-primary font-bold">
              Staff & Artisan Portal
            </p>
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Feedback Message */}
        {feedbackMessage && (
          <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl text-xs text-foreground">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Forced Password Change */}
        {forcedChange && (
          <form onSubmit={handleForcedPasswordChange} className="space-y-4">
            <div className="space-y-1 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 text-primary mx-auto mb-2 shadow-inner">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Security — Change Required</h3>
              <p className="text-xs text-muted-foreground">
                For your account security, you must set a new password before continuing.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="rounded-xl py-2.5 text-xs"
                icon={<Lock className="w-4 h-4" />}
                showPasswordToggle
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="rounded-xl py-2.5 text-xs"
                icon={<Lock className="w-4 h-4" />}
                showPasswordToggle
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full font-bold text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Updating Password...
                </>
              ) : (
                <>
                  <span>Set New Password & Continue</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => { setForcedChange(false); setMode('login'); }}
              className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Log out instead
            </button>
          </form>
        )}

        {/* Login Form */}
        {mode === 'login' && !forcedChange && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Staff Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@theicons.co.ke"
                className="rounded-xl py-2.5 text-xs"
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { clearError(); setFeedbackMessage(null); setMode('forgot'); }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl py-2.5 text-xs"
                icon={<Lock className="w-4 h-4" />}
                showPasswordToggle
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full font-bold text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  <span>Sign In to Station</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-bold text-foreground">Reset Your Password</h3>
              <p className="text-xs text-muted-foreground">
                Enter your staff email to receive a secure password recovery instruction.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Staff Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@theicons.co.ke"
                className="rounded-xl py-2.5 text-xs"
                icon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="w-full text-xs font-bold"
            >
              Send Reset Instructions
            </Button>

            <div className="flex justify-between items-center text-xs pt-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-primary hover:underline"
              >
                Back to Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-muted-foreground hover:text-foreground"
              >
                Have reset token?
              </button>
            </div>
          </form>
        )}

        {/* Reset Password Form */}
        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1 text-center">
              <h3 className="text-sm font-bold text-foreground">Set New Password</h3>
              <p className="text-xs text-muted-foreground">Enter verification token and new credential.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reset Token
              </label>
              <Input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Token from email"
                className="rounded-xl py-2 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="rounded-xl py-2 text-xs"
                icon={<Lock className="w-4 h-4" />}
                showPasswordToggle
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full text-xs font-bold"
            >
              Update Password
            </Button>

            <div className="text-center text-xs">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-primary hover:underline"
              >
                Return to Login
              </button>
            </div>
          </form>
        )}

        {/* Demo Fast-Login Bar (Convenient testing for evaluation of both Admin and Service Provider roles) */}
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-bold uppercase tracking-wider text-[10px]">Instant Demo Roles</span>
            <span className="flex items-center gap-1 text-primary text-[10px]">
              <UserCheck className="w-3 h-3" /> One-Click Switch
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@theicons.co.ke', 'admin123')}
              className="p-2 rounded-xl bg-muted/40 hover:bg-muted border border-border text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-foreground group-hover:text-primary">
                Executive Manager
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                Role: Admin
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('samuel@theicons.co.ke', 'barber123')}
              className="p-2 rounded-xl bg-muted/40 hover:bg-muted border border-border text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-foreground group-hover:text-primary">
                Samuel Mwangi
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                Role: Barber Provider
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('david@theicons.co.ke', 'spa123')}
              className="p-2 rounded-xl bg-muted/40 hover:bg-muted border border-border text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-foreground group-hover:text-primary">
                David Njenga
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                Role: Spa Therapist
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('brian@theicons.co.ke', 'scalp123')}
              className="p-2 rounded-xl bg-muted/40 hover:bg-muted border border-border text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-foreground group-hover:text-primary">
                Brian Mutua
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                Role: Scalp Specialist
              </div>
            </button>
          </div>
        </div>

        {/* Public Website Exit link */}
        {onExitPortal && (
          <div className="text-center pt-1 border-t border-border/60">
            <button
              type="button"
              onClick={onExitPortal}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <span>← Back to Public Website</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
