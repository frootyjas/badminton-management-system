export const fetchUserData = async () => {
  try {
    const response = await fetch('/user/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // if you're handling sessions/cookies
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data; // return the data so it can be used by other components
  } catch (err) {
    console.error('Error fetching user data:', err);
    throw err; // re-throw error so it can be handled in the calling function
  }
};

// helper function to capitalize the first letter of the role
export const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};
