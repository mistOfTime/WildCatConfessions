"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, Settings, Menu, Home, X, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const ADMIN_UID = '0uxVCdYODobC2NSVU2tdTUyRxyN2';

export default function Navbar() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isRealUser = user && !user.isAnonymous;
  const displayInitial = user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'W';
  const displayName = user?.displayName ?? user?.email ?? 'Wildcat';
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isAdmin = user?.uid === ADMIN_UID;
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Try Firestore for cross-device sync, fallback to localStorage
      const loadPhoto = async () => {
        try {
          const { getFirestore, doc, getDoc } = await import('firebase/firestore');
          const { getApp } = await import('firebase/app');
          const db = getFirestore(getApp());
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists() && snap.data().avatarPhoto) {
            setAvatarPhoto(snap.data().avatarPhoto);
            return;
          }
        } catch {}
        setAvatarPhoto(localStorage.getItem(`avatar-photo-${user.uid}`));
      };
      loadPhoto();
    }
  }, [user, pathname]); // re-read on navigation so it picks up changes

  const handleSignOut = async () => {
    await signOut(auth);
    toast({ title: 'Signed out successfully' });
    setOpen(false);
    router.push('/login');
  };

  const navLink = (href: string, icon: React.ReactNode, label: string, highlight = false) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
        pathname === href
          ? 'bg-primary/10 text-primary'
          : highlight
          ? 'text-secondary hover:bg-primary/5'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <>
      {/* Top navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Hamburger — left side, only when logged in */}
          {!isAuthPage && isRealUser && (
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-colors focus:outline-none shrink-0"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}

          {/* Logo */}
          {!isAuthPage && (
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-primary rounded-lg overflow-hidden flex items-center justify-center shadow-sm">
                <img src="/cit.gif" alt="logo" className="w-full h-full object-cover object-top" />
              </div>
              <span className="text-primary font-black text-lg tracking-tight">
                Wildcat <span className="text-secondary">Confessions</span>
              </span>
            </Link>
          )}

          {/* Right: empty */}
          <div className="ml-auto" />
        </div>
      </nav>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar drawer — LEFT side, white */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-[100] bg-white border-r border-gray-100 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-primary">
              <img src="/cit.gif" alt="logo" className="w-full h-full object-cover object-top" />
            </div>
            <div>
              <p className="text-primary font-black text-base leading-tight">Wildcat</p>
              <p className="text-secondary text-xs font-semibold">Confessions</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Profile */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">Profile</p>
            <Link href={`/users/${user?.uid}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-2 hover:bg-gray-50 rounded-xl py-1 transition-colors">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-primary text-white font-bold text-lg flex items-center justify-center shrink-0">
                {avatarPhoto
                  ? <img src={avatarPhoto} alt="avatar" className="w-full h-full object-cover object-top" />
                  : displayInitial}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{displayName}</p>
                {user?.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
              </div>
            </Link>
          </div>

          {/* Main Menu */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Main Menu</p>
            {navLink('/', <Home className="w-4 h-4" />, 'Feed')}
            {navLink('/saved', <Bookmark className="w-4 h-4" />, 'Saved Posts')}
          </div>

          {/* Settings */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Settings</p>
            {navLink('/profile', <Settings className="w-4 h-4" />, 'Profile Customization', true)}
          </div>

          {/* Admin */}
          {isAdmin && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Admin Tools</p>
              {navLink('/admin', <ShieldCheck className="w-4 h-4" />, 'Moderation')}
            </div>
          )}
        </div>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
