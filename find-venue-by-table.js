// Script to find which venue contains a specific table ID
const API_BASE_URL = 'http://localhost:3001';

async function findVenueByTable(tableId) {
  try {
    console.log('🔍 Finding venue for tableId:', tableId);
    
    // Get all venues
    const response = await fetch(`${API_BASE_URL}/api/venues`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const venues = await response.json();
      console.log(`📊 Found ${venues.length} venues`);
      
      // Find venue that contains this table
      const venue = venues.find(v => v.tables && v.tables.includes(tableId));
      
      if (venue) {
        console.log('✅ Found venue:', venue.name);
        console.log('📍 Venue ID:', venue._id);
        console.log('💰 Service charge:', venue.serviceCharge);
        return venue;
      } else {
        console.log('❌ No venue found containing this table ID');
        return null;
      }
    } else {
      console.log('❌ Failed to fetch venues:', response.status, response.statusText);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error finding venue:', error);
    return null;
  }
}

// Test with the table ID we've been using
const tableId = process.argv[2] || '68624acb3a3a2035f54fe8e1';
findVenueByTable(tableId);