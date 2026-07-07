"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ADMIN_UID = '0uxVCdYODobC2NSVU2tdTUyRxyN2';
const VALID_CATEGORIES = ['Crushes', 'Rants', 'Tea', 'Memes', 'Academic', 'Other'];
const SPAM_KEYWORDS = ['amazing security', 'very cool', 'kinupal', 'same as that other confessions'];

export default function SyncPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.uid !== ADMIN_UID) router.push('/');
  }, [user, loading]);

  const deleteSpam = async () => {
    if (!firestore) return;
    setDeleting(true);
    setLog([]);
    try {
      const confSnap = await getDocs(collection(firestore, 'confessions'));
      let deleted = 0;
      for (const confDoc of confSnap.docs) {
        const data = confDoc.data();
        const content = (data.content ?? '').toLowerCase();
        const category = data.category ?? '';
        const isSpamCategory = !VALID_CATEGORIES.includes(category);
        const isSpamContent = SPAM_KEYWORDS.some(k => content.includes(k));
        const hasFakeCount = (data.reactions?.heart ?? 0) > 10000 ||
          (data.reactions?.thumbsUp ?? 0) > 10000 ||
          (data.commentCount ?? 0) > 10000;

        if (isSpamCategory || isSpamContent || hasFakeCount) {
          await deleteDoc(doc(firestore, 'confessions', confDoc.id));
          setLog(prev => [...prev, `🗑️ Deleted: "${(data.content ?? '').slice(0, 40)}..."`]);
          deleted++;
        }
      }
      setLog(prev => [...prev, `\n✅ Done. Deleted ${deleted} spam post(s).`]);
    } catch (e: any) {
      setLog(prev => [...prev, `❌ Error: ${e.message}`]);
    } finally {
      setDeleting(false);
    }
  };

  const runSync = async () => {
    if (!firestore) return;
    setRunning(true);
    setLog([]);
    try {
      const confSnap = await getDocs(collection(firestore, 'confessions'));
      let updated = 0;
      for (const confDoc of confSnap.docs) {
        const commentsSnap = await getDocs(collection(firestore, 'confessions', confDoc.id, 'comments'));
        const realCount = commentsSnap.size;
        const storedCount = confDoc.data().commentCount ?? 0;
        if (realCount !== storedCount) {
          await updateDoc(doc(firestore, 'confessions', confDoc.id), { commentCount: realCount });
          setLog(prev => [...prev, `✅ Fixed post ${confDoc.id.slice(0, 8)}... → ${realCount} comments`]);
          updated++;
        }
      }
      setLog(prev => [...prev, `\nDone. Updated ${updated} post(s).`]);
      setDone(true);
    } catch (e: any) {
      setLog(prev => [...prev, `❌ Error: ${e.message}`]);
    } finally {
      setRunning(false);
    }
  };

  if (loading || !user || user.uid !== ADMIN_UID) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-black text-primary">Admin Tools</h1>
      </div>

      {/* Delete Spam */}
      <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
        <h2 className="text-base font-bold text-destructive mb-1 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Delete All Spam Posts
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Deletes posts with invalid categories, known spam keywords ("amazing security", "kinupal"), or fake inflated counts (10k+).
        </p>
        <Button onClick={deleteSpam} disabled={deleting} variant="destructive" className="w-full rounded-xl h-11">
          {deleting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deleting spam...</> : '🗑️ Delete All Spam Now'}
        </Button>
      </div>

      {/* Sync comment counts */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 mb-1">Sync Comment Counts</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Fixes commentCount on all posts to match actual Firestore comment subcollection size.
        </p>
        <Button onClick={runSync} disabled={running || done} className="bg-primary text-white rounded-xl w-full h-11">
          {running ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Running...</> : done ? '✅ Done' : 'Run Sync'}
        </Button>
      </div>

      {log.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 text-xs font-mono space-y-1 max-h-72 overflow-y-auto">
          {log.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      )}
    </div>
  );
}
