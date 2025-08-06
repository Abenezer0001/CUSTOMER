// Script to list all venues and their service charge settings
const API_BASE_URL = 'http://localhost:3001'; // Adjust as needed

async function listVenues() {
  try {
    console.log('🔍 Fetching all venues...');
    
    const response = await fetch(`${API_BASE_URL}/restaurant-service/venues`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const venues = await response.json();
      console.log(`✅ Found ${venues.length} venues:`);
      
      venues.forEach((venue, index) => {
        console.log(`\n${index + 1}. Venue: ${venue.name} (ID: ${venue._id})`);
        console.log(`   Restaurant ID: ${venue.restaurantId}`);
        console.log(`   Service Charge:`, venue.serviceCharge || 'Not configured');
        console.log(`   Active: ${venue.isActive}`);
      });
      
      if (venues.length === 0) {
        console.log('⚠️ No venues found. You may need to create venues first.');
      }
    } else {
      console.log('❌ Failed to fetch venues:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error fetching venues:', error);
  }
}

listVenues();