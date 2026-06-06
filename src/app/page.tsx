"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfessionCard from '@/components/confession-card';
import CategoryFilter from '@/components/category-filter';
import TrendingSection from '@/components/trending-section';
import PostConfessionFab from '@/components/post-confession-fab';
import { Category, Confession } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { Loader2, RefreshCw, Search, TrendingUp, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.isAnonymous) {
      router.push('/login');
    }
  }, [user, authLoading]);

  const confessionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const baseRef = collection(firestore, 'confessions');
    
    try {
      if (selectedCategory === 'All') {
        return query(baseRef, orderBy('timestamp', 'desc'), limit(50));
      }
      
      // No orderBy to avoid requiring composite index while it builds
      return query(
        baseRef, 
        where('category', '==', selectedCategory),
        limit(50)
      );
    } catch (e) {
      console.error("Error creating query:", e);
      return null;
    }
  }, [firestore, selectedCategory]);

  const { data: confessions, loading, error } = useCollection<Confession>(confessionsQuery);
  const sortedConfessions = confessions
    ? [...confessions]
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
        .filter(c => searchQuery.trim() === '' || c.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : confessions;

  if (authLoading || !user || user.isAnonymous) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-3 py-6 pt-20 max-w-screen-xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Left Column: Feed */}
        <div className="max-w-2xl w-full mx-auto lg:mx-0">
          <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary mb-2 tracking-tight">
              Campus <span className="text-secondary">Confessions</span>
            </h1>
            <p className="text-muted-foreground text-sm mb-4">
              A space for everyone. Students, strangers, and everyone in between.
            </p>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                className="w-full pl-10 bg-gray-50 border-gray-100 focus-visible:ring-1 focus-visible:ring-primary h-10 rounded-full text-sm"
                placeholder="Search confessions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </header>

          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onSelect={setSelectedCategory} 
          />

            {/* Mobile sidebar — shown below filter on small screens */}
          <div className="lg:hidden mt-6 space-y-4">
            {/* Trending Posts */}
            <div className="bg-accent/30 rounded-2xl p-4">
              <p className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" /> Trending Posts
              </p>
              {(() => {
                const THRESHOLD = 10;
                const getTotal = (c: any) => (c.reactions?.heart ?? 0) + (c.reactions?.thumbsUp ?? 0) + (c.reactions?.laugh ?? 0) + (c.reactions?.wow ?? 0);
                const getAnon = (id: string) => `Wildcat${(id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 9000) + 1000}`;
                const trending = (sortedConfessions ?? [])
                  .filter((c: any) => getTotal(c) >= THRESHOLD)
                  .sort((a: any, b: any) => getTotal(b) - getTotal(a))
                  .slice(0, 4);
                return trending.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nothing trending yet. Check back soon.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {trending.map((c: any) => {
                      const author = c.isAnonymous !== false ? getAnon(c.id) : (c.authorName ?? getAnon(c.id));
                      return (
                        <a key={c.id} href={`/confessions/${c.id}`} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-100">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">{author}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{c.content.slice(0, 35)}...</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{getTotal(c)} 🔥</span>
                        </a>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Active Categories */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/5">
              <p className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-secondary" /> Active Categories
              </p>
              {(() => {
                const cats = Array.from(new Set((sortedConfessions ?? []).map((c: any) => c.category)));
                return cats.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No active categories yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {cats.map((cat: any) => (
                      <Badge key={cat} variant="outline" className="bg-white hover:bg-primary hover:text-white transition-colors cursor-pointer border-primary/20">{cat}</Badge>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Community Rules */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/5">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Community Rules</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                {['Say anything, we don\'t judge.', 'Keep real people\'s info out of it.', 'Spill the tea, not the hate.', 'Have fun with it.'].map(rule => (
                  <li key={rule} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium">Loading the tea...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-red-50/50 rounded-3xl border border-red-100 p-8">
                <p className="text-destructive font-bold mb-2">Something went wrong</p>
                <p className="text-sm text-muted-foreground mb-6">
                  We couldn't load the confessions. This usually happens if the community is still being set up.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="rounded-full border-primary text-primary"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Feed
                </Button>
              </div>
            ) : sortedConfessions && sortedConfessions.length > 0 ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {sortedConfessions.map((confession) => (
                  <ConfessionCard key={confession.id} confession={confession} />
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 p-10">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold text-lg">{searchQuery ? 'No results found.' : 'Silence is golden, but tea is better.'}</p>
                <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                  {searchQuery ? `No confessions match "${searchQuery}". Try a different keyword.` : 'No confessions found in this category yet. Be the first to break the silence!'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Desktop only */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TrendingSection confessions={sortedConfessions ?? []} />
            <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Community Rules</h4>
              <ul className="text-xs text-muted-foreground space-y-3 list-none pl-0">
                {['Say anything, we don\'t judge.', 'Keep real people\'s info out of it.', 'Spill the tea, not the hate.', 'Have fun with it.'].map(rule => (
                  <li key={rule} className="flex items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 mr-2 shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
      <PostConfessionFab />
    </div>
  );
}
