"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { GoogleButton } from '@/components/google-button';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Enter your email first', description: 'Type your email above then click Forgot password.' });
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Reset email sent', description: `Check your inbox at ${email}.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to send reset email', description: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) router.push('/');
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Login failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (result.user) router.push('/');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Google sign-in failed', description: err.message });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-y-auto">
      {/* Top branding — mobile only */}
      <div className="lg:hidden flex flex-col items-center justify-center pt-20 pb-6 px-6 bg-gray-50">
        <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
          <img src="/cit.gif" alt="Wildcat Confessions" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-2xl font-black text-primary">Wildcat <span className="text-secondary">Confessions</span></h2>
        <p className="text-muted-foreground text-sm mt-1 text-center">Speak your truth, stay anonymous.</p>
      </div>

      {/* Left panel — branding desktop */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-6 bg-white/20">
            <img src="/cit.gif" alt="Wildcat Confessions" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-black mb-3">Wildcat Confessions</h2>
          <p className="text-white/70 text-base leading-relaxed">
            Speak your truth, stay anonymous. Join thousands of Wildcats sharing their stories.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-start lg:items-center justify-center bg-gray-50 px-6 pt-4 pb-12">
        <div className="w-full max-w-md">

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-black text-gray-900">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
            </div>

            <GoogleButton onClick={handleGoogle} loading={googleLoading} />

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center text-xs text-muted-foreground bg-white px-2">or continue with email</div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={handleForgotPassword} disabled={resetLoading} className="text-xs text-primary hover:underline font-medium disabled:opacity-50">
                    {resetLoading ? 'Sending...' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="h-11 rounded-xl pr-10 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden" />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl bg-primary text-white font-bold mt-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary font-semibold hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
