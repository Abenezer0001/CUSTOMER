# INSEAT Order API Endpoints Documentation

This document provides examples of all order-related API endpoints and how to test them using curl commands.

## Base URL
All endpoints are prefixed with: `http://localhost:3000/api/orders`

## Authentication Note
Some endpoints may require authentication. Add the Authorization header when needed:
```bash
-H "Authorization: Bearer YOUR_TOKEN"
```

## Endpoints

### 1. Get All Orders
```bash
curl -i -X GET http://localhost:3000/api/orders
```

### 2. Create New Order
```bash
curl -i -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "65f2d6e8c52d3a1234567890",
    "tableNumber": "A1",
    "items": [
      {
        "menuItemId": "65f2d6e8c52d3a1234567891",
        "quantity": 2,
        "specialInstructions": "No onions"
      }
    ],
    "totalAmount": 25.98,
    "status": "pending"
  }'
```

### 3. Get Order by ID
```bash
curl -i -X GET http://localhost:3000/api/orders/ORDER_ID
```

### 4. Update Order Status
```bash
curl -i -X PUT http://localhost:3000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

### 5. Update Payment Status
```bash
curl -i -X PUT http://localhost:3000/api/orders/ORDER_ID/payment \
  -H "Content-Type: application/json" \
  -d '{
    "paymentStatus": "paid",
    "paymentMethod": "card"
  }'
```

### 6. Cancel Order
```bash
curl -i -X POST http://localhost:3000/api/orders/ORDER_ID/cancel
```

### 7. Get Orders by Restaurant
```bash
curl -i -X GET http://localhost:3000/api/orders/restaurant/RESTAURANT_ID
```

### 8. Get Orders by Table
```bash
curl -i -X GET http://localhost:3000/api/orders/restaurant/RESTAURANT_ID/table/TABLE_NUMBER
```

### 9. Get Orders by User
```bash
curl -i -X GET http://localhost:3000/api/orders/user/USER_ID
```

### 10. Update Order Details
```bash
curl -i -X PUT http://localhost:3000/api/orders/ORDER_ID \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "menuItemId": "65f2d6e8c52d3a1234567891",
        "quantity": 3,
        "specialInstructions": "Extra spicy"
      }
    ],
    "totalAmount": 38.97
  }'
```

### 11. Send Order Alert
```bash
curl -i -X POST http://localhost:3000/api/orders/ORDER_ID/alert \
  -H "Content-Type: application/json" \
  -d '{
    "type": "assistance_needed",
    "message": "Customer needs assistance"
  }'
```

## Sample Data Types

### Order Status Options
- pending
- confirmed
- preparing
- ready
- delivered
- completed
- cancelled

### Payment Status Options
- pending
- processing
- paid
- failed
- refunded

### Payment Method Options
- cash
- card
- mobile_money
- wallet

### Alert Types
- assistance_needed
- order_ready
- payment_reminder
- special_request

## Testing Notes
1. Replace placeholder IDs (ORDER_ID, RESTAURANT_ID, etc.) with actual IDs from your database
2. Ensure the server is running on port 3000 before testing
3. Check response headers for CORS and authentication requirements
4. Some endpoints may require additional authorization 