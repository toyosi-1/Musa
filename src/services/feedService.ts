import { getFirebaseDatabase, getFirebaseStorage } from '@/lib/firebase';
import { ref, push, set, get, update, remove, query, orderByChild, limitToLast, onValue, off, DataSnapshot } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FeedPost, FeedComment, UserRole } from '@/types/user';

// Compress an image file before upload
const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to compress image'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Upload an image to Firebase Storage
export const uploadFeedImage = async (
  estateId: string,
  postId: string,
  file: File
): Promise<string> => {
  const storage = await getFirebaseStorage();
  const compressed = await compressImage(file);
  const imageRef = storageRef(storage, `estateFeed/${estateId}/${postId}/${Date.now()}.jpg`);
  await uploadBytes(imageRef, compressed, { contentType: 'image/jpeg' });
  return getDownloadURL(imageRef);
};

// Create a new post
export const createPost = async (
  estateId: string,
  authorId: string,
  authorName: string,
  authorRole: UserRole,
  content: string,
  imageFile?: File | null
): Promise<FeedPost> => {
  const db = await getFirebaseDatabase();
  const postsRef = ref(db, `estateFeed/${estateId}/posts`);
  const newPostRef = push(postsRef);

  if (!newPostRef.key) {
    throw new Error('Failed to generate post ID');
  }

  let imageUrl: string | undefined;
  if (imageFile) {
    try {
      imageUrl = await uploadFeedImage(estateId, newPostRef.key, imageFile);
    } catch (uploadErr: any) {
      console.error('Image upload failed:', uploadErr);
      const msg = uploadErr?.message || '';
      if (msg.includes('storage') || msg.includes('Storage') || msg.includes('bucket') || msg.includes('not found') || msg.includes('does not exist')) {
        throw new Error('Image uploads are not available yet. Please post without an image for now.');
      }
      throw new Error('Failed to upload image. Please try again or post without an image.');
    }
  }

  const post: FeedPost = {
    id: newPostRef.key,
    estateId,
    authorId,
    authorName,
    authorRole,
    content,
    ...(imageUrl ? { imageUrl } : {}),
    likes: {},
    dislikes: {},
    commentCount: 0,
    createdAt: Date.now(),
  };

  await set(newPostRef, post);

  // Log to activity feed
  try {
    const { logActivity } = await import('./activityService');
    await logActivity({
      type: 'feed_post_created',
      description: `Posted in estate feed: "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`,
      timestamp: post.createdAt,
      userId: authorId,
      estateId,
      metadata: { postId: post.id, postContent: content.slice(0, 200) },
    });
  } catch (e) {
    console.warn('[feedService] Activity log failed (non-fatal):', e);
  }

  return post;
};

// Get posts for an estate (most recent first)
export const getEstatePosts = async (
  estateId: string,
  limit: number = 50
): Promise<FeedPost[]> => {
  const db = await getFirebaseDatabase();
  const postsRef = ref(db, `estateFeed/${estateId}/posts`);
  const postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(limit));
  const snapshot = await get(postsQuery);

  if (!snapshot.exists()) return [];

  const posts: FeedPost[] = [];
  snapshot.forEach((child: DataSnapshot) => {
    const post = child.val() as FeedPost;
    post.id = child.key || post.id;
    posts.push(post);
  });

  // Return newest first
  return posts.reverse();
};

// Get posts by a specific user in an estate
export const getUserPosts = async (
  estateId: string,
  userId: string
): Promise<FeedPost[]> => {
  const posts = await getEstatePosts(estateId, 200);
  return posts.filter(post => post.authorId === userId);
};

// Delete a post (author or admin only)
export const deletePost = async (estateId: string, postId: string): Promise<void> => {
  const db = await getFirebaseDatabase();
  // Delete the post
  const postRef = ref(db, `estateFeed/${estateId}/posts/${postId}`);
  await remove(postRef);
  // Delete associated comments
  const commentsRef = ref(db, `estateFeed/${estateId}/comments/${postId}`);
  await remove(commentsRef);
};

// Toggle like on a post
export const toggleLikePost = async (
  estateId: string,
  postId: string,
  userId: string
): Promise<{ liked: boolean }> => {
  const db = await getFirebaseDatabase();
  const likeRef = ref(db, `estateFeed/${estateId}/posts/${postId}/likes/${userId}`);
  const dislikeRef = ref(db, `estateFeed/${estateId}/posts/${postId}/dislikes/${userId}`);

  const likeSnapshot = await get(likeRef);

  if (likeSnapshot.exists()) {
    // Already liked — remove like
    await remove(likeRef);
    return { liked: false };
  } else {
    // Add like and remove dislike if present
    await set(likeRef, true);
    await remove(dislikeRef);
    return { liked: true };
  }
};

// Toggle dislike on a post
export const toggleDislikePost = async (
  estateId: string,
  postId: string,
  userId: string
): Promise<{ disliked: boolean }> => {
  const db = await getFirebaseDatabase();
  const dislikeRef = ref(db, `estateFeed/${estateId}/posts/${postId}/dislikes/${userId}`);
  const likeRef = ref(db, `estateFeed/${estateId}/posts/${postId}/likes/${userId}`);

  const dislikeSnapshot = await get(dislikeRef);

  if (dislikeSnapshot.exists()) {
    // Already disliked — remove dislike
    await remove(dislikeRef);
    return { disliked: false };
  } else {
    // Add dislike and remove like if present
    await set(dislikeRef, true);
    await remove(likeRef);
    return { disliked: true };
  }
};

// Add a comment to a post
export const addComment = async (
  estateId: string,
  postId: string,
  authorId: string,
  authorName: string,
  authorRole: UserRole,
  content: string
): Promise<FeedComment> => {
  const db = await getFirebaseDatabase();
  const commentsRef = ref(db, `estateFeed/${estateId}/comments/${postId}`);
  const newCommentRef = push(commentsRef);

  if (!newCommentRef.key) {
    throw new Error('Failed to generate comment ID');
  }

  const comment: FeedComment = {
    id: newCommentRef.key,
    postId,
    authorId,
    authorName,
    authorRole,
    content,
    createdAt: Date.now(),
  };

  await set(newCommentRef, comment);

  // Increment comment count on the post
  const postCommentCountRef = ref(db, `estateFeed/${estateId}/posts/${postId}/commentCount`);
  const countSnapshot = await get(postCommentCountRef);
  const currentCount = countSnapshot.exists() ? countSnapshot.val() : 0;
  await set(postCommentCountRef, currentCount + 1);

  return comment;
};

// Get comments for a post
export const getPostComments = async (
  estateId: string,
  postId: string
): Promise<FeedComment[]> => {
  const db = await getFirebaseDatabase();
  const commentsRef = ref(db, `estateFeed/${estateId}/comments/${postId}`);
  const commentsQuery = query(commentsRef, orderByChild('createdAt'));
  const snapshot = await get(commentsQuery);

  if (!snapshot.exists()) return [];

  const comments: FeedComment[] = [];
  snapshot.forEach((child: DataSnapshot) => {
    const comment = child.val() as FeedComment;
    comment.id = child.key || comment.id;
    comments.push(comment);
  });

  return comments;
};

// Delete a comment (author or admin only)
export const deleteComment = async (
  estateId: string,
  postId: string,
  commentId: string
): Promise<void> => {
  const db = await getFirebaseDatabase();
  const commentRef = ref(db, `estateFeed/${estateId}/comments/${postId}/${commentId}`);
  await remove(commentRef);

  // Decrement comment count on the post
  const postCommentCountRef = ref(db, `estateFeed/${estateId}/posts/${postId}/commentCount`);
  const countSnapshot = await get(postCommentCountRef);
  const currentCount = countSnapshot.exists() ? countSnapshot.val() : 0;
  if (currentCount > 0) {
    await set(postCommentCountRef, currentCount - 1);
  }
};

// Subscribe to real-time post updates for an estate
export const subscribeToEstateFeed = (
  estateId: string,
  callback: (posts: FeedPost[]) => void,
  limit: number = 50
): (() => void) => {
  let unsubscribed = false;

  const setupListener = async () => {
    const db = await getFirebaseDatabase();
    const postsRef = ref(db, `estateFeed/${estateId}/posts`);
    const postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(limit));

    const listener = onValue(postsQuery, (snapshot: DataSnapshot) => {
      if (unsubscribed) return;
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const posts: FeedPost[] = [];
      snapshot.forEach((child: DataSnapshot) => {
        const post = child.val() as FeedPost;
        post.id = child.key || post.id;
        posts.push(post);
      });

      callback(posts.reverse());
    });

    return () => {
      unsubscribed = true;
      off(postsQuery);
    };
  };

  let cleanup: (() => void) | undefined;
  setupListener().then(fn => {
    cleanup = fn;
    if (unsubscribed && cleanup) cleanup();
  });

  return () => {
    unsubscribed = true;
    if (cleanup) cleanup();
  };
};
