"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { Confession } from '@/lib/types';
import ConfessionCard from '@/components/confession-card';
import { Loader2, Repeat, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RepostsPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.isAnonymous) router.push('/login');
  }, [user, authLoading]);

  const repostsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'confessions'),
      where('authorId', '==', user.uid),
      where('isRepost', '==', true),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  const { data: reposts, loading } = useCollection<Confession>(repostsQuery);

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
          <Repeat className="w-5 h-5 text-green-600" />
          <h1 className="text-2xl font-black text-gray-900">My Reposts</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reposts && reposts.length > 0 ? (
        <div className="space-y-4">
          {reposts.map(confession => (
            <ConfessionCard key={confession.id} confession={confession} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
          <Repeat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold text-lg">No reposts yet</p>
          <p className="text-muted-foreground text-sm mt-2">
            When you repost a confession, it will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
