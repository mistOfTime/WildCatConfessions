"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { Confession } from '@/lib/types';
import ConfessionCard from '@/components/confession-card';
import { Loader2, Bookmark, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SavedPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.isAnonymous) { router.push('/login'); return; }
    if (!firestore) return;

    const load = async () => {
      const savesSnap = await getDocs(
        query(collection(firestore, 'users', user.uid, 'savedPosts'), orderBy('savedAt', 'desc'))
      );
      const items: Confession[] = [];
      for (const saveDoc of savesSnap.docs) {
        const confSnap = await getDoc(doc(firestore, 'confessions', saveDoc.id));
        if (confSnap.exists()) {
          items.push({ id: confSnap.id, ...confSnap.data() } as Confession);
        }
      }
      setConfessions(items);
      setLoading(false);
    };
    load();
  }, [user, authLoading, firestore]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary fill-primary" />
          <h1 className="text-2xl font-black text-gray-900">Saved Posts</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : confessions.length > 0 ? (
        <div className="space-y-4">
          {confessions.map(confession => (
            <ConfessionCard key={confession.id} confession={confession} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
          <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold text-lg">No saved posts yet</p>
          <p className="text-muted-foreground text-sm mt-2">
            Tap the bookmark icon on any post to save it here.
          </p>
        </div>
      )}
    </div>
  );
}
