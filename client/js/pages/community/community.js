import { io } from 'socket.io-client';
import '../../../css/components/footer.css';
import '../../../css/components/navBarUser.css';
import '../../../css/components/preloader.css';
import '../../../css/pages/community/community.css';
import { startSessionChecks, validateSessionAndNavigate } from '../../../utils/sessionUtils.js';
import '../../components/navBarUser.js';
import { setupLogoutListener } from '../../global/logout.js';

setupLogoutListener();

// start session checks on page load
startSessionChecks();

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);
const getAll = (selector) => doc.querySelectorAll(selector);
const get = (selector) => doc.querySelector(selector);

let currentUserId = null;
let currentPhoto = null;

getCurrentUserId().then((userId) => {
  if (userId) {
    const socket = io({ query: { userId } });

    socket.on('newPost', (data) => {
      if (data.status === 'success') {
        fetchPosts(false);
        fetchPopularHashtags(false);
      }
    });

    socket.on('newLike', (data) => {
      if (data.status === 'success') {
        fetchPosts(false);
        fetchPopularHashtags(false);
      }
    });
    socket.on('removeLike', (data) => {
      if (data.status === 'success') {
        fetchPosts(false);
        fetchPopularHashtags(false);
      }
    });
  } else {
    error('User ID could not be retrieved.');
  }
});

doc.addEventListener('DOMContentLoaded', async () => {
  await fetchPopularHashtags();
  await fetchPosts();

  // Dynamically add the profile photo inside the 'profile-pic' element
  const userProfilePic = await getCurrentProfilePicture();
  console.log('User profile pic:', userProfilePic);
  const profilePicElement = getById('create-post-container').querySelector('.profile-pic');

  // Check if there's no image already in the profile-pic container
  if (!profilePicElement.querySelector('img')) {
    const imgElement = doc.createElement('img');
    imgElement.src = userProfilePic; // Set the profile image URL
    imgElement.alt = 'Profile Picture'; // Alt text for accessibility
    profilePicElement.appendChild(imgElement);
  }

  // Add listeners for filters
  setupFilters();
});

function setupFilters() {
  // date filter listeners
  getAll('input[name="date-filter"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      console.log('Date filter changed', e.target.value);
      handleDateFilterChange(e.target);
      fetchPosts();
    });
  });

  // sort filter listeners
  getAll('input[name="sort-filter"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      console.log('Sort filter changed', e.target.value);
      handleSortFilterChange(e.target);
      fetchPosts();
    });
  });

  // hashtag filter listeners
  getAll('.hashtag-filter').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      console.log('Hashtag filter changed');
      fetchPosts(); // re-fetch posts when hashtags change
    });
  });
}

async function createPost() {
  const postInput = getById('post-input');
  const content = postInput.value.trim();

  if (!content) {
    alert('Content is required to create a post.');
    return;
  }

  try {
    const response = await fetch('/user/community/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    const data = await response.json();

    if (data.status === 'success') {
      // update the UI with the new post
      fetchPosts();
      fetchPopularHashtags();
      postInput.value = ''; // clear the input after posting
    } else {
      alert(data.message || 'Failed to create the post.');
    }
  } catch (err) {
    error('Error creating post:', err);
    alert('Error creating post. Please try again later.');
  }
}

async function fetchPopularHashtags(withPreloader = true) {
  try {
    const response = await fetch('/user/community/posts/popular', {
      withPreloader
    });
    const data = await response.json();
    log(data);

    if (data.status !== 'success') {
      throw new Error('Failed to fetch popular hashtags');
    }

    const popularHashtags = data.data.hashtags;
    const hashtagsContainer = getById('popular-hashtags');
    hashtagsContainer.innerHTML = ''; // Clear any existing content

    popularHashtags.forEach((hashtag) => {
      const label = doc.createElement('label');
      label.innerHTML = `<input type="checkbox" class="hashtag-filter" value="${hashtag.hashtag}" />
        #${hashtag.hashtag} (${hashtag.count})`;
      hashtagsContainer.appendChild(label);
    });
  } catch (err) {
    error('Error fetching popular hashtags:', err);
  }
}

async function fetchPosts(withPreloader = true) {
  try {
    const selectedDateFilter = getSelectedDateFilter();
    const selectedSort = getSelectedSort();
    const selectedHashtags = getSelectedHashtags();

    // build the query params dynamically based on selected filters
    const params = new URLSearchParams();
    if (selectedDateFilter) {
      params.append('dateFilter', selectedDateFilter);
    }
    if (selectedSort) {
      params.append('sort', selectedSort);
    }
    if (selectedHashtags.length > 0) {
      params.append('hashtag', selectedHashtags.join(','));
    }

    const response = await fetch(`/user/community/posts?${params.toString()}`, { withPreloader });
    const data = await response.json();
    if (data.status !== 'success') {
      throw new Error('Failed to fetch posts');
    }

    const posts = data.data.posts;
    renderPosts(posts);
  } catch (err) {
    error('Error fetching posts:', err);
    renderPosts(null);
  }
}

function getSelectedDateFilter() {
  const selectedDateFilter = Array.from(getAll('input[name="date-filter"]:checked')).map((checkbox) => checkbox.value);

  if (selectedDateFilter.length === 1) {
    return selectedDateFilter[0];
  }

  return null;
}

function getSelectedSort() {
  const selectedSort = Array.from(getAll('input[name="sort-filter"]:checked')).map((checkbox) => checkbox.value);

  if (selectedSort.length === 1) {
    return selectedSort[0];
  }

  return null;
}

function getSelectedHashtags() {
  return Array.from(getAll('.hashtag-filter:checked')).map((checkbox) => checkbox.value);
}

function handleDateFilterChange(target) {
  if (target.checked) {
    getAll('input[name="date-filter"]').forEach((checkbox) => {
      if (checkbox !== target) {
        checkbox.checked = false;
      }
    });
    fetchPosts();
  }
}

function handleSortFilterChange(target) {
  if (target.checked) {
    getAll('input[name="sort-filter"]').forEach((checkbox) => {
      if (checkbox !== target) {
        checkbox.checked = false;
      }
    });
    fetchPosts();
  }
}

function renderPosts(posts) {
  const postFeed = getById('post-feed');
  const createPostContainer = getById('create-post-container');
  postFeed.innerHTML = ''; // Clear existing posts

  postFeed.appendChild(createPostContainer);

  if (!posts || posts.length === 0) {
    postFeed.innerHTML += '<div class="placeholder">No posts to display</div>';
    return;
  }

  posts.forEach(async (post) => {
    const postElement = doc.createElement('div');
    postElement.classList.add('post');
    postElement.innerHTML = `<div class="post-header">
        <div class="profile-pic">
          <img src="${post.userId.profile_photo}" alt="Profile Picture">
        </div>
        <div class="name-date">
          <div class="name">${post.userId.username}</div>
          <div class="date">${formatDate(post.createdAt)}</div>
        </div>
      </div>
      <div class="post-content">${post.content}</div>
      <div class="post-footer">
        <span id="like-button-${post._id}" class="action like-action" data-post-id="${post._id}">
          <i class="fas fa-thumbs-up"></i> Like <span id="like-count-${post._id}">(${post.likesCount})</span>
        </span>
        <span class="action comment-action" data-post-id="${post._id}">
          <i class="fas fa-comment"></i> Comment <span id="comment-count-${post._id}">(${post.commentCount})
        </span>
      </div>
    `;
    postFeed.appendChild(postElement);

    // check if the current user has liked the post, and apply the appropriate color
    const currentUserId = await getCurrentUserId();
    const isLiked = post.likedBy.includes(currentUserId);

    const likeButton = getById(`like-button-${post._id}`);
    if (isLiked) {
      likeButton.style.color = '#0093ff';
    }
  });
  setupLikeListeners();
  setupCommentListeners();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('en-US', options);
}

async function getCurrentProfilePicture() {
  // if the userId is already in memory, return it directly
  if (currentPhoto) {
    return currentPhoto;
  }

  try {
    const response = await fetch('/user/me', {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await response.json();
    currentPhoto = userData.profile_photo; // Store user ID in memory
    return currentPhoto;
  } catch (err) {
    error('Error fetching user ID:', err);
    return null;
  }
}

async function getCurrentUserId() {
  // if the userId is already in memory, return it directly
  if (currentUserId) {
    return currentUserId;
  }

  try {
    const response = await fetch('/user/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await response.json();
    currentUserId = userData.id; // Store user ID in memory
    return currentUserId;
  } catch (err) {
    error('Error fetching user ID:', err);
    return null;
  }
}

function setupLikeListeners() {
  getAll('.like-action').forEach((button) => {
    button.addEventListener('click', (e) => {
      const postId = e.target.dataset.postId;
      toggleLike(postId);
    });
  });
}
function setupCommentListeners() {
  // Add a unique event listener for each comment action, ensuring no duplicates
  getAll('.comment-action').forEach((button) => {
    if (!button.hasAttribute('data-listener')) {
      // Check if the listener is already added
      button.addEventListener('click', commentListener);
      button.setAttribute('data-listener', 'true'); // Mark the listener as added
    }
  });
}

function commentListener(e) {
  const postId = e.target.dataset.postId;
  const username = e.target.closest('.post').querySelector('.name').textContent;
  const postTitle = `${username}'s post`;
  openCommentModal(postId, postTitle);
}

async function toggleLike(postId) {
  try {
    const likeButton = getById(`like-button-${postId}`);
    const likeCount = getById(`like-count-${postId}`);

    // check if the current user has already liked the post
    const isLiked = likeButton.style.color === 'rgb(0, 147, 255)';
    log(isLiked);

    let response;

    if (isLiked) {
      // if liked, send a DELETE request to remove the like
      response = await fetch(`/user/community/posts/${postId}/like`, { method: 'DELETE', withPreloader: false });
    } else {
      // otherwise, send a POST request to like the post
      response = await fetch(`/user/community/posts/${postId}/like`, { method: 'POST', withPreloader: false });
    }

    const data = await response.json();

    if (data.status === 'success') {
      const isLikedNow = data.data.likedBy.includes(currentUserId);
      log(isLikedNow);

      if (isLikedNow) {
        likeButton.style.color = '#0093ff';
      } else {
        likeButton.style.color = '';
      }

      // update the like count
      likeCount.textContent = `(${data.data.likesCount})`;
    } else if (data.status === 'error' && data.message === 'You have already liked this post') {
      // Handle case where the user tries to like a post they've already liked
      alert('You have already liked this post.');
    } else {
      alert('Failed to toggle like');
    }
  } catch (err) {
    error('Error toggling like:', err);
  }
}

// handle opening the comment modal
function openCommentModal(postId, postTitle) {
  const modal = getById('comment-modal');
  const postTitleElement = getById('post-modal-title');

  const commentsList = getById('comment-list');
  const commentTextarea = getById('comment-textarea');

  // clear the previous comments and input field
  commentsList.innerHTML = '';
  commentTextarea.value = '';

  postTitleElement.textContent = postTitle;

  fetchComments(postId);

  // show the modal
  modal.style.display = 'flex';

  // add the event listener for closing the modal
  const closeButton = getById('comment-modal').querySelector('.close-button');
  closeButton.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  const submitButton = getById('submit-comment');
  submitButton.addEventListener('click', async (e) => {
    e.stopImmediatePropagation();
    const commentContent = getById('comment-textarea').value.trim();

    if (!commentContent) {
      alert('Please write a comment.');
      return;
    }

    try {
      const submitButton = getById('submit-comment');
      submitButton.disabled = true;
      const response = await postComment(postId, commentContent);

      log(response);

      if (response.status === 'success') {
        commentTextarea.value = '';
        const commentCountElement = getById(`comment-count-${postId}`);
        if (commentCountElement) {
          commentCountElement.textContent = `(${response.data.commentCount})`;
        }
        modal.style.display = 'none';
        fetchComments(postId);
      } else {
        alert('Failed to post comment. Please try again later.');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Something went wrong. Please try again later.');
    } finally {
      submitButton.disabled = false;
    }
  });
}

async function postComment(postId, content) {
  const response = await fetch(`/user/community/posts/${postId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });

  return await response.json();
}

async function fetchComments(postId) {
  try {
    const response = await fetch(`/user/community/posts/${postId}/comments`);
    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error('Failed to fetch comments');
    }

    const comments = data.data.comments;
    const commentList = getById('comment-list');
    commentList.innerHTML = '';

    comments.forEach((comment) => {
      const commentElement = doc.createElement('div');
      commentElement.classList.add('comment');
      commentElement.innerHTML = ` 
        <div class="profile-pic"></div>
        <div class="comment-content">
          <span class="name">${comment.userId.username}</span>
          <p>${comment.content}</p>
        </div>
      `;
      commentList.appendChild(commentElement);
    });
  } catch (err) {
    error('Error fetching comments:', err);
  }
}
