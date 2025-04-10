async function getAddressFromCoordinates(coordinates) {
  const [lon, lat] = coordinates;

  // validate that latitude and longitude are numbers
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    console.error('Latitude and Longitude must be numbers');
    return 'Invalid coordinates';
  }

  // build the URL for the Nominatim reverse geocoding API
  const url = `https://simple-proxy.mayor.workers.dev/?destination=${encodeURIComponent(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  )}`;

  try {
    // fetch the address data from Nominatim
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.display_name || 'Address not found';
  } catch (err) {
    console.error('Error fetching address:', err);
    return 'Address not available';
  }
}

// function to geocode an address to coordinates
async function geocodeAddress(address) {
  const proxyUrl = `https://simple-proxy.mayor.workers.dev/?destination=${encodeURIComponent(
    'https://nominatim.openstreetmap.org/search?q=' + address + '&format=json&limit=1'
  )}`;

  try {
    const response = await fetch(proxyUrl);

    // check if the response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // check if the address was found
    if (data.length > 0) {
      const { lat, lon } = data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    } else {
      throw new Error('Address not found');
    }
  } catch (error) {
    console.error('Failed to fetch geocoding data via proxy:', error.message);
    throw new Error('Failed to fetch geocoding data');
  }
}

// export the functions
module.exports = { getAddressFromCoordinates, geocodeAddress };
