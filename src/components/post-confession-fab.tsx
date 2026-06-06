
"use client"

import { useState, useRef, ChangeEvent } from 'react';
import { Plus, X, ImageIcon, Trash2, Loader2, UserCircle2, EyeOff, Music, Search, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
}

export default function PostConfessionFab() {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const MAX_IMAGES = 5;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Music state
  const [showMusic, setShowMusic] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState<ItunesTrack[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<ItunesTrack | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const searchMusic = async () => {
    if (!musicQuery.trim()) return;
    setMusicLoading(true);
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(musicQuery)}&media=music&limit=10`);
      const data = await res.json();
      setMusicResults(data.results ?? []);
    } catch {
      toast({ title: 'Search failed', description: 'Could not fetch songs.', variant: 'destructive' });
    } finally {
      setMusicLoading(false);
    }
  };

  const togglePreview = (track: ItunesTrack) => {
    if (playingId === track.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingId(null);
      setPlayingId(track.trackId);
    }
  };

  const selectSong = (track: ItunesTrack) => {
    if (audioRef.current) { audioRef.current.pause(); setPlayingId(null); }
    setSelectedSong(track);
    setShowMusic(false);
    setMusicResults([]);
    setMusicQuery('');
  };

  const removeSong = () => {
    if (audioRef.current) { audioRef.current.pause(); setPlayingId(null); }
    setSelectedSong(null);
  };

  const handleSelectImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - selectedImages.length;
    if (remaining <= 0) {
      toast({ title: 'Max 5 images', description: 'You can only attach up to 5 images.', variant: 'destructive' });
      return;
    }

    const toProcess = files.slice(0, remaining);

    // Compress image to max 800px wide and quality 0.7 to stay within Firestore 1MB limit
    const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_W = 800;
          const scale = img.width > MAX_W ? MAX_W / img.width : 1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = url;
      });
    };

    toProcess.forEach(async file => {
      try {
        const compressed = await compressImage(file);
        setSelectedImages(prev => [...prev, compressed]);
      } catch {
        toast({ title: 'Failed to process image', description: file.name, variant: 'destructive' });
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!firestore) return;

    if (content.trim().length === 0) {
      toast({
        title: "Empty confession!",
        description: "Please write something before posting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    const confessionData = {
      content: content.trim(),
      category,
      timestamp: new Date().toISOString(),
      reactions: { heart: 0, thumbsUp: 0, laugh: 0, wow: 0, sad: 0 },
      reportCount: 0,
      status: 'approved',
      commentCount: 0,
      imageUrl: selectedImages.length > 0 ? JSON.stringify(selectedImages) : null,
      isAnonymous,
      authorName: isAnonymous ? null : (user?.displayName ?? user?.email ?? 'Wildcat'),
      authorId: user?.uid ?? null,
      authorPhoto: isAnonymous ? null : (typeof window !== 'undefined' && user ? localStorage.getItem(`avatar-photo-${user.uid}`) : null),
      song: selectedSong ? { title: selectedSong.trackName, artist: selectedSong.artistName, artwork: selectedSong.artworkUrl100, previewUrl: selectedSong.previewUrl } : null,
    };

    addDoc(collection(firestore, 'confessions'), confessionData)
      .then(() => {
        toast({
          title: "Confession submitted!",
          description: "Your post is now live and anonymous.",
        });
        
        // Reset state
        setContent('');
        setCategory('Other');
        setSelectedImages([]);
        setSelectedSong(null);
        setIsAnonymous(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsOpen(false);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'confessions',
          operation: 'create',
          requestResourceData: confessionData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 w-14 h-14 rounded-full bg-secondary hover:bg-secondary/90 shadow-lg flex items-center justify-center p-0 group z-40"
          aria-label="Post Confession"
        >
          <Plus className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-300" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2rem] border-none">
        <VisuallyHidden><DialogTitle>New Confession</DialogTitle></VisuallyHidden>
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">New Confession</h2>
          <button onClick={() => setIsOpen(false)} className="text-white hover:opacity-80 transition-opacity">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <Textarea 
              id="confession" 
              placeholder="What's on your mind? Don't worry, we won't tell..."
              className="min-h-[140px] resize-none border-gray-100 bg-gray-50/30 focus-visible:ring-primary rounded-2xl text-base p-4"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-bold text-slate-700">Category</Label>
              <Select value={category} onValueChange={(val) => setCategory(val as Category)} disabled={isSubmitting}>
                <SelectTrigger id="category" className="rounded-xl border-gray-100 bg-white h-12">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Crushes">Crushes</SelectItem>
                  <SelectItem value="Rants">Rants</SelectItem>
                  <SelectItem value="Tea">Tea</SelectItem>
                  <SelectItem value="Memes">Memes</SelectItem>
                  <SelectItem value="Academic">Academic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">
                Add Images <span className="text-muted-foreground font-normal">({selectedImages.length}/{MAX_IMAGES})</span>
              </Label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={isSubmitting}
              />
              {/* Image previews */}
              {selectedImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                      <img src={img} alt={`img-${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={e => handleRemoveImage(e, i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 hover:bg-destructive transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {selectedImages.length < MAX_IMAGES && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleSelectImageClick}
                  onKeyDown={e => e.key === 'Enter' && handleSelectImageClick()}
                  className={`w-full border-2 border-dashed border-gray-200 rounded-xl h-10 flex items-center justify-center bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center text-muted-foreground hover:text-primary transition-colors gap-1">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-xs font-semibold">Add Image</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Music picker */}
          <div className="space-y-2">
            {/* Selected song display */}
            {selectedSong ? (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
                <img src={selectedSong.artworkUrl100} alt="artwork" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-800 truncate">{selectedSong.trackName}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedSong.artistName}</p>
                </div>
                <button type="button" onClick={removeSong} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMusic(p => !p)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-100 transition-colors w-full"
              >
                <Music className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-gray-600">Add a song</span>
              </button>
            )}

            {/* Music search panel */}
            {showMusic && !selectedSong && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="flex gap-2 p-3 border-b border-gray-100">
                  <Input
                    placeholder="Search for a song..."
                    value={musicQuery}
                    onChange={e => setMusicQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchMusic()}
                    className="h-9 rounded-xl text-sm"
                  />
                  <Button type="button" size="sm" onClick={searchMusic} disabled={musicLoading} className="rounded-xl bg-primary text-white shrink-0">
                    {musicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {musicResults.length === 0 && !musicLoading && (
                    <p className="text-xs text-muted-foreground text-center py-4 italic">Search for a song to add to your post</p>
                  )}
                  {musicResults.map(track => (
                    <div key={track.trackId} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer" onClick={() => selectSong(track)}>
                      <img src={track.artworkUrl100} alt="art" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate">{track.trackName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{track.artistName}</p>
                      </div>
                      {track.previewUrl && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); togglePreview(track); }}
                          className="text-primary hover:bg-primary/10 rounded-full p-1.5 shrink-0"
                        >
                          {playingId === track.trackId ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Anonymous toggle */}
          <button
            type="button"
            onClick={() => setIsAnonymous(prev => !prev)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
              isAnonymous
                ? 'border-primary/20 bg-primary/5'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              {isAnonymous
                ? <EyeOff className="w-5 h-5 text-primary" />
                : <UserCircle2 className="w-5 h-5 text-gray-400" />
              }
              <div className="text-left">
                <p className="text-sm font-bold text-slate-700">
                  {isAnonymous ? 'Anonymous' : 'Public'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAnonymous
                    ? 'Your identity is hidden'
                    : `Visible as ${user?.displayName ?? user?.email ?? 'Wildcat'}`}
                </p>
              </div>
            </div>
            {/* Toggle pill — ON (right) = anonymous, OFF (left) = public */}
            <div className={`w-11 h-6 rounded-full transition-colors relative ${isAnonymous ? 'bg-primary' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${isAnonymous ? 'left-[22px]' : 'left-0.5'}`} />
            </div>
          </button>

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-14 rounded-full text-lg shadow-lg hover:shadow-xl transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isAnonymous ? (
              "Post Anonymously"
            ) : (
              "Post as Yourself"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
