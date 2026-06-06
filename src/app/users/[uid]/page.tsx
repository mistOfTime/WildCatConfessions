"use client"

import { useEffect, useState, use } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Confession, UserProfile } from '@/lib/types';
import ConfessionCard from '@/components/confession-card';
import { Loader2, ArrowLeft, BookOpen, Grid3x3, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ADMIN_UID = '0uxVCdYODobC2NSVU2tdTUyRxyN2';

export default function UserProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const firestore = useFirestore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Confession[]>([]);
  const [savedPosts, setSavedPosts] = useState<Confession[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');

  useEffect(() => {
    if (!firestore || !uid) return;

    // Load profile first — fast single doc read, also get auth name from posts as fallback
    Promise.all([
      getDoc(doc(firestore, 'users', uid)),
      getDocs(query(collection(firestore, 'confessions'), where('authorId', '==', uid), where('isAnonymous', '==', false))).catch(() => null),
    ]).then(([userSnap, postsSnap]) => {
      // Build profile from Firestore user doc
      let profileData: UserProfile = { uid };
      if (userSnap.exists()) {
        profileData = { uid, ...userSnap.data() } as UserProfile;
      }
      // If no displayName in Firestore, try to get it from a public post's authorName
      if (!profileData.displayName && postsSnap && !postsSnap.empty) {
        const firstPost = postsSnap.docs[0].data();
        if (firstPost.authorName) profileData.displayName = firstPost.authorName;
        if (!profileData.avatarPhoto && firstPost.authorPhoto) profileData.avatarPhoto = firstPost.authorPhoto;
      }
      setProfile(profileData);
      if (postsSnap) {
        const items = postsSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Confession))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setPosts(items);
      }
      setProfileLoading(false);
      setPostsLoading(false);
    }).catch(() => { setProfileLoading(false); setPostsLoading(false); });

    // Load saved posts — just IDs first, then fetch docs in parallel
    getDocs(collection(firestore, 'users', uid, 'savedPosts')).then(async savesSnap => {
      if (!savesSnap.empty) {
        const items = await Promise.all(
          savesSnap.docs.map(s =>
            getDoc(doc(firestore, 'confessions', s.id))
              .then(c => c.exists() ? { id: c.id, ...c.data() } as Confession : null)
              .catch(() => null)
          )
        );
        setSavedPosts(items.filter(Boolean) as Confession[]);
      }
    }).catch(() => {});
  }, [firestore, uid]);

  const displayName = profile?.displayName ?? 'Wildcat';
  const avatarPhoto = profile?.avatarPhoto ?? null;
  const isAdmin = uid === ADMIN_UID;

  // Show skeleton header while profile loads, then content streams in
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to feed
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-6">
        {profileLoading ? (
          <div className="flex items-center gap-5 animate-pulse">
            <div className="w-20 h-20 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-48" />
              <div className="h-3 bg-gray-100 rounded w-40" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white text-2xl font-black shrink-0">
              {avatarPhoto
                ? <img src={avatarPhoto} alt="avatar" className="w-full h-full object-cover object-top" />
                : displayName[0]?.toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-gray-900">{displayName}</h1>
                {isAdmin && (
                  <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
                )}
              </div>
              {profile?.course && (
                <div className="flex items-center gap-1.5 mt-1">
                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm text-primary font-semibold">{profile.course}</span>
                </div>
              )}
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        {!profileLoading && (
          <div className="flex gap-6 mt-5 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">{posts.length}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">{savedPosts.length}</p>
              <p className="text-xs text-muted-foreground">Saved</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={cn("flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2",
            activeTab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-gray-700')}
        >
          <Grid3x3 className="w-4 h-4" /> Posts
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={cn("flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2",
            activeTab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-gray-700')}
        >
          <Bookmark className="w-4 h-4" /> Saved
        </button>
      </div>

      {/* Content */}
      {activeTab === 'posts' && (
        postsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">{posts.map(c => <ConfessionCard key={c.id} confession={c} />)}</div>
        ) : (
          <div className="text-center py-16 text-muted-foreground italic">No public posts yet.</div>
        )
      )}
      {activeTab === 'saved' && (
        savedPosts.length > 0
          ? <div className="space-y-4">{savedPosts.map(c => <ConfessionCard key={c.id} confession={c} />)}</div>
          : <div className="text-center py-16 text-muted-foreground italic">No saved posts yet.</div>
      )}
    </div>
  );
}
