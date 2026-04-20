"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FeedPost, FeedComment } from '@/types/user';
import {
  createPost,
  getUserPosts,
  deletePost,
  toggleLikePost,
  toggleDislikePost,
  addComment,
  getPostComments,
  deleteComment,
  subscribeToEstateFeed,
} from '@/services/feedService';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { PostCard } from './_components/PostCard';
import { CreatePostModal } from './_components/CreatePostModal';
import { FeedSkeleton } from './_components/FeedSkeleton';
import { FeedEmptyState, NoEstateAssigned } from './_components/FeedEmptyState';

export default function FeedPage() {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, FeedComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [menuOpenPost, setMenuOpenPost] = useState<string | null>(null);

  const estateId = currentUser?.estateId;

  // Real-time feed subscription for the "all" tab.
  useEffect(() => {
    if (!estateId) return;
    const unsubscribe = subscribeToEstateFeed(estateId, (newPosts) => {
      setPosts(newPosts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [estateId]);

  // One-shot fetch for the "my" tab.
  useEffect(() => {
    if (activeTab !== 'my' || !estateId || !currentUser) return;
    loadMyPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, estateId, currentUser]);

  const loadMyPosts = async () => {
    if (!estateId || !currentUser) return;
    setLoading(true);
    try {
      const myPosts = await getUserPosts(estateId, currentUser.uid);
      setPosts(myPosts);
    } catch (err) {
      console.error('Error loading my posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (content: string, image: File | null) => {
    if (!estateId || !currentUser) return;
    setCreating(true);
    try {
      await createPost(
        estateId,
        currentUser.uid,
        currentUser.displayName || 'Anonymous',
        currentUser.role,
        content,
        image,
      );
      setShowCreateModal(false);
      if (activeTab === 'my') await loadMyPosts();
    } catch (err: any) {
      console.error('Error creating post:', err);
      toast.error(err?.message || 'Failed to create post. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!estateId) return;
    setDeletingPost(postId);
    try {
      await deletePost(estateId, postId);
      setMenuOpenPost(null);
      if (activeTab === 'my') await loadMyPosts();
    } catch (err) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post.');
    } finally {
      setDeletingPost(null);
    }
  };

  const handleLike = async (postId: string) => {
    if (!estateId || !currentUser) return;
    try {
      await toggleLikePost(estateId, postId, currentUser.uid);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDislike = async (postId: string) => {
    if (!estateId || !currentUser) return;
    try {
      await toggleDislikePost(estateId, postId, currentUser.uid);
    } catch (err) {
      console.error('Error toggling dislike:', err);
    }
  };

  const toggleComments = async (postId: string) => {
    const wasExpanded = expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: !wasExpanded }));
    if (!wasExpanded && !postComments[postId]) {
      await loadComments(postId);
    }
  };

  const loadComments = async (postId: string) => {
    if (!estateId) return;
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const comments = await getPostComments(estateId, postId);
      setPostComments((prev) => ({ ...prev, [postId]: comments }));
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleCommentTextChange = (postId: string, text: string) => {
    setCommentTexts((prev) => ({ ...prev, [postId]: text }));
  };

  const handleAddComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!estateId || !currentUser || !text) return;
    try {
      const comment = await addComment(
        estateId,
        postId,
        currentUser.uid,
        currentUser.displayName || 'Anonymous',
        currentUser.role,
        text,
      );
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setCommentTexts((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!estateId) return;
    try {
      await deleteComment(estateId, postId, commentId);
      setPostComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const filteredPosts = searchQuery
    ? posts.filter(
        (p) =>
          p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.authorName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : posts;

  if (!estateId) return <NoEstateAssigned />;

  return (
    <div className="max-w-2xl mx-auto" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/20">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Estate Feed</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Connect with your community</p>
          </div>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`p-2.5 rounded-xl transition-colors ${
            showSearch
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          aria-label="Search posts"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {showSearch && (
        <div className="mb-4 animate-fade-in">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          All posts
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'my'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          My posts
        </button>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : filteredPosts.length === 0 ? (
        <FeedEmptyState showPersonal={activeTab === 'my'} />
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              comments={postComments[post.id]}
              commentText={commentTexts[post.id] || ''}
              expanded={!!expandedComments[post.id]}
              loadingComments={!!loadingComments[post.id]}
              menuOpen={menuOpenPost === post.id}
              deleting={deletingPost === post.id}
              onToggleMenu={setMenuOpenPost}
              onDeletePost={handleDeletePost}
              onToggleComments={toggleComments}
              onCommentTextChange={handleCommentTextChange}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          ))}
        </div>
      )}

      {/* Floating create button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed right-5 md:right-8 w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-[55]"
        style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Create new post"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <CreatePostModal
        open={showCreateModal}
        currentUser={currentUser}
        creating={creating}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePost}
      />

      {/* Close the per-post overflow menu when clicking outside of it */}
      {menuOpenPost && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpenPost(null)} />
      )}
    </div>
  );
}
