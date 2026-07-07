"use client"

import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Flag, MoreVertical, ChevronLeft, ChevronRight, X, Music, Pin, PinOff, Bookmark, Trash2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Confession } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, setDoc, deleteDoc, getDoc, runTransaction, getDocs, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ConfessionCardProps {
  confession: Confession;
}

const ADMIN_UID = '0uxVCdYODobC2NSVU2tdTUyRxyN2';

function SongCard({ song }: { song: { title: string; artist: string; artwork: string; previewUrl: string } }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // No auto-play — user must click play
    if (!song.previewUrl) return;
    audioRef.current = new Audio(song.previewUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;
    return () => {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.src = '';
    };
  }, [song.previewUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="flex items-center gap-2 mt-1.5 overflow-hidden max-w-[220px]">
      <img src={song.artwork} alt="artwork" className="w-5 h-5 rounded-sm object-cover shrink-0" />
      <button onClick={togglePlay} className="shrink-0 text-primary hover:opacity-70 transition-opacity">
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        )}
      </button>
      <div className="overflow-hidden flex-1">
        <div className={cn("whitespace-nowrap inline-block text-[11px] font-semibold text-primary", playing && "animate-[marquee_8s_linear_infinite]")}>
          {song.title} · {song.artist} &nbsp;&nbsp;&nbsp; {song.title} · {song.artist}
        </div>
      </div>
    </div>
  );
}

function PhotoGallery({ imageUrl, imageUrls }: { imageUrl?: string | null; imageUrls?: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  let imgs: string[] = [];
  if (imageUrls?.length) {
    imgs = imageUrls;
  } else if (imageUrl) {
    try { imgs = JSON.parse(imageUrl); } catch { imgs = [imageUrl]; }
  }
  if (!imgs.length) return null;

  const openLightbox = (e: React.MouseEvent, i: number) => { e.preventDefault(); setLightboxIndex(i); };
  const closeLightbox = () => setLightboxIndex(null);
  const prev = (e: React.MouseEvent) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i - 1 + imgs.length) % imgs.length : 0); };
  const next = (e: React.MouseEvent) => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i + 1) % imgs.length : 0); };

  return (
    <>
      <div className={cn("mt-3 rounded-2xl overflow-hidden",
        imgs.length === 1 ? "" :
        imgs.length === 2 ? "grid grid-cols-2 gap-1" :
        imgs.length === 3 ? "grid gap-1" :
        "grid grid-cols-2 gap-1"
      )}
      style={imgs.length === 3 ? { gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto' } : undefined}
      >
        {imgs.slice(0, 4).map((img, i) => (
          <div
            key={i}
            className={cn(
              "relative cursor-pointer overflow-hidden bg-gray-100",
              imgs.length === 1 ? "rounded-2xl" : "",
              imgs.length >= 2 && imgs.length !== 3 ? "aspect-square" : "",
              imgs.length === 3 && i === 0 ? "row-span-2 aspect-square" : "",
              imgs.length === 3 && i !== 0 ? "aspect-square" : "",
            )}
            onClick={e => openLightbox(e, i)}
          >
            <img src={img} alt={`img-${i}`} className={cn("w-full hover:opacity-95 transition-opacity", imgs.length === 1 ? "h-auto" : "h-full object-cover")} />
            {i === 3 && imgs.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-2xl font-black">+{imgs.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 z-10">
            <X className="w-6 h-6" />
          </button>
          {imgs.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 z-10">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={next} className="absolute right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 z-10">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <img src={imgs[lightboxIndex]} alt="full" className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <div className="absolute bottom-4 text-white text-sm font-medium">{lightboxIndex + 1} / {imgs.length}</div>
        </div>
      )}
    </>
  );
}
function getAnonName(confessionId: string): string {
  const num = confessionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `Wildcat${(num % 9000) + 1000}`;
}

export default function ConfessionCard({ confession }: ConfessionCardProps) {
  const [reactions, setReactions] = useState({ sad: 0, ...confession.reactions });
  const [reactedType, setReactedType] = useState<keyof typeof reactions | null>(null);
  const [reported, setReported] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [pinned, setPinned] = useState(confession.isPinned ?? false);
  const [saved, setSaved] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const [reactors, setReactors] = useState<{ name: string; emoji: string; photo?: string | null; isAdmin?: boolean }[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const reactionRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Load this user's existing reaction + live counts from Firestore
  useEffect(() => {
    if (!firestore || !user) return;
    // Load user's reaction
    const reactionRef = doc(firestore, 'confessions', confession.id, 'userReactions', user.uid);
    getDoc(reactionRef).then(snap => {
      if (snap.exists()) setReactedType(snap.data().type as keyof typeof reactions);
    });
    // Load saved state
    const saveRef = doc(firestore, 'users', user.uid, 'savedPosts', confession.id);
    getDoc(saveRef).then(snap => setSaved(snap.exists()));
    // Load live reaction counts from Firestore (so they don't reset on remount)
    getDoc(doc(firestore, 'confessions', confession.id)).then(snap => {
      if (snap.exists() && snap.data().reactions) {
        setReactions({ sad: 0, ...snap.data().reactions });
      }
    });
  }, [firestore, user]);

  // Close reaction popup when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (reactionRef.current && !reactionRef.current.contains(e.target as Node)) {
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleReact = async (type: keyof typeof reactions) => {
    if (!firestore || !user || reacting) return;
    setReacting(true);

    // Optimistic update — instant UI feedback
    const prevType = reactedType;
    if (prevType === type) {
      setReactions(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      setReactedType(null);
    } else {
      if (prevType) setReactions(prev => ({ ...prev, [prevType]: Math.max(0, prev[prevType] - 1) }));
      setReactions(prev => ({ ...prev, [type]: prev[type] + 1 }));
      setReactedType(type);
    }

    const reactionRef = doc(firestore, 'confessions', confession.id, 'userReactions', user.uid);
    const confRef = doc(firestore, 'confessions', confession.id);

    try {
      await runTransaction(firestore, async (tx) => {
        const reactionSnap = await tx.get(reactionRef);
        const confSnap = await tx.get(confRef);
        const currentReactions = confSnap.data()?.reactions ?? {};
        const dbPrevType = reactionSnap.exists() ? reactionSnap.data().type as keyof typeof reactions : null;

        if (dbPrevType === type) {
          tx.delete(reactionRef);
          tx.update(confRef, { [`reactions.${type}`]: Math.max(0, (currentReactions[type] ?? 1) - 1) });
        } else {
          if (dbPrevType) {
            tx.update(confRef, { [`reactions.${dbPrevType}`]: Math.max(0, (currentReactions[dbPrevType] ?? 1) - 1) });
          }
          tx.set(reactionRef, {
            type,
            authorName: user.displayName ?? user.email ?? null,
            authorPhoto: typeof window !== 'undefined' ? localStorage.getItem(`avatar-photo-${user.uid}`) : null,
            isAnonymous: false,
            isAdmin: user.uid === ADMIN_UID,
          });
          tx.update(confRef, { [`reactions.${type}`]: (currentReactions[type] ?? 0) + 1 });
        }
      });
    } catch {
      // Revert optimistic update on failure
      setReactions(confession.reactions);
      setReactedType(prevType);
    } finally {
      setReacting(false);
    }
  };

  const handleReport = async () => {
    if (reported || !firestore) return;
    try {
      await updateDoc(doc(firestore, 'confessions', confession.id), {
        reportCount: increment(1),
        status: 'flagged',
      });
      setReported(true);
      toast({ title: '🚩 Reported', description: 'This confession has been flagged for review.' });
    } catch {
      toast({ title: 'Error', description: 'Could not report this confession.', variant: 'destructive' });
    }
  };

  const handlePin = async () => {
    if (!firestore) return;
    const newPinned = !pinned;
    await updateDoc(doc(firestore, 'confessions', confession.id), { isPinned: newPinned });
    setPinned(newPinned);
    toast({ title: newPinned ? '📌 Post pinned' : 'Post unpinned' });
  };

  const handleDelete = async () => {
    if (!firestore || !user) return;
    await deleteDoc(doc(firestore, 'confessions', confession.id));
    toast({ title: '🗑️ Post deleted', description: 'Your confession has been removed.' });
  };

  const handleSave = async () => {
    if (!firestore || !user) return;
    const saveRef = doc(firestore, 'users', user.uid, 'savedPosts', confession.id);
    if (saved) {
      await deleteDoc(saveRef);
      setSaved(false);
      toast({ title: 'Removed from saved' });
    } else {
      await setDoc(saveRef, {
        confessionId: confession.id,
        savedAt: new Date().toISOString(),
        content: confession.content,
        category: confession.category,
        authorId: confession.authorId ?? null,
        isAnonymous: confession.isAnonymous ?? true,
        imageUrl: confession.imageUrl ?? null,
      });
      setSaved(true);
      toast({ title: '🔖 Saved!', description: 'Added to your saved posts.' });
    }
  };

  const handleViewReactors = async () => {
    if (!firestore) return;
    const snap = await getDocs(collection(firestore, 'confessions', confession.id, 'userReactions'));
    const list = await Promise.all(snap.docs.map(async d => {
      const uid = d.id;
      const data = d.data();
      const type = data.type as string;
      const emoji = reactionConfigs.find(r => r.type === type)?.emoji ?? '👍';
      const num = uid.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
      const wildcatName = `Wildcat${(num % 9000) + 1000}`;
      let name = data.authorName ?? wildcatName;
      let photo = data.authorPhoto ?? null;
      const isAdmin = data.isAdmin ?? false;
      if (!photo) {
        try {
          const userSnap = await getDoc(doc(firestore, 'users', uid));
          if (userSnap.exists()) {
            photo = userSnap.data().avatarPhoto ?? null;
            if (!name || name === wildcatName) name = userSnap.data().displayName ?? wildcatName;
          }
        } catch {}
      }
      return { name, emoji, photo, isAdmin };
    }));
    setReactors(list);
    setActiveTab('all');
    setShowReactors(true);
  };

  const reactionConfigs: { type: keyof typeof reactions; emoji: string; activeClass: string }[] = [
    { type: 'heart', emoji: '❤️', activeClass: 'bg-red-100' },
    { type: 'thumbsUp', emoji: '👍', activeClass: 'bg-yellow-100' },
    { type: 'laugh', emoji: '😂', activeClass: 'bg-orange-100' },
    { type: 'wow', emoji: '😮', activeClass: 'bg-blue-100' },
    { type: 'sad', emoji: '😢', activeClass: 'bg-indigo-100' },
  ];

  const isAnon = confession.isAnonymous !== false;
  const displayAuthor = isAnon
    ? getAnonName(confession.id)
    : (confession.authorName ?? 'Wildcat');

  return (
    <Card className={cn("mb-4 overflow-hidden border-gray-100 hover:shadow-md transition-shadow group bg-white rounded-3xl", pinned && "border-primary/30 border-2")}>
      {pinned && (
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-0">
          <Pin className="w-3 h-3 text-primary" />
          <span className="text-[11px] font-bold text-primary uppercase tracking-wide">Pinned post</span>
        </div>
      )}
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden ${isAnon ? 'bg-gray-400' : 'bg-primary'} ${!isAnon && confession.authorId ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={() => !isAnon && confession.authorId && window.location.assign(`/users/${confession.authorId}`)}
          >
            {isAnon
              ? '?'
              : confession.authorPhoto
                ? <img src={confession.authorPhoto} alt="avatar" className="w-full h-full object-cover object-top" />
                : displayAuthor[0]?.toUpperCase()
            }
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              {!isAnon && confession.authorId ? (
                <Link href={`/users/${confession.authorId}`} className="text-sm font-bold text-gray-900 hover:text-primary transition-colors">{displayAuthor}</Link>
              ) : (
                <span className="text-sm font-bold text-gray-900">{displayAuthor}</span>
              )}
              {confession.authorId === ADMIN_UID && !isAnon && (
                <span className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-accent text-accent-foreground font-medium text-[10px] uppercase tracking-wider px-2 rounded-full">
                {confession.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(confession.timestamp), { addSuffix: true })}
              </span>
            </div>
            {confession.song && <SongCard song={confession.song} />}
          </div>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl" onClick={(e) => e.stopPropagation()}>
            {user?.uid === ADMIN_UID && (
              <DropdownMenuItem onClick={handlePin} className="flex items-center space-x-2">
                {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                <span>{pinned ? 'Unpin post' : 'Pin to top'}</span>
              </DropdownMenuItem>
            )}
            {/* Delete own post — visible to post author and admin */}
            {(user?.uid === confession.authorId || user?.uid === ADMIN_UID) && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive flex items-center space-x-2">
                <Trash2 className="w-4 h-4" />
                <span>Delete post</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleReport}
              disabled={reported}
              className="text-destructive flex items-center space-x-2"
            >
              <Flag className="w-4 h-4" />
              <span>{reported ? 'Reported' : 'Report Confession'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="px-4 pb-2 pt-1">
        <Link href={`/confessions/${confession.id}`} className="block">
          <p className="text-[14px] sm:text-[15px] text-gray-800 leading-relaxed">
            {confession.content}
          </p>
        </Link>

        {/* Photo gallery */}
        <PhotoGallery imageUrl={confession.imageUrl} imageUrls={confession.imageUrls} />
      </CardContent>

      <CardFooter className="px-4 py-2 pt-0 flex flex-col gap-2 bg-white border-none">
        {/* Reaction summary row — stacked emoji circles + count, clickable */}
        {Object.values(reactions).reduce((a, b) => a + b, 0) > 0 && (
          <button
            onClick={handleViewReactors}
            className="flex items-center gap-1.5 self-start hover:opacity-80 transition-opacity"
          >
            <div className="flex -space-x-1">
              {reactionConfigs.filter(r => reactions[r.type] > 0).slice(0, 3).map((r, i) => (
                <span key={r.type} className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-sm shadow-sm border border-white" style={{ zIndex: 10 - i }}>
                  {r.emoji}
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {Math.max(0, Object.values(reactions).reduce((a, b) => a + b, 0))}
            </span>
          </button>
        )}

        {/* Action buttons row */}
        <div className="flex items-center gap-2 w-full border-t border-gray-100 pt-2">
          {/* Reaction button with click popup */}
          <div className="relative flex-1" ref={reactionRef}>
            {showReactions && (
              <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 bg-white rounded-full shadow-xl border border-gray-100 px-4 py-2.5 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {reactionConfigs.map((config) => (
                  <button
                    key={config.type}
                    onClick={() => { handleReact(config.type); setShowReactions(false); }}
                    disabled={reacting}
                    title={config.type}
                    className={cn("text-2xl transition-transform duration-150 hover:scale-125 leading-none", reactedType === config.type ? 'scale-125' : '')}
                  >
                    {config.emoji}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowReactions(p => !p)}
              disabled={reacting}
              className={cn(
                "flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-sm font-semibold transition-all",
                reactedType ? 'text-primary' : 'text-gray-500 hover:bg-gray-50'
              )}
            >
              <span className="text-base leading-none">
                {reactedType ? reactionConfigs.find(r => r.type === reactedType)?.emoji : '👍'}
              </span>
              <span className="text-xs">{reactedType ? reactedType.charAt(0).toUpperCase() + reactedType.slice(1) : 'Like'}</span>
            </button>
          </div>

          {/* Comment button */}
          <Link href={`/confessions/${confession.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-semibold">
              {confession.commentCount > 0 ? `${confession.commentCount} Comment${confession.commentCount !== 1 ? 's' : ''}` : 'Comment'}
            </span>
          </Link>

          {/* Save button */}
          <button
            onClick={handleSave}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors", saved ? 'text-primary' : 'text-gray-500 hover:bg-gray-50')}
            title={saved ? 'Unsave' : 'Save'}
          >
            <Bookmark className={cn("w-4 h-4", saved ? "fill-primary" : "")} />
            <span className="text-xs font-semibold">{saved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </CardFooter>

      {/* Reactors dialog — Facebook style with tabs */}
      <Dialog open={showReactors} onOpenChange={setShowReactors}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="text-base font-bold">Reactions</DialogTitle>
          </DialogHeader>
          {/* Tab filters */}
          <div className="flex items-center gap-1 px-4 pt-2 pb-0 overflow-x-auto">
            {(['all', ...reactionConfigs.filter(r => reactors.some(rx => rx.emoji === r.emoji)).map(r => r.type)] as string[]).map(tab => {
              const label = tab === 'all' ? 'All' : reactionConfigs.find(r => r.type === tab)?.emoji ?? tab;
              const count = tab === 'all' ? reactors.length : reactors.filter(r => r.emoji === reactionConfigs.find(rc => rc.type === tab)?.emoji).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn("flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors", activeTab === tab ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-100')}
                >
                  {label} {count}
                </button>
              );
            })}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 px-2 pb-3 mt-2">
            {reactors.filter(r => activeTab === 'all' || r.emoji === reactionConfigs.find(rc => rc.type === activeTab)?.emoji).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 italic">No reactions yet.</p>
            ) : (
              reactors.filter(r => activeTab === 'all' || r.emoji === reactionConfigs.find(rc => rc.type === activeTab)?.emoji).map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 px-2">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 overflow-hidden">
                      {r.photo
                        ? <img src={r.photo} alt="avatar" className="w-full h-full object-cover object-top" />
                        : <span>?</span>
                      }
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 text-sm leading-none">{r.emoji}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 flex-1">{r.name}</span>
                  {r.isAdmin && (
                    <span className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
