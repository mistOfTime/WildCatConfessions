"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useUser, useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Camera, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

const AVATAR_COLORS = [
  { bg: 'bg-red-500', value: '#ef4444' },
  { bg: 'bg-orange-500', value: '#f97316' },
  { bg: 'bg-yellow-500', value: '#eab308' },
  { bg: 'bg-green-500', value: '#22c55e' },
  { bg: 'bg-teal-500', value: '#14b8a6' },
  { bg: 'bg-blue-500', value: '#3b82f6' },
  { bg: 'bg-indigo-500', value: '#6366f1' },
  { bg: 'bg-purple-500', value: '#a855f7' },
  { bg: 'bg-pink-500', value: '#ec4899' },
  { bg: 'bg-primary', value: 'primary' },
];

export default function ProfilePage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [course, setCourse] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [avatarColor, setAvatarColor] = useState('primary');
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCurrentPwd1, setShowCurrentPwd1] = useState(false);
  const [showCurrentPwd2, setShowCurrentPwd2] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.isAnonymous) {
      router.push('/login');
      return;
    }
    setDisplayName(user.displayName ?? '');
    setNewEmail(user.email ?? '');
    const savedColor = localStorage.getItem(`avatar-color-${user.uid}`);
    if (savedColor) setAvatarColor(savedColor);
    // Try Firestore first for cross-device sync, fallback to localStorage
    const loadPhoto = async () => {
      try {
        const { getFirestore, doc, getDoc, setDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const db = getFirestore(getApp());
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.avatarPhoto) {
            setAvatarPhoto(data.avatarPhoto);
            localStorage.setItem(`avatar-photo-${user.uid}`, data.avatarPhoto);
          }
          if (data.bio) setBio(data.bio);
          if (data.course) setCourse(data.course);
          return;
        }
        // First time on this device — seed the Firestore doc with Firebase Auth name
        await setDoc(doc(db, 'users', user.uid), {
          displayName: user.displayName ?? user.email ?? 'Wildcat',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch {}
      const savedPhoto = localStorage.getItem(`avatar-photo-${user.uid}`);
      if (savedPhoto) setAvatarPhoto(savedPhoto);
    };
    loadPhoto();
  }, [user, loading]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Image too large', description: 'Max size is 2MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const photo = reader.result as string;
      setAvatarPhoto(photo);
      // Save to localStorage AND Firestore for cross-device sync
      localStorage.setItem(`avatar-photo-${user.uid}`, photo);
      try {
        const { getFirestore, collection, query, where, getDocs, updateDoc, doc, setDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const db = getFirestore(getApp());
        // Save to user profile doc
        await setDoc(doc(db, 'users', user.uid), { avatarPhoto: photo, updatedAt: new Date().toISOString() }, { merge: true });
        // Update all public posts
        const q = query(collection(db, 'confessions'), where('authorId', '==', user.uid), where('isAnonymous', '==', false));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'confessions', d.id), { authorPhoto: photo })));
        // Update authorPhoto on all comments by this user
        const allConfessions = await getDocs(collection(db, 'confessions'));
        for (const confDoc of allConfessions.docs) {
          const commentsSnap = await getDocs(
            query(collection(db, 'confessions', confDoc.id, 'comments'), where('authorId', '==', user.uid))
          );
          await Promise.all(commentsSnap.docs.map(d => updateDoc(d.ref, { authorPhoto: photo })));
        }
        toast({ title: 'Avatar updated', description: 'Your profile photo has been saved.' });
      } catch {
        toast({ title: 'Avatar saved locally', description: 'Photo saved but posts could not be updated.' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const selectedColor = AVATAR_COLORS.find(c => c.value === avatarColor) ?? AVATAR_COLORS[9];

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      localStorage.setItem(`avatar-color-${user.uid}`, avatarColor);
      if (avatarPhoto) {
        localStorage.setItem(`avatar-photo-${user.uid}`, avatarPhoto);
      } else {
        localStorage.removeItem(`avatar-photo-${user.uid}`);
      }
      // Update displayName on all public posts AND comments in Firestore
      try {
        const { getFirestore, collection, query, where, getDocs, updateDoc, doc, setDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const db = getFirestore(getApp());
        // Save to user profile doc
        await setDoc(doc(db, 'users', user.uid), { displayName, bio, course, updatedAt: new Date().toISOString() }, { merge: true });
        // Update all public confessions
        const q = query(collection(db, 'confessions'), where('authorId', '==', user.uid), where('isAnonymous', '==', false));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'confessions', d.id), { authorName: displayName })));
        // Update comments inside each confession
        const allConfessions = await getDocs(collection(db, 'confessions'));
        for (const confDoc of allConfessions.docs) {
          const commentsSnap = await getDocs(
            query(collection(db, 'confessions', confDoc.id, 'comments'), where('authorId', '==', user.uid), where('isAnonymous', '==', false))
          );
          await Promise.all(commentsSnap.docs.map(d => updateDoc(d.ref, { authorName: displayName })));
        }
      } catch {}
      toast({ title: 'Profile updated', description: 'Your name has been saved.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to update profile', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!user || !currentPassword) return;
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, newEmail);
      toast({ title: 'Email updated' });
      setCurrentPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to update email', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !currentPassword || !newPassword) return;
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Must be at least 6 characters.' });
      return;
    }
    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: 'Password updated' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to update password', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to feed
        </Link>

        <h1 className="text-2xl font-black text-gray-900 mb-8">Profile Settings</h1>

        {/* Avatar preview */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">Avatar</h2>
          <div className="flex items-center gap-5 mb-5">
            {/* Avatar — click to change */}
            <div className="relative shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-full overflow-hidden relative group focus:outline-none"
                style={{ backgroundColor: !avatarPhoto ? (avatarColor === 'primary' ? 'var(--primary, #7c1d2e)' : avatarColor) : undefined }}
              >
                {avatarPhoto
                  ? <img src={avatarPhoto} alt="avatar" className="w-full h-full object-cover object-top" />
                  : <span className="w-full h-full flex items-center justify-center text-white font-black text-4xl">
                      {displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'W'}
                    </span>
                }
                {/* Hover overlay */}
                <span className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-white text-[10px] font-semibold">Change</span>
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{displayName || 'Wildcat'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap your avatar to change it</p>
            </div>
          </div>
          {!avatarPhoto && (
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAvatarColor(color.value)}
                  className={`w-8 h-8 rounded-full ${color.bg} transition-all ${avatarColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Display name + Bio + Course */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">Profile Info</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Wildcat" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell something about yourself..."
                className="w-full h-20 px-3 py-2 text-sm border border-input rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/150</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course">Course / Program</Label>
              <select
                id="course"
                value={course}
                onChange={e => setCourse(e.target.value)}
                className="w-full h-11 px-3 text-sm border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary bg-background"
              >
                <option value="">Select your course</option>
                <optgroup label="College of Computer Studies">
                  <option>BS Information Technology</option>
                  <option>BS Computer Science</option>
                  <option>BS Computer Engineering</option>
                  <option>BS Information Systems</option>
                </optgroup>
                <optgroup label="College of Engineering">
                  <option>BS Civil Engineering</option>
                  <option>BS Electrical Engineering</option>
                  <option>BS Electronics Engineering</option>
                  <option>BS Mechanical Engineering</option>
                  <option>BS Chemical Engineering</option>
                  <option>BS Industrial Engineering</option>
                </optgroup>
                <optgroup label="College of Business">
                  <option>BS Business Administration</option>
                  <option>BS Accountancy</option>
                  <option>BS Accounting Technology</option>
                  <option>BS Marketing Management</option>
                  <option>BS Financial Management</option>
                  <option>BS Hospitality Management</option>
                  <option>BS Tourism Management</option>
                </optgroup>
                <optgroup label="College of Education">
                  <option>Bachelor of Elementary Education</option>
                  <option>Bachelor of Secondary Education</option>
                  <option>Bachelor of Physical Education</option>
                </optgroup>
                <optgroup label="College of Arts & Sciences">
                  <option>BS Psychology</option>
                  <option>BS Biology</option>
                  <option>BS Mathematics</option>
                  <option>AB Communication</option>
                  <option>AB Political Science</option>
                </optgroup>
                <optgroup label="College of Nursing & Allied Health">
                  <option>BS Nursing</option>
                  <option>BS Pharmacy</option>
                  <option>BS Medical Technology</option>
                  <option>BS Radiologic Technology</option>
                  <option>BS Physical Therapy</option>
                </optgroup>
                <optgroup label="College of Architecture & Fine Arts">
                  <option>BS Architecture</option>
                  <option>BS Interior Design</option>
                  <option>BS Fine Arts</option>
                </optgroup>
                <optgroup label="College of Law">
                  <option>Juris Doctor</option>
                </optgroup>
                <option value="Other">Other</option>
              </select>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="w-full h-10 rounded-xl bg-primary text-white font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Change email — only for email/password users */}
        {user?.providerData[0]?.providerId === 'password' && (
          <>
            <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-4">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">Change Email</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newEmail">New Email</Label>
                  <Input id="newEmail" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currentPwd1">Current Password</Label>
                  <div className="relative">
                    <Input id="currentPwd1" type={showCurrentPwd1 ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Required to confirm" className="h-11 rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowCurrentPwd1(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                      {showCurrentPwd1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleChangeEmail} disabled={saving} className="w-full h-10 rounded-xl bg-primary text-white font-bold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Email'}
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-4">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">Change Password</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPwd2">Current Password</Label>
                  <div className="relative">
                    <Input id="currentPwd2" type={showCurrentPwd2 ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="h-11 rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowCurrentPwd2(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                      {showCurrentPwd2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" className="h-11 rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowNewPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                      {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={saving} className="w-full h-10 rounded-xl bg-primary text-white font-bold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
