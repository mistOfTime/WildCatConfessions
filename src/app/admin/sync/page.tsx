"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ADMIN_UID = '0uxVCdYODobC2NSVU2tdTUyRxyN2';

export default function SyncPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.uid !== ADMIN_UID) router.push('/');
  }, [user, loading]);

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
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-black text-primary">Sync Comment Counts</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        This will scan all posts and fix their <code>commentCount</code> to match the actual number of comments in Firestore.
      </p>
      <Button onClick={runSync} disabled={running || done} className="bg-primary text-white rounded-xl w-full h-11">
        {running ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Running...</> : done ? '✅ Done' : 'Run Sync'}
      </Button>
      {log.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-xs font-mono space-y-1 max-h-60 overflow-y-auto">
          {log.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      )}
    </div>
  );
}
