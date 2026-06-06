import { Confession, Comment } from './types';

export const MOCK_CONFESSIONS: Confession[] = [
  {
    id: '1',
    content: "To the girl in the red scarf at the library yesterday: You have the most amazing smile. I was too nervous to say anything, but I've been thinking about it all day.",
    category: 'Crushes',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    reactions: { heart: 24, thumbsUp: 5, laugh: 0, wow: 2 },
    reportCount: 0,
    status: 'approved',
    commentCount: 3,
  },
  {
    id: '2',
    content: "Why are the laundry machines in Baker Hall always broken? I've been trying to wash my socks for three days now. This is a cry for help.",
    category: 'Rants',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    reactions: { heart: 2, thumbsUp: 18, laugh: 12, wow: 4 },
    reportCount: 0,
    status: 'approved',
    commentCount: 8,
  },
  {
    id: '3',
    content: "Did anyone else see Professor Smith trip over his own laptop charger today? I felt bad but it was objectively hilarious.",
    category: 'Memes',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    reactions: { heart: 1, thumbsUp: 0, laugh: 45, wow: 8 },
    reportCount: 0,
    status: 'approved',
    commentCount: 1,
  },
  {
    id: '4',
    content: "The dining hall pizza is actually getting better? Or am I just becoming more desperate for edible food? Discuss.",
    category: 'Tea',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    reactions: { heart: 5, thumbsUp: 2, laugh: 15, wow: 1 },
    reportCount: 1,
    status: 'approved',
    commentCount: 12,
  }
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    confessionId: '1',
    content: "Go for it next time! Library girl is actually really nice.",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'c2',
    confessionId: '1',
    content: "I think I know who you're talking about. She's there every Tuesday.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    parentId: 'c1'
  }
];
