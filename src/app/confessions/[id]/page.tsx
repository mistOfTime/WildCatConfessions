"use client"

import { useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, X, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfessionCard from '@/components/confession-card';
import { formatDistanceToNow } from 'date-fns';
import { Comment, Confession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, collection, addDoc, updateDoc, increment, query, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/use-memo-firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const ADMIN_UID = '0uxVCdYODobC2NSVU2tdTUyRxyN2';

// Same user on same post always gets same wildcat name, but different per post
function getWildcatName(authorId: string, confessionId: string): string {
  const seed = confessionId; // use confession ID so name matches the post's wildcat name
  const num = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return `Wildcat${(num % 9000) + 1000}`;
}

export default function ConfessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const confessionRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'confessions', id);
  }, [firestore, id]);

  const { data: confession, loading: loadingConfession } = useDoc<Confession>(confessionRef);

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(collection(firestore, 'confessions', id, 'comments'), orderBy('timestamp', 'asc'));
  }, [firestore, id]);

  const { data: comments, loading: loadingComments } = useCollection<Comment>(commentsQuery);

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loadingConfession) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!confession) {
    return (
      <div className="px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-primary">Confession not found</h2>
        <Link href="/" className="mt-4 inline-block text-secondary hover:underline">Return to feed</Link>
      </div>
    );
  }

  const handlePostComment = () => {
    if (!firestore || !newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const avatarPhoto = user && typeof window !== 'undefined'
      ? localStorage.getItem(`avatar-photo-${user.uid}`)
      : null;

    // Match the post's anonymous setting
    const postIsAnonymous = confession?.isAnonymous !== false;

    const commentData: Omit<Comment, 'id'> = {
      confessionId: id,
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
      parentId: replyingTo?.id || null,
      authorId: user?.uid || null,
      authorName: postIsAnonymous ? null : (user?.displayName ?? user?.email ?? null),
      authorPhoto: postIsAnonymous ? null : avatarPhoto,
      isAnonymous: postIsAnonymous,
    };

    addDoc(collection(firestore, 'confessions', id, 'comments'), commentData)
      .then(() => {
        if (confessionRef) updateDoc(confessionRef, { commentCount: increment(1) });
        toast({ title: replyingTo ? 'Reply posted!' : 'Comment posted!' });
        setNewComment('');
        setReplyingTo(null);
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: `confessions/${id}/comments`,
          operation: 'create',
          requestResourceData: commentData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsSubmitting(false));
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => {
    const replies = comments?.filter(c => c.parentId === comment.id) || [];
    const isAdmin = comment.authorId === ADMIN_UID;
    const isCommentAnon = comment.isAnonymous !== false;
    const displayName = isCommentAnon
      ? getWildcatName(comment.authorId || comment.id, id)
      : (comment.authorName ?? getWildcatName(comment.authorId || comment.id, id));
    const parentComment = comment.parentId ? comments?.find(c => c.id === comment.parentId) : null;
    const parentIsAnon = parentComment?.isAnonymous !== false;
    const parentName = parentComment
      ? parentIsAnon
        ? getWildcatName(parentComment.authorId || parentComment.id, id)
        : (parentComment.authorName ?? getWildcatName(parentComment.authorId || parentComment.id, id))
      : null;

    return (
      <div className={cn('mt-4', depth > 0 ? 'ml-8 sm:ml-12' : '')}>
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-xs font-bold ${isCommentAnon ? 'bg-gray-400' : 'bg-primary'}`}>
            {isCommentAnon
              ? '?'
              : comment.authorPhoto
                ? <img src={comment.authorPhoto} alt="avatar" className="w-full h-full object-cover object-top" />
                : displayName[0]?.toUpperCase()
            }
          </div>

          <div className="flex flex-col items-start max-w-[85%]">
            <div className="bg-white px-4 py-3 rounded-[1.5rem] border border-gray-100 shadow-sm inline-block">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-sm font-bold text-primary">{displayName}</span>
                {isAdmin && comment.isAnonymous === false && (
                  <span className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
                )}
                {parentComment && (
                  <span className="bg-accent text-[10px] text-primary px-2 py-0.5 rounded-md font-medium border border-primary/10">
                    replying to @{parentName}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mb-1">
                {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            </div>

            <button
              onClick={() => {
                setReplyingTo(comment);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className="text-[10px] font-bold text-muted-foreground hover:text-primary mt-1 ml-4"
            >
              Reply
            </button>
          </div>
        </div>

        {replies.map(reply => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    );
  };

  const topLevelComments = comments?.filter(c => !c.parentId) || [];
  const replyDisplayName = replyingTo
    ? getWildcatName(replyingTo.authorId || replyingTo.id, id)
    : '';

  return (
    <div className="max-w-2xl mx-auto px-3 py-6 pb-32">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to feed
      </Link>

      <ConfessionCard confession={confession} />

      <section className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-primary">Comments</h3>
          <div className="flex items-center text-muted-foreground text-sm bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            <MessageSquare className="w-4 h-4 mr-2 text-primary" />
            <span className="font-bold text-primary mr-1">{comments?.length || 0}</span>
            <span className="font-medium">Comments</span>
          </div>
        </div>

        <div className="space-y-6">
          {loadingComments ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : topLevelComments.length > 0 ? (
            topLevelComments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          ) : (
            <div className="text-center py-16 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-200">
              <p className="text-muted-foreground text-sm italic">No comments yet. Be the first to start the conversation!</p>
            </div>
          )}
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 z-50">
        <div className="max-w-2xl mx-auto">
          {replyingTo && (
            <div className="bg-accent/50 px-4 py-2 rounded-t-2xl flex items-center justify-between border-x border-t border-accent mb-[-1px]">
              <span className="text-xs font-bold text-primary">
                Replying to <span className="font-extrabold">{replyDisplayName}</span>
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-primary hover:bg-accent p-1 rounded-full">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="relative flex items-center">
            <Input
              placeholder={replyingTo ? `Reply to ${replyDisplayName}...` : 'Add a comment...'}
              className={cn(
                'w-full bg-gray-100/50 border-gray-100 focus-visible:ring-primary h-14 pr-16 text-base',
                replyingTo ? 'rounded-b-3xl rounded-t-none border-t-0' : 'rounded-full'
              )}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              disabled={isSubmitting}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); }
              }}
            />
            <Button
              size="icon"
              className="absolute right-2 bg-primary hover:bg-primary/90 rounded-full w-10 h-10 shadow-md"
              disabled={!newComment.trim() || isSubmitting}
              onClick={handlePostComment}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-white" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
