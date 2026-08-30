import { readFileSync, writeFileSync } from 'fs';

const file = 'src/components/portal/auth/PortalAuth.tsx';
let code = readFileSync(file, 'utf8');

// Remove duplicate newPassword state declaration if present
const dup = /const \[resetToken, setResetToken\] = useState\('demo-token'\);\n  const \[newPassword, setNewPassword\] = useState\(''\);\n/;
code = code.replace(dup, "const [resetToken, setResetToken] = useState('demo-token');\n");

// Add handleChangePasswordSubmit BEFORE handleForgot
code = code.replace(
  "  const handleForgot = async (e: React.FormEvent) => {",
  `  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);
    clearError();
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
      setFeedbackMessage('Password updated successfully. Redirecting...');
      setMustChange(false);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => onSuccess?.(), 800);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to update password.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {`
);

// Add the forced password change form before the Demo Fast-Login Bar comment
const formHtml = `{/* Forced Password Change Screen */}
        {mustChange && (
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div className="space-y-1 text-center">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-warning/15 border border-warning/40 text-warning mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Set Your New Password</h3>
              <p className="text-xs text-muted-foreground">
                For security, please choose a new password for your staff account before continuing.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-input border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-input border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full font-bold text-xs"
            >
              {loading ? 'Updating...' : 'Update & Continue'}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Once changed, you will be redirected into the staff portal.
            </p>
          </form>
        )}

        {/* Demo Fast-Login Bar`;

code = code.replace("{/* Demo Fast-Login Bar", formHtml);

writeFileSync(file, code, 'utf8');
console.log('PortalAuth fixed: duplicate state removed, forced password change added');