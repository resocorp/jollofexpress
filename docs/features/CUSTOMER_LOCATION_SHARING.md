# Customer Location Sharing Feature

## Overview
Customers can now optionally share their precise location during checkout to help the business understand customer distribution and optimize delivery routes.

## Implementation Details

### Database Changes
- **Migration**: `add_customer_location_fields`
- **New Fields in `orders` table**:
  - `customer_latitude` (number, optional)
  - `customer_longitude` (number, optional)
  - `customer_location_address` (text, optional) - Reverse-geocoded address
- **Index**: Created spatial index on location coordinates for analytics queries

### Frontend Changes

#### Checkout Form (`components/checkout/checkout-form.tsx`)
- Added optional location sharing section with clear messaging
- Integrated `LocationPicker` component from tracking system
- Features:
  - Blue info banner explaining the benefit ("Help us deliver faster")
  - "Share My Location" button (optional)
  - Interactive map with draggable pin
  - "Use My Location" button for GPS auto-detection
  - Map style toggle (Satellite/Streets/Navigation)
  - Location preview with address and coordinates
  - Edit/Remove options for shared location

#### Admin Order View (`app/admin/orders/page.tsx`)
- Added location display section in order details dialog
- Shows:
  - Reverse-geocoded address (if available)
  - Coordinates with 6 decimal precision
  - "View on Google Maps" link for navigation
  - Blue highlighted section when location is shared

### API Changes

#### Order Creation API (`app/api/orders/route.ts`)
- Added `customer_location_address` to validation schema
- Location data stored with order:
  - Latitude
  - Longitude
  - Reverse-geocoded address from Mapbox

### Type Definitions (`types/database.ts`)
- Added `customer_location_address?: string` to Order interface

## User Experience

### Customer Flow
1. Customer fills out delivery details on checkout page
2. Optional blue banner appears: "Share Your Location (Optional)"
3. Message explains: "Help us deliver faster by sharing your precise location"
4. If customer clicks "Share My Location":
   - Interactive map appears with draggable pin
   - Customer can use GPS or manually select location
   - Location preview shows address and coordinates
5. Customer can edit or remove location anytime before checkout
6. Location is stored with order (completely optional)

### Admin Flow
1. Admin views order details in admin panel
2. If customer shared location, blue section appears showing:
   - "Customer Location Shared" header
   - Reverse-geocoded address
   - Clickable Google Maps link
   - Precise coordinates
3. Admin can click link to navigate directly to customer location

## Benefits

### For Business
- **Customer Analytics**: Understand geographic distribution of customers
- **Delivery Optimization**: Plan better delivery routes
- **Service Expansion**: Identify high-demand areas for expansion
- **Data-Driven Decisions**: Make informed decisions about delivery zones

### For Customers
- **Faster Delivery**: More accurate location = faster delivery
- **Better Service**: Helps drivers find exact location
- **Optional**: No pressure, completely voluntary

## Technical Notes

### Location Accuracy
- Uses browser Geolocation API (high accuracy mode)
- Mapbox for reverse geocoding
- Coordinates stored with 6 decimal places (~0.1m precision)

### Privacy
- Location sharing is **completely optional**
- Clear messaging about why location is requested
- Customer can remove location before checkout
- Location only stored if customer explicitly shares it

### Map Integration
- Uses existing `LocationPicker` component
- Mapbox GL JS for interactive maps
- Multiple map styles available
- Draggable marker for precise positioning

## Future Enhancements
- Heat map visualization of customer locations in admin analytics
- Delivery zone optimization based on customer distribution
- Distance-based delivery fee calculation
- Automatic driver assignment based on proximity
