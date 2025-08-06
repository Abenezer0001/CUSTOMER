// Debug script to test venue service charge functionality
const API_BASE_URL = 'http://localhost:3001'; // Adjust as needed

async function testVenueServiceCharge(tableId) {
  try {
    console.log('🔍 Testing venue service charge for tableId:', tableId);
    
    // 1. First get table data
    console.log('\n1. Fetching table data...');
    const tableResponse = await fetch(`${API_BASE_URL}/restaurant-service/tables/${tableId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (tableResponse.ok) {
      const tableData = await tableResponse.json();
      console.log('✅ Table data:', JSON.stringify(tableData, null, 2));
      
      // Extract venue ID
      const venueId = tableData.venueId || tableData.venue?._id;
      console.log('📍 Venue ID:', venueId);
      
      if (venueId) {
        // 2. Now get venue data
        console.log('\n2. Fetching venue data...');
        const venueResponse = await fetch(`${API_BASE_URL}/restaurant-service/venues/${venueId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (venueResponse.ok) {
          const venueData = await venueResponse.json();
          console.log('✅ Venue data:', JSON.stringify(venueData, null, 2));
          console.log('💰 Service charge:', venueData.serviceCharge);
        } else {
          console.log('❌ Failed to fetch venue:', venueResponse.status, venueResponse.statusText);
          const errorText = await venueResponse.text();
          console.log('Error response:', errorText);
        }
      } else {
        console.log('❌ No venue ID found in table data');
      }
    } else {
      console.log('❌ Failed to fetch table:', tableResponse.status, tableResponse.statusText);
      const errorText = await tableResponse.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Test with a specific table ID - replace with your actual table ID
const tableId = process.argv[2] || 'your-table-id-here';

if (tableId === 'your-table-id-here') {
  console.log('❌ Please provide a table ID as argument');
  console.log('Usage: node debug-venue-service-charge.js <tableId>');
  process.exit(1);
}

testVenueServiceCharge(tableId);