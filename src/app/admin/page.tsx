"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { ShieldCheck, Flag, CheckCircle, XCircle, Trash2, AlertCircle, Loader2, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Confession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';

const ADMIN_UID = '0uxVCdYODobC2NSVU2tdTUyRxyN2';

export default function AdminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loadingConfessions, setLoadingConfessions] = useState(true);
  const [selected, setSelected] = useState<Confession | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.uid !== ADMIN_UID) router.push('/');
  }, [user, loading]);

  // Load flagged confessions from Firestore in real-time
  useEffect(() => {
    if (!firestore || !user || user.uid !== ADMIN_UID) return;
    const q = query(
      collection(firestore, 'confessions'),
      where('reportCount', '>', 0)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Confession));
      setConfessions(items.sort((a, b) => b.reportCount - a.reportCount));
      setLoadingConfessions(false);
    }, () => setLoadingConfessions(false));
    return () => unsub();
  }, [firestore, user]);

  const handleApprove = async (id: string) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'confessions', id), { status: 'approved', reportCount: 0 });
    setSelected(null);
    toast({ title: '✅ Confession approved', description: 'Cleared and kept in the feed.' });
  };

  const handleReject = async (id: string) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'confessions', id), { status: 'rejected', reportCount: 0 });
    setSelected(null);
    toast({ title: '🚫 Confession rejected', description: 'Removed from the feed.', variant: 'destructive' });
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'confessions', id));
    setSelected(null);
    toast({ title: '🗑️ Confession deleted', description: 'Permanently deleted.', variant: 'destructive' });
  };

  if (loading || !user || user.uid !== ADMIN_UID) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-secondary shrink-0" />
            <span>Moderator Dashboard</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage reports and maintain community standards.</p>
        </div>
        <Link href="/" className="self-start sm:self-auto">
          <Button variant="outline" size="sm">Back to Feed</Button>
        </Link>
      </div>

      {/* Pending count */}
      <div className="mb-8">
        <div className="rounded-lg border-l-4 border-l-secondary bg-white px-4 py-3 shadow-sm w-48">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pending Reports</div>
          <div className="text-2xl font-bold text-secondary">{confessions.length}</div>
        </div>
      </div>

      {/* Confessions Under Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <Flag className="w-5 h-5 text-destructive" />
            <span>Confessions Under Review</span>
          </CardTitle>
          <CardDescription>
            These items have been flagged by users.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loadingConfessions ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="flex flex-col divide-y sm:hidden">
                {confessions.length === 0 && (
                  <p className="text-center py-10 text-muted-foreground italic px-4">
                    Great news! There are no flagged confessions requiring attention.
                  </p>
                )}
                {confessions.map((confession) => (
                  <div key={confession.id} className="px-4 py-4 flex flex-col gap-2">
                    <p className="text-sm font-medium line-clamp-3">{confession.content}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{confession.category}</Badge>
                      <div className="flex items-center text-destructive font-semibold text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {confession.reportCount} report{confession.reportCount !== 1 ? 's' : ''}
                      </div>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pending</Badge>
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Button onClick={() => setSelected(confession)} variant="ghost" size="sm" className="text-primary hover:bg-primary/5 gap-1">
                        <Eye className="w-4 h-4" /> View
                      </Button>
                      <Button onClick={() => handleApprove(confession.id)} variant="ghost" size="sm" className="text-green-600 hover:bg-green-50 hover:text-green-700 gap-1">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </Button>
                      <Button onClick={() => handleReject(confession.id)} variant="ghost" size="sm" className="text-destructive hover:bg-red-50 hover:text-red-700 gap-1">
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                      <Button onClick={() => handleDelete(confession.id)} variant="ghost" size="sm" className="text-muted-foreground hover:bg-gray-100 gap-1">
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[380px]">Confession Content</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Reports</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {confessions.map((confession) => (
                      <TableRow key={confession.id}>
                        <TableCell className="font-medium">
                          <p className="line-clamp-2">{confession.content}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{confession.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-destructive font-semibold">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {confession.reportCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pending</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button onClick={() => setSelected(confession)} variant="ghost" size="icon" className="text-primary hover:bg-primary/5" title="View full">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleApprove(confession.id)} variant="ghost" size="icon" className="text-green-600 hover:bg-green-50 hover:text-green-700" title="Approve">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleReject(confession.id)} variant="ghost" size="icon" className="text-destructive hover:bg-red-50 hover:text-red-700" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleDelete(confession.id)} variant="ghost" size="icon" className="text-muted-foreground hover:bg-gray-100" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {confessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">
                          Great news! There are no flagged confessions requiring attention.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Full Confession Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-destructive" />
              Flagged Confession
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 pt-1">
              <Badge variant="secondary">{selected?.category}</Badge>
              <span className="flex items-center text-destructive text-xs font-semibold">
                <AlertCircle className="w-3 h-3 mr-1" />
                {selected?.reportCount} report{(selected?.reportCount ?? 0) !== 1 ? 's' : ''}
              </span>
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-foreground leading-relaxed py-2">{selected?.content}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => handleApprove(selected!.id)} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 gap-1">
              <CheckCircle className="w-4 h-4" /> Approve
            </Button>
            <Button onClick={() => handleReject(selected!.id)} variant="outline" className="text-destructive border-red-200 hover:bg-red-50 gap-1">
              <XCircle className="w-4 h-4" /> Reject
            </Button>
            <Button onClick={() => handleDelete(selected!.id)} variant="destructive" className="gap-1">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
