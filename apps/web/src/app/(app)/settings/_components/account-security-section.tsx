"use client";

import { KeyRoundIcon, LogOutIcon, ShieldAlertIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  canUnlinkProvider,
  extractAuthIdentities,
  formatAuthError,
  type MinimalUser,
  validatePassword,
} from "@myc/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldHint, Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
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
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

interface AccountSecuritySectionProps {
  initialUser?: MinimalUser | null;
}

export function AccountSecuritySection({ initialUser }: AccountSecuritySectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<MinimalUser | null>(initialUser ?? null);
  const [identitiesSummary, setIdentitiesSummary] = useState(() =>
    extractAuthIdentities(initialUser),
  );

  // Modal dialog states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [signOutAllDevicesDialogOpen, setSignOutAllDevicesDialogOpen] = useState(false);

  // Form states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [collisionError, setCollisionError] = useState<string | null>(null);

  // Refresh user data from Supabase client
  const refreshUser = async () => {
    const supabase = createClient();
    const {
      data: { user: updatedUser },
    } = await supabase.auth.getUser();
    if (updatedUser) {
      setUser(updatedUser);
      setIdentitiesSummary(extractAuthIdentities(updatedUser));
    }
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (currentUser) {
        setUser(currentUser);
        setIdentitiesSummary(extractAuthIdentities(currentUser));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIdentitiesSummary(extractAuthIdentities(session.user));
      }
    });

    if (searchParams.get("linked") === "google") {
      toast({
        title: "Google account connected",
        description: "Your Google identity is now linked to this MYC account.",
        tone: "success",
      });
      void supabase.auth.getUser().then(({ data: { user: updatedUser } }) => {
        if (updatedUser) {
          setUser(updatedUser);
          setIdentitiesSummary(extractAuthIdentities(updatedUser));
        }
      });
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

  // Action: Link Google Account (Scenario A)
  const handleLinkGoogle = async () => {
    try {
      setActionLoading(true);
      setCollisionError(null);
      const supabase = createClient();
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      callbackUrl.searchParams.set("next", "/settings");

      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("already") ||
          error.message.toLowerCase().includes("exists")
        ) {
          setCollisionError(
            "This Google account is already linked to another MYC account. To protect your data and prevent unauthorized overwrites, accounts cannot be merged automatically. Please sign in to that account directly.",
          );
        } else {
          toast({
            title: "Could not link Google account",
            description: formatAuthError(error),
            tone: "error",
          });
        }
        setActionLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast({
        title: "Could not link Google account",
        description: formatAuthError(err),
        tone: "error",
      });
      setActionLoading(false);
    }
  };

  // Action: Unlink Google Account
  const handleUnlinkGoogle = async () => {
    try {
      setActionLoading(true);
      const supabase = createClient();
      const fullIdentities = (await supabase.auth.getUserIdentities()).data?.identities ?? [];
      const googleIdentity = fullIdentities.find((id) => id.provider === "google");

      if (!googleIdentity) {
        toast({
          title: "Identity not found",
          description: "Could not locate your Google identity.",
          tone: "error",
        });
        setActionLoading(false);
        setUnlinkDialogOpen(false);
        return;
      }

      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) {
        toast({
          title: "Could not unlink Google account",
          description: formatAuthError(error),
          tone: "error",
        });
        setActionLoading(false);
        return;
      }

      toast({
        title: "Google unlinked",
        description: "Google sign-in has been disconnected from your account.",
        tone: "info",
      });

      setUnlinkDialogOpen(false);
      setActionLoading(false);
      await refreshUser();
    } catch (err) {
      toast({
        title: "Could not unlink Google account",
        description: formatAuthError(err),
        tone: "error",
      });
      setActionLoading(false);
    }
  };

  // Action: Set Password (Scenario B) or Change Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const validation = validatePassword(password);
    if (!validation.valid) {
      setPasswordError(validation.message ?? "Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setActionLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setPasswordError(formatAuthError(error));
        setActionLoading(false);
        return;
      }

      toast({
        title: isSettingNewPassword ? "Password established" : "Password changed",
        description: isSettingNewPassword
          ? "You can now sign in with either your password or Google."
          : "Your account password was updated successfully.",
        tone: "success",
      });

      setPassword("");
      setConfirmPassword("");
      setPasswordDialogOpen(false);
      setActionLoading(false);
      await refreshUser();
    } catch (err) {
      setPasswordError(formatAuthError(err));
      setActionLoading(false);
    }
  };

  // Action: Reset Password (sends email link)
  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    try {
      setActionLoading(true);
      const supabase = createClient();
      const origin = window.location.origin;
      const callbackUrl = new URL("/auth/callback", origin);
      callbackUrl.searchParams.set("type", "recovery");
      callbackUrl.searchParams.set("next", "/reset-password");

      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: callbackUrl.toString(),
      });

      toast({
        title: "Reset link sent",
        description: `We've sent password reset instructions to ${user.email}.`,
        tone: "info",
      });
      setActionLoading(false);
    } catch (err) {
      toast({
        title: "Could not send reset email",
        description: formatAuthError(err),
        tone: "error",
      });
      setActionLoading(false);
    }
  };

  // Action: Local Sign Out (Requirement §6)
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
    router.refresh();
  };

  // Action: Global Sign Out (Sign Out From All Devices)
  const handleSignOutAllDevices = async () => {
    try {
      setActionLoading(true);
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "global" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not sign out all devices",
        description: formatAuthError(err),
        tone: "error",
      });
      setActionLoading(false);
    }
  };

  const canUnlinkGoogle = canUnlinkProvider(identitiesSummary, "google");

  return (
    <>
      <Card className="gap-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <div className="grid content-start gap-1">
          <h2 className="type-h3">Account & Security</h2>
          <p className="type-small text-muted-foreground">
            Manage your sign-in methods, linked identities, and multi-device sessions.
          </p>
        </div>

        <div className="grid gap-6">
          {collisionError && (
            <Alert tone="warning">
              <ShieldAlertIcon />
              <AlertTitle>Account collision</AlertTitle>
              <AlertDescription>{collisionError}</AlertDescription>
            </Alert>
          )}

          {/* Primary Email */}
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground">Email address</Label>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-secondary/30 p-3.5">
              <span className="type-body font-medium text-foreground">
                {user?.email ?? "Signed in"}
              </span>
              <Badge tone="success" className="gap-1.5">
                <StatusDot />
                Verified
              </Badge>
            </div>
            <p className="type-small text-muted-foreground">
              Your identity across web, mobile, and future widgets.
            </p>
          </div>

          <Separator />

          {/* Connected Authentication Methods */}
          <div className="grid gap-4">
            <h3 className="type-label text-foreground">Sign-in methods</h3>

            {/* Email + Password Method */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-content-center rounded-lg border border-border/70 bg-card text-muted-foreground shadow-sm">
                  <KeyRoundIcon className="size-5" />
                </div>
                <div className="grid gap-0.5">
                  <div className="flex items-center gap-2">
                    <p className="type-label">Email & Password</p>
                    {identitiesSummary.hasEmail ? (
                      <Badge tone="success">
                        <StatusDot />
                        Active
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Not set</Badge>
                    )}
                  </div>
                  <p className="type-small text-muted-foreground">
                    {identitiesSummary.hasEmail
                      ? "Sign in with your email and password."
                      : "Establish a password to allow password-based sign in."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {identitiesSummary.hasEmail ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsSettingNewPassword(false);
                        setPasswordDialogOpen(true);
                      }}
                    >
                      Change password
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionLoading}
                      onClick={handleSendResetEmail}
                    >
                      Reset via email
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => {
                      setIsSettingNewPassword(true);
                      setPasswordDialogOpen(true);
                    }}
                  >
                    Set Password
                  </Button>
                )}
              </div>
            </div>

            {/* Google Authentication Method */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-content-center rounded-lg border border-border/70 bg-card shadow-sm">
                  <GoogleIcon className="size-5" />
                </div>
                <div className="grid gap-0.5">
                  <div className="flex items-center gap-2">
                    <p className="type-label">Google Account</p>
                    {identitiesSummary.hasGoogle ? (
                      <Badge tone="success">
                        <StatusDot />
                        Connected
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Not linked</Badge>
                    )}
                  </div>
                  <p className="type-small text-muted-foreground">
                    {identitiesSummary.hasGoogle
                      ? "Your Google identity is linked to this account."
                      : "Connect Google for seamless one-click sign in."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {identitiesSummary.hasGoogle ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canUnlinkGoogle || actionLoading}
                    onClick={() => setUnlinkDialogOpen(true)}
                    title={
                      !canUnlinkGoogle
                        ? "You must set a password before disconnecting Google to avoid account lockout."
                        : undefined
                    }
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={actionLoading}
                    onClick={handleLinkGoogle}
                  >
                    Link Google Account
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Session & Sign Out */}
          <div className="grid gap-4">
            <h3 className="type-label text-foreground">Session</h3>

            {/* Current Device Session */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
              <div className="grid gap-0.5">
                <p className="type-label">This device</p>
                <p className="type-small text-muted-foreground">
                  Signed in on this browser. Sign out affects only this session.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleSignOut}>
                <LogOutIcon className="size-4" />
                Sign out
              </Button>
            </div>

            {/* All Devices Session */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/[0.02] p-4">
              <div className="grid gap-0.5">
                <p className="type-label text-destructive">All active devices</p>
                <p className="type-small text-muted-foreground">
                  End all active sessions across web browsers, mobile devices, and widgets.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setSignOutAllDevicesDialogOpen(true)}
              >
                <LogOutIcon className="size-4" />
                Sign Out From All Devices
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Set / Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isSettingNewPassword ? "Set a password" : "Change password"}</DialogTitle>
            <DialogDescription>
              {isSettingNewPassword
                ? "Establish a secure password so you can sign in to MYC using your email and password on any device."
                : "Enter a new password for your MYC account."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePassword} className="grid gap-4 py-2">
            {passwordError && (
              <Alert tone="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <Field>
              <Label htmlFor="new-dialog-password">New password</Label>
              <Input
                id="new-dialog-password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={actionLoading}
              />
              <FieldHint>At least 8 characters.</FieldHint>
            </Field>

            <Field>
              <Label htmlFor="confirm-dialog-password">Confirm new password</Label>
              <Input
                id="confirm-dialog-password"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={actionLoading}
              />
            </Field>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPasswordDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button type="submit" loading={actionLoading}>
                {isSettingNewPassword ? "Save password" : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unlink Google Confirmation Dialog */}
      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Google Account?</DialogTitle>
            <DialogDescription>
              You will no longer be able to use &quot;Continue with Google&quot; to sign in to this
              account. You will use your email and password instead.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setUnlinkDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" loading={actionLoading} onClick={handleUnlinkGoogle}>
              Disconnect Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out All Devices Confirmation Dialog */}
      <Dialog open={signOutAllDevicesDialogOpen} onOpenChange={setSignOutAllDevicesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out from all devices?</DialogTitle>
            <DialogDescription>
              This will immediately terminate all active sessions across all web browsers, mobile
              devices, and widgets. You will need to sign in again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setSignOutAllDevicesDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" loading={actionLoading} onClick={handleSignOutAllDevices}>
              Sign out from all devices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out All Devices Confirmation Dialog */}
      <Dialog open={signOutAllDevicesDialogOpen} onOpenChange={setSignOutAllDevicesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out from all devices?</DialogTitle>
            <DialogDescription>
              This will immediately terminate all active sessions across all web browsers, mobile
              devices, and widgets. You will need to sign in again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setSignOutAllDevicesDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button variant="destructive" loading={actionLoading} onClick={handleSignOutAllDevices}>
              Sign out from all devices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
