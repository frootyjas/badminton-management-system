let sessionCheckIntervalId = null;
let redirecting = false;
let isRefreshing = false;

const doc = document;
const { log, error } = console;

const getById = (id) => doc.getElementById(id);

// show the preloader
export function showPreloader() {
  const preloader = getById('preloader');
  if (preloader) preloader.style.display = 'flex';
  const root = getById('root');
  if (root) root.style.opacity = '0.2';
}

// Hide the preloader
export function hidePreloader() {
  const preloader = getById('preloader');
  if (preloader) preloader.style.display = 'none';

  const root = getById('root');
  if (root) root.style.opacity = '1';
}

// Function to check session validity and refresh token if necessary
export function checkSessionValidity() {
  fetch('/ping', {
    method: 'GET',
    credentials: 'include', // Ensures cookies are sent
    withPreloader: false
  })
    .then((response) => {
      if (response.status === 401) {
        log('Session invalid. Attempting to refresh token...');
        return refreshToken();
      } else {
        log('Session is valid.');
      }
    })
    .catch((err) => {
      error('Error during session validation:', err);
    });
}

function refreshToken() {
  if (redirecting) return Promise.reject(new Error('Already redirecting'));
  return fetch('/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    withPreloader: false
  }).then((refreshResponse) => {
    if (refreshResponse.ok) {
      log('Token refreshed successfully.');
      return;
    } else if (refreshResponse.status === 401 || refreshResponse.status === 403) {
      alert('Your session has expired. You will be redirected to the login page.'); // Alert user
      error('Failed to refresh token. Redirecting to login...');
      redirecting = true;
      window.location.href = '/login'; // redirect to login page
      throw new Error('Refresh token failed');
    } else {
      error('Unexpected error while refreshing token.');
      alert('An unexpected error occurred. Redirecting to login page.'); // Alert user
      window.location.href = '/login'; // redirect to login page
      throw new Error('Unexpected error');
    }
  });
}

const originalFetch = window.fetch;
window.fetch = new Proxy(originalFetch, {
  apply(fetch, that, args) {
    const options = args[1] || {};
    const withPreloader = options.withPreloader !== false;
    if (withPreloader) showPreloader();

    return fetch(...args)
      .then((response) => {
        // Check if the response indicates an expired token
        if (response.status === 401) {
          if (isRefreshing) {
            // If we are already refreshing, just wait for the original request to be retried
            return new Promise((resolve, reject) => {
              const retry = () => {
                fetch(...args)
                  .then(resolve)
                  .catch(reject);
              };
              // Wait a moment before retrying
              setTimeout(retry, 1000); // Retry after 1 second
            });
          }

          isRefreshing = true; // Set the flag to indicate we're refreshing
          log('Token expired or invalid, attempting to refresh...');

          return refreshToken()
            .then(() => {
              log('Retrying original request...');
              return fetch(...args); // Retry the original request after refreshing
            })
            .finally(() => {
              isRefreshing = false; // Reset the flag after the refresh attempt
              if (withPreloader) hidePreloader();
            });
        }

        if (withPreloader) hidePreloader();
        return response; // Return the original response if no issues
      })
      .catch((err) => {
        error('Fetch error:', err);
        if (withPreloader) hidePreloader();
      });
  }
});

// Function to validate session and navigate to a URL
export function validateSessionAndNavigate(url) {
  fetch('/ping', {
    method: 'GET',
    credentials: 'include',
    withPreloader: false
  })
    .then((response) => {
      if (response.status === 401) {
        return fetch('/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          withPreloader: false
        }).then((refreshResponse) => {
          if (refreshResponse.ok) {
            log('Token refreshed, proceeding to page...');
            window.location.href = url; // navigate to the intended page
          } else {
            alert('Your session has expired. You will be redirected to the login page.'); // Alert user
            error('Failed to refresh token. Redirecting to login...');
            window.location.href = '/login';
          }
          hidePreloader();
        });
      } else if (response.ok) {
        log('Session is valid. Navigating to page...');
        window.location.href = url;
      } else {
        error('Error validating session:', response.status);
        alert('Your session has expired. You will be redirected to the login page.'); // Alert user
        window.location.href = '/login';
      }
      hidePreloader();
    })
    .catch((err) => {
      error('Error during session validation:', err);
      alert('Your session has expired. You will be redirected to the login page.'); // Alert user
      window.location.href = '/login';
      hidePreloader();
    });
}

// function to start session checks
export function startSessionChecks() {
  if (sessionCheckIntervalId) {
    clearInterval(sessionCheckIntervalId);
  }

  // check session validity every 40 seconds
  sessionCheckIntervalId = setInterval(checkSessionValidity, 5000);

  // initial session check on page load
  document.addEventListener('DOMContentLoaded', () => {
    checkSessionValidity();
  });
}
