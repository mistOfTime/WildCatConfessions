"use client"

import { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORIES: Category[] = ['Crushes', 'Rants', 'Tea', 'Memes', 'Academic', 'Other'];

interface CategoryFilterProps {
  selectedCategory: Category | 'All';
  onSelect: (category: Category | 'All') => void;
}

export default function CategoryFilter({ selectedCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
      <Button
        variant={selectedCategory === 'All' ? 'default' : 'outline'}
        onClick={() => onSelect('All')}
        className={cn(
          "rounded-full px-5 py-1 text-xs h-8 font-medium whitespace-nowrap",
          selectedCategory === 'All' ? "bg-primary text-white" : "text-muted-foreground hover:border-primary"
        )}
      >
        All Feed
      </Button>
      {CATEGORIES.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? 'default' : 'outline'}
          onClick={() => onSelect(category)}
          className={cn(
            "rounded-full px-5 py-1 text-xs h-8 font-medium whitespace-nowrap",
            selectedCategory === category ? "bg-primary text-white" : "text-muted-foreground hover:border-primary"
          )}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}