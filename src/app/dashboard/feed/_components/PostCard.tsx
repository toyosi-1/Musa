import { formatDistanceToNow } from 'date-fns';
import type { User, FeedPost, FeedComment } from '@/types/user';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { getInitials, getRoleBadgeColor, formatRoleLabel } from './feedHelpers';

export interface PostCardProps {
  post: FeedPost;
  currentUser: User | null;
  comments: FeedComment[] | undefined;
  commentText: string;
  expanded: boolean;
  loadingComments: boolean;
  menuOpen: boolean;
  deleting: boolean;
  onToggleMenu: (postId: string | null) => void;
  onDeletePost: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onCommentTextChange: (postId: string, text: string) => void;
  onAddComment: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onLike: (postId: string) => void;
  onDislike: (postId: string) => void;
}

export function PostCard({
  post,
  currentUser,
  comments,
  commentText,
  expanded,
  loadingComments,
  menuOpen,
  deleting,
  onToggleMenu,
  onDeletePost,
  onToggleComments,
  onCommentTextChange,
  onAddComment,
  onDeleteComment,
  onLike,
  onDislike,
}: PostCardProps) {
  const canDelete = currentUser &&
    (post.authorId === currentUser.uid ||
      currentUser.role === 'admin' ||
      currentUser.role === 'estate_admin');
  const likeCount = post.likes ? Object.keys(post.likes).length : 0;
  const dislikeCount = post.dislikes ? Object.keys(post.dislikes).length : 0;
  const liked = !!(currentUser && post.likes && post.likes[currentUser.uid]);
  const disliked = !!(currentUser && post.dislikes && post.dislikes[currentUser.uid]);
  const commentList = comments || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
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
                {formatRoleLabel(post.authorRole)}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {canDelete && (
          <div className="relative">
            <button
              onClick={() => onToggleMenu(menuOpen ? null : post.id)}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-[140px]">
                <button
                  onClick={() => onDeletePost(post.id)}
                  disabled={deleting}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {post.imageUrl && (
        <div className="px-4 pb-3">
          <img
            src={post.imageUrl}
            alt="Post image"
            className="w-full rounded-xl object-cover max-h-[400px] bg-gray-100 dark:bg-gray-700"
            loading="lazy"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center border-t border-gray-100 dark:border-gray-700 px-2 py-1">
        <button
          onClick={() => onToggleComments(post.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            expanded
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{post.commentCount || 0}</span>
        </button>

        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            liked
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z M3 15h2v6H3z" />
          </svg>
          <span>{likeCount}</span>
        </button>

        <button
          onClick={() => onDislike(post.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            disliked
              ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={disliked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z M21 4h-2v6h2V4z" />
          </svg>
          <span>{dislikeCount}</span>
        </button>

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

      {/* Comments */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {currentUser ? getInitials(currentUser.displayName || '?') : '?'}
            </div>
            <input
              type="text"
              value={commentText}
              onChange={(e) => onCommentTextChange(post.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onAddComment(post.id);
                }
              }}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => onAddComment(post.id)}
              disabled={!commentText.trim()}
              className="p-2 rounded-full bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>

          {loadingComments ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {commentList.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">No comments yet</p>
              ) : (
                commentList.map((comment) => {
                  const canDeleteComment = !!currentUser && (
                    comment.authorId === currentUser.uid ||
                    currentUser.role === 'admin' ||
                    currentUser.role === 'estate_admin'
                  );
                  return (
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
                      {canDeleteComment && (
                        <button
                          onClick={() => onDeleteComment(post.id, comment.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                          title="Delete comment"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
