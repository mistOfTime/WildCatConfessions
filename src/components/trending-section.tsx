"use client"

import { Flame, TrendingUp, Flame as FireIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Confession, Category } from '@/lib/types';
import Link from 'next/link';

interface TrendingSectionProps {
  confessions: Confession[];
}

const TRENDING_THRESHOLD = 10;

function getTotalReactions(c: Confession) {
  return (c.reactions?.heart ?? 0) + (c.reactions?.thumbsUp ?? 0) + (c.reactions?.laugh ?? 0) + (c.reactions?.wow ?? 0);
}

function getAnonName(id: string): string {
  const num = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `Wildcat${(num % 9000) + 1000}`;
}

export default function TrendingSection({ confessions }: TrendingSectionProps) {
  const trending = confessions
    .filter(c => getTotalReactions(c) >= TRENDING_THRESHOLD)
    .sort((a, b) => getTotalReactions(b) - getTotalReactions(a))
    .slice(0, 4);

  const activeCategories = Array.from(new Set(confessions.map(c => c.category))) as Category[];

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-accent/30">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center space-x-2 text-primary">
            <TrendingUp className="w-4 h-4" />
            <span>Trending Posts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {trending.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nothing trending yet. Check back soon.</p>
          ) : (
            trending.map((confession) => {
              const author = confession.isAnonymous !== false
                ? getAnonName(confession.id)
                : (confession.authorName ?? getAnonName(confession.id));
              const total = getTotalReactions(confession);
              return (
                <Link
                  key={confession.id}
                  href={`/confessions/${confession.id}`}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <FireIcon className="w-3 h-3 text-secondary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors truncate">
                        {author}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{confession.content.slice(0, 40)}...</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-muted-foreground border border-gray-100 shrink-0 ml-2">
                    {total} 🔥
                  </span>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-primary/5">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center space-x-2 text-primary">
            <Flame className="w-4 h-4 text-secondary" />
            <span>Active Categories</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex flex-wrap gap-2">
          {activeCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No active categories yet.</p>
          ) : (
            activeCategories.map((cat) => (
              <Badge key={cat} variant="outline" className="bg-white hover:bg-primary hover:text-white transition-colors cursor-pointer border-primary/20">
                {cat}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
