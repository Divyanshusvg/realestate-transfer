// foursquareController.js
import axios from 'axios'
// Foursquare API key (Replace with your actual API key)
const FOURSQUARE_API_KEY = 'fsq3gunYl/v9K8x9L7imHdQwjZy/N4tbjmjJbf2PPvVBrvE=';

// Function to search properties on Foursquare
const searchPropertyOnFoursquare = async (req, res) => {
    try {
        const { query, lat, lon } = req.query;

        // Validate query parameters
        if (!query || !lat || !lon) {
            return res.status(400).json({ message: 'Query, latitude, and longitude are required.' });
        }

        // Foursquare API endpoint
        const endpoint = 'https://api.foursquare.com/v3/places/search';

        // Set up the parameters for the request
        const params = {
            query: query,
            ll: `${lat},${lon}`,
            radius: 1000, // Search within 1km radius
            limit: 5      // Limit results to 5
        };

        // Make the API request
        const response = await axios.get(endpoint, {
            headers: {
                'Accept': 'application/json',
                'Authorization': FOURSQUARE_API_KEY
            },
            params: params
        });

        // Return the data to the client
        return res.status(200).json(response.data);

    } catch (error) {
        console.error('Error fetching data from Foursquare API:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export default searchPropertyOnFoursquare