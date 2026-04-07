"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { FeedPost, FeedComment } from '@/types/user';
import {
  createPost,
  getEstatePosts,
  getUserPosts,
  deletePost,
  toggleLikePost,
  toggleDislikePost,
  addComment,
  getPostComments,
  deleteComment,
  subscribeToEstateFeed,
} from '@/services/feedService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

export default function FeedPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, FeedComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [menuOpenPost, setMenuOpenPost] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const estateId = currentUser?.estateId;

  // Subscribe to real-time feed updates
  useEffect(() => {
    if (!estateId) return;

    const unsubscribe = subscribeToEstateFeed(estateId, (newPosts) => {
      setPosts(newPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [estateId]);

  // Load user-specific posts when switching to "My posts" tab
  useEffect(() => {
    if (activeTab === 'my' && estateId && currentUser) {
      loadMyPosts();
    }
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

  const handleCreatePost = async () => {
    if (!estateId || !currentUser || !newPostContent.trim()) return;
    setCreating(true);
    try {
      await createPost(
        estateId,
        currentUser.uid,
        currentUser.displayName || 'Anonymous',
        currentUser.role,
        newPostContent.trim(),
        selectedImage || null
      );
      setNewPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
      setShowCreateModal(false);
      if (activeTab === 'my') {
        await loadMyPosts();
      }
    } catch (err: any) {
      console.error('Error creating post:', err);
      const errorMessage = err?.message || 'Failed to create post. Please try again.';
      alert(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB.');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeletePost = async (postId: string) => {
    if (!estateId) return;
    setDeletingPost(postId);
    try {
      await deletePost(estateId, postId);
      setMenuOpenPost(null);
      if (activeTab === 'my') {
        await loadMyPosts();
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post.');
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
    const isExpanded = expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded && !postComments[postId]) {
      await loadComments(postId);
    }
  };

  const loadComments = async (postId: string) => {
    if (!estateId) return;
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const comments = await getPostComments(estateId, postId);
      setPostComments(prev => ({ ...prev, [postId]: comments }));
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
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
        text
      );
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!estateId) return;
    try {
      await deleteComment(estateId, postId, commentId);
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(c => c.id !== commentId),
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const canDeletePost = (post: FeedPost) => {
    if (!currentUser) return false;
    return post.authorId === currentUser.uid ||
      currentUser.role === 'admin' ||
      currentUser.role === 'estate_admin';
  };

  const getLikeCount = (post: FeedPost) => post.likes ? Object.keys(post.likes).length : 0;
  const getDislikeCount = (post: FeedPost) => post.dislikes ? Object.keys(post.dislikes).length : 0;
  const isLiked = (post: FeedPost) => currentUser ? !!(post.likes && post.likes[currentUser.uid]) : false;
  const isDisliked = (post: FeedPost) => currentUser ? !!(post.dislikes && post.dislikes[currentUser.uid]) : false;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'estate_admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'guard': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const filteredPosts = searchQuery
    ? posts.filter(p =>
        p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  if (!estateId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">No Estate Assigned</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">You need to be assigned to an estate to view the feed.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
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

      {/* Search Bar */}
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

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="h-7 w-7 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
            {activeTab === 'my' ? "You haven't posted yet" : 'No posts yet'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activeTab === 'my' ? 'Create your first post!' : 'Be the first to post in your estate feed.'}
          </p>
        </div>
      ) : (
        /* Post List */
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between p-4 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {getInitials(post.authorName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {post.authorName}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getRoleBadgeColor(post.authorRole)}`}>
                        {post.authorRole === 'estate_admin' ? 'Admin' : post.authorRole.charAt(0).toUpperCase() + post.authorRole.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Post Menu */}
                {canDeletePost(post) && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenPost(menuOpenPost === post.id ? null : post.id)}
                      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {menuOpenPost === post.id && (
                      <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-[140px]">
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deletingPost === post.id}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          {deletingPost === post.id ? 'Deleting...' : 'Delete Post'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Post Content */}
              <div className="px-4 pb-2">
                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              {/* Post Image */}
              {post.imageUrl && (
                <div className="px-4 pb-3">
                  <img
                    src={post.imageUrl}
                    alt="Post image"
                    className="w-full rounded-xl object-cover max-h-[400px] bg-gray-100 dark:bg-gray-700 cursor-pointer"
                    onClick={() => {}}
                    loading="lazy"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center border-t border-gray-100 dark:border-gray-700 px-2 py-1">
                {/* Comment Button */}
                <button
                  onClick={() => toggleComments(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    expandedComments[post.id]
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{post.commentCount || 0}</span>
                </button>

                {/* Like Button */}
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isLiked(post)
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isLiked(post) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M3 15h2v6H3z" />
                  </svg>
                  <span>{getLikeCount(post)}</span>
                </button>

                {/* Dislike Button */}
                <button
                  onClick={() => handleDislike(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isDisliked(post)
                      ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isDisliked(post) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z M21 4h-2v6h2V4z" />
                  </svg>
                  <span>{getDislikeCount(post)}</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `Post by ${post.authorName}`,
                        text: post.content.slice(0, 100),
                      }).catch(() => {});
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ml-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>

              {/* Comments Section */}
              {expandedComments[post.id] && (
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  {/* Comment Input */}
                  <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {currentUser ? getInitials(currentUser.displayName || '?') : '?'}
                    </div>
                    <input
                      type="text"
                      value={commentTexts[post.id] || ''}
                      onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(post.id);
                        }
                      }}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentTexts[post.id]?.trim()}
                      className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>

                  {/* Comments List */}
                  {loadingComments[post.id] ? (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {(postComments[post.id] || []).length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-4">No comments yet</p>
                      ) : (
                        (postComments[post.id] || []).map((comment) => (
                          <div key={comment.id} className="flex gap-2.5 p-3">
                            <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {getInitials(comment.authorName)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{comment.authorName}</span>
                                <span className="text-[10px] text-gray-400">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{comment.content}</p>
                            </div>
                            {currentUser && (comment.authorId === currentUser.uid || currentUser.role === 'admin' || currentUser.role === 'estate_admin') && (
                              <button
                                onClick={() => handleDeleteComment(post.id, comment.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                                title="Delete comment"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating Create Post Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-40"
        aria-label="Create new post"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowCreateModal(false)}>
          <div
            className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Post</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {currentUser ? getInitials(currentUser.displayName || '?') : '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{currentUser?.displayName}</p>
                  <p className="text-xs text-gray-400 capitalize">{currentUser?.role}</p>
                </div>
              </div>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's on your mind? Share updates, announcements, or anything with your estate..."
                className="w-full min-h-[120px] p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                autoFocus
              />

              {/* Image Preview */}
              {imagePreview && (
                <div className="relative mt-3">
                  <img
                    src={imagePreview}
                    alt="Selected image"
                    className="w-full max-h-[200px] object-cover rounded-xl"
                  />
                  <button
                    onClick={removeSelectedImage}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
              {/* Add Photo Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photo
              </button>

              {/* Post Button */}
              <button
                onClick={handleCreatePost}
                disabled={creating || !newPostContent.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-sm rounded-xl disabled:opacity-50 shadow-md shadow-green-500/20 transition-all"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {selectedImage ? 'Uploading...' : 'Posting...'}
                  </span>
                ) : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu when clicking outside */}
      {menuOpenPost && (
        <div className="fixed inset-0 z-[5]" onClick={() => setMenuOpenPost(null)} />
      )}
    </div>
  );
}
