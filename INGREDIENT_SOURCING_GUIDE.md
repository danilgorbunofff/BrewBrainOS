# Ingredient Sourcing & Supplier Tracking Implementation Plan

## Executive Summary
This feature enables breweries to track ingredient suppliers, monitor supplier performance, manage purchase orders, and ensure consistent ingredient quality. It directly supports the research requirement: "Add supplier tracking for accountability. This feature will allow breweries to evaluate supplier performance and ensure consistent ingredient quality."

---

## 1. Feature Overview

### Core Capabilities
- **Supplier Management**: Create, edit, and manage supplier profiles with contact info and ratings
- **Purchase Order Tracking**: Log and track all purchases from suppliers for accountability
- **Supplier Performance Metrics**: Track delivery time, quality, pricing consistency, and reliability
- **Ingredient-Supplier Linking**: Map each inventory item to its supplier source
- **Quality Ratings**: Rate suppliers on quality, delivery speed, and reliability
- **Order History & Analytics**: View purchase patterns and supplier trends
- **Compliance Documentation**: Maintain audit trail for regulatory compliance

### Business Value
- Identify high-performing vs. problematic suppliers
- Negotiate better terms with reliable suppliers
- Quickly identify quality issues linked to specific suppliers
- Reduce shrinkage and spoilage by tracking supplier quality
- Maintain compliance with ingredient traceability requirements

---

## 2. Database Schema Extensions

### New Tables

#### `suppliers`
```sql
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Supply Information
  website TEXT,
  supplier_type TEXT CHECK (supplier_type IN ('Distributor', 'Direct', 'Cooperative')),
  
  -- Performance Tracking
  years_partnered INTEGER,
  specialty TEXT, -- e.g., 'Hops', 'Grain', 'Yeast', 'All'
  
  -- Notes & Flags
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Quality Baseline
  avg_quality_rating DECIMAL DEFAULT 0, -- 0-5 scale
  avg_delivery_days DECIMAL DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
```

#### `purchase_orders`
```sql
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  
  -- Order Details
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Status & Tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'canceled')),
  
  -- Order Contents (JSON array of items)
  items_summary TEXT, -- JSON: [{"inventory_id": "...", "item_name": "...", "quantity": 5, "unit": "kg", "price": 25.50}]
  
  -- Financials
  total_cost DECIMAL,
  invoice_number TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  
  -- Quality Assessment
  quality_rating DECIMAL DEFAULT NULL, -- 1-5 on delivery
  quality_notes TEXT,
  any_issues BOOLEAN DEFAULT false,
  issue_description TEXT,
  
  -- Audit Trail
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
```

#### `purchase_order_items`
```sql
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  
  -- Item Details
  item_name TEXT NOT NULL,
  quantity_ordered DECIMAL NOT NULL,
  quantity_received DECIMAL DEFAULT 0,
  unit TEXT NOT NULL, -- 'kg', 'lb', 'oz', 'ea', etc.
  unit_price DECIMAL NOT NULL,
  
  -- Quality Tracking
  lot_number TEXT,
  expiration_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
```

#### `supplier_ratings`
```sql
CREATE TABLE IF NOT EXISTS supplier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  
  -- Ratings (1-5 scale)
  quality_rating DECIMAL NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
  delivery_rating DECIMAL NOT NULL CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  reliability_rating DECIMAL NOT NULL CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
  pricing_rating DECIMAL NOT NULL CHECK (pricing_rating >= 1 AND pricing_rating <= 5),
  
  -- Feedback
  comments TEXT,
  would_order_again BOOLEAN DEFAULT true,
  
  -- Date Reference
  rating_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
```

#### Update `inventory` Table
```sql
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier_contact TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_price DECIMAL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_order_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_from_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
```

### Indexes for Performance
```sql
CREATE INDEX IF NOT EXISTS idx_suppliers_brewery ON suppliers(brewery_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_brewery ON purchase_orders(brewery_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_brewery ON supplier_ratings(brewery_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier ON supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory(supplier_id);
```

---

## 3. Frontend Components

### Page Structure
```
/src/app/(app)/suppliers/                    # Main suppliers section
  /page.tsx                                  # Suppliers list & dashboard
  /[id]/page.tsx                             # Supplier detail view
  /create/page.tsx                           # New supplier form

/src/app/(app)/purchase-orders/              # Purchase orders section
  /page.tsx                                  # Orders list
  /[id]/page.tsx                             # Order detail view
  /create/page.tsx                           # New order form
  /[id]/receive/page.tsx                     # Receive order form
```

### Components to Create

#### Suppliers Section
1. **SuppliersTable.tsx** - List of all suppliers with sorting/filtering
2. **SupplierForm.tsx** - Create/edit supplier form
3. **SupplierDetailCard.tsx** - Display supplier info and performance metrics
4. **SupplierPerformanceDashboard.tsx** - Analytics for supplier ratings and history
5. **SupplierRatingModal.tsx** - Modal to rate a supplier after receiving an order
6. **SupplierSearch.tsx** - Quick supplier lookup

#### Purchase Orders Section
1. **PurchaseOrdersTable.tsx** - List all purchase orders with status
2. **PurchaseOrderForm.tsx** - Create new purchase order
3. **PurchaseOrderDetail.tsx** - View/edit order details
4. **ReceiveOrderForm.tsx** - Receive/fulfill order items
5. **OrderItemsList.tsx** - Display items in a purchase order
6. **QuickReorderButton.tsx** - Reorder from favorite suppliers

#### Integration Components
1. **SupplierSelector.tsx** - Dropdown/modal to select supplier when adding inventory
2. **InventorySupplierInfo.tsx** - Display supplier info on inventory item detail
3. **SupplierPerformanceWidget.tsx** - Show supplier ratings in dashboard

---

## 4. API Endpoints (Server Actions & Routes)

### Supplier Management
```
POST /api/suppliers                    # Create supplier
GET /api/suppliers                     # List suppliers
GET /api/suppliers/:id                 # Get supplier details
PUT /api/suppliers/:id                 # Update supplier
DELETE /api/suppliers/:id              # Delete supplier (soft delete)
GET /api/suppliers/:id/performance     # Get supplier performance metrics
```

### Purchase Orders
```
POST /api/purchase-orders              # Create purchase order
GET /api/purchase-orders               # List purchase orders
GET /api/purchase-orders/:id           # Get order details
PUT /api/purchase-orders/:id           # Update order status
DELETE /api/purchase-orders/:id        # Cancel order
POST /api/purchase-orders/:id/receive  # Mark items as received
```

### Ratings & Feedback
```
POST /api/suppliers/:id/ratings        # Submit supplier rating
GET /api/suppliers/:id/ratings         # Get all ratings for supplier
PUT /api/suppliers/ratings/:id         # Update rating
```

### Analytics
```
GET /api/suppliers/analytics/summary   # Summary metrics for all suppliers
GET /api/suppliers/:id/order-history   # Purchase history with supplier
GET /api/suppliers/analytics/quality   # Quality trend data
```

---

## 5. Data Models & Types

### TypeScript Interfaces

```typescript
interface Supplier {
  id: string;
  brewery_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country: string;
  website?: string;
  supplier_type: 'Distributor' | 'Direct' | 'Cooperative';
  years_partnered?: number;
  specialty?: string;
  notes?: string;
  is_active: boolean;
  avg_quality_rating: number;
  avg_delivery_days: number;
  total_orders: number;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrder {
  id: string;
  brewery_id: string;
  supplier_id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'canceled';
  items_summary: PurchaseOrderItem[];
  total_cost: number;
  invoice_number?: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  quality_rating?: number;
  quality_notes?: string;
  any_issues: boolean;
  issue_description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  inventory_id?: string;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit: string;
  unit_price: number;
  lot_number?: string;
  expiration_date?: string;
  created_at: string;
}

interface SupplierRating {
  id: string;
  brewery_id: string;
  supplier_id: string;
  purchase_order_id?: string;
  quality_rating: number;
  delivery_rating: number;
  reliability_rating: number;
  pricing_rating: number;
  comments?: string;
  would_order_again: boolean;
  rating_date: string;
  created_at: string;
}

interface SupplierPerformanceMetrics {
  supplier_id: string;
  total_orders: number;
  avg_quality_rating: number;
  avg_delivery_days: number;
  on_time_percentage: number;
  quality_issues_count: number;
  avg_reliability_rating: number;
  avg_pricing_rating: number;
  last_order_date?: string;
  total_spent?: number;
}
```

---

## 6. Integration Points with Existing Systems

### With Inventory System
- When adding inventory items, allow selection of default supplier
- Display supplier info in inventory item details
- Track which suppliers provide each ingredient
- Link purchase orders to inventory receipts

### With Degradation Tracking
- Track if degradation correlates with specific suppliers
- Flag suppliers with consistent quality issues
- Compare ingredient quality across different suppliers

### With Reorder Automation
- Suggest reordering from preferred supplier
- Automatically create purchase orders for reorder points
- Track supplier response times for demand forecasting

### With TTB/Compliance
- Maintain audit trail of all supplier changes
- Log purchase order creation and receipt dates
- Track lot numbers and expiration dates from suppliers
- Link to ingredient traceability for regulatory compliance

---

## 7. Implementation Phases

### Phase 1: Core Supplier Management (Week 1-2)
**Deliverables:**
- [ ] Database schema for `suppliers` table
- [ ] CRUD operations for suppliers
- [ ] SuppliersTable and SupplierForm components
- [ ] Supplier detail page with basic info
- [ ] Server actions for supplier management
- [ ] Integration: Link suppliers to inventory items

**Tasks:**
1. Create database migration for `suppliers` table
2. Generate TypeScript types for suppliers
3. Build API endpoints for supplier CRUD
4. Create SuppliersTable component with search/filter
5. Create SupplierForm component (create/edit)
6. Add supplier_id field to inventory table update
7. Update InventoryTable to show supplier info

### Phase 2: Purchase Order Tracking (Week 3-4)
**Deliverables:**
- [ ] Database schema for purchase orders and items
- [ ] Purchase order creation flow
- [ ] Order status tracking
- [ ] Receive order functionality
- [ ] PurchaseOrdersTable and detail components
- [ ] Link purchase orders to inventory receipts

**Tasks:**
1. Create database migration for `purchase_orders` and `purchase_order_items` tables
2. Generate TypeScript types for purchase orders
3. Build API endpoints for purchase order CRUD
4. Create PurchaseOrderForm component
5. Create ReceiveOrderForm for fulfillment
6. Implement order status workflow
7. Create PurchaseOrderDetail page
8. Link received items back to inventory

### Phase 3: Supplier Performance Metrics (Week 5-6)
**Deliverables:**
- [ ] Database schema for supplier ratings
- [ ] Rating submission after order receipt
- [ ] Supplier performance dashboard
- [ ] Performance analytics and trends
- [ ] Supplier comparison view

**Tasks:**
1. Create database migration for `supplier_ratings` table
2. Create SupplierRatingModal component
3. Add rating endpoints
4. Calculate performance metrics (quality, delivery time, reliability)
5. Create SupplierPerformanceDashboard component
6. Build analytics queries (on-time %, quality issues, trends)
7. Create performance comparison view
8. Add performance insights to supplier detail page

### Phase 4: Advanced Features & Integration (Week 7-8)
**Deliverables:**
- [ ] Quality correlation analysis with degradation tracking
- [ ] Automated reorder suggestions from preferred suppliers
- [ ] Supplier performance alerts and notifications
- [ ] Historical order analytics and spend tracking
- [ ] Export supplier and order data

**Tasks:**
1. Analyze degradation logs vs. supplier quality ratings
2. Integrate with reorder automation (suggest best supplier)
3. Add notifications for low supplier ratings
4. Create spend analysis dashboard
5. Build order history and trend analytics
6. Implement CSV export for orders and supplier metrics
7. Add supplier comparison and recommendation engine

---

## 8. Key Features & Workflows

### Workflow 1: Add New Supplier
1. User navigates to Suppliers page
2. Clicks "Add Supplier"
3. Fills form: name, contact, type, specialty
4. Saves supplier profile
5. Supplier appears in dropdown for future orders

### Workflow 2: Create Purchase Order
1. User navigates to Purchase Orders
2. Clicks "New Order"
3. Selects supplier
4. Adds items (with quantities, unit prices)
5. Sets expected delivery date
6. Saves order
7. Order tracked with status: pending → confirmed → shipped → delivered

### Workflow 3: Receive Order & Rate Supplier
1. User receives order shipment
2. Opens purchase order in app
3. Clicks "Receive Items"
4. Enters actual quantities received
5. Notes any quality issues (damaged, incorrect items, etc.)
6. Submits receipt
7. System prompts for supplier rating (quality, delivery time, reliability, pricing)
8. Rating updates supplier's performance metrics

### Workflow 4: View Supplier Performance
1. User navigates to Supplier detail page
2. Sees:
   - Contact information
   - Rating history (star ratings over time)
   - Number of orders
   - Average delivery time
   - Quality issues logged
   - Most recent orders
3. Can compare with other suppliers or identify trends

---

## 9. Key Metrics & KPIs

### Per Supplier
- **Quality Rating**: Average of quality ratings (1-5)
- **Delivery Rating**: Average of delivery ratings (1-5)
- **Reliability Rating**: Average of reliability ratings (1-5)
- **On-Time Delivery %**: (Orders delivered by expected date) / (Total orders)
- **Quality Issues Count**: Number of orders with reported quality problems
- **Average Delivery Days**: (Actual delivery date - Order date)
- **Average Order Value**: Total spent / Number of orders
- **Reorder Likelihood**: % of orders marked "would order again"

### Brewery-Level
- **Spend by Supplier**: Total spend grouped by supplier
- **Supplier Concentration**: % of spend with top suppliers (identify risk)
- **Quality Correlation**: Link ingredient degradation to specific suppliers
- **Best Performing Supplier**: Ranked by quality, delivery, reliability
- **Problem Suppliers**: Those with multiple issues or low ratings

---

## 10. Data Validation & Constraints

### Supplier Validation
- Name is required and unique per brewery
- Email, phone, or address must be provided
- Supplier type must be one of: Distributor | Direct | Cooperative
- Years partnered must be positive if provided

### Purchase Order Validation
- Supplier must exist and be active
- Order date cannot be in the future
- Expected delivery date must be after order date
- All items must have quantity > 0 and unit price >= 0
- Total cost must equal sum of (quantity × unit_price)

### Rating Validation
- All ratings must be between 1 and 5
- Cannot rate a supplier without an associated order
- Can only update rating within 30 days of delivery

---

## 11. Compliance & Audit Trail

### Audit Requirements
- Track who created/updated suppliers
- Log all purchase orders and status changes
- Record receipt dates and quantities for traceability
- Maintain supplier rating history with timestamps
- Link to ingredients received for TTB compliance

### Data Retention
- Keep supplier profiles indefinitely (soft delete if inactive)
- Retain purchase orders for 7 years (per TTB requirements)
- Maintain rating history for performance analysis
- Log all quality issues for regulatory review

---

## 12. Success Criteria

- [ ] Suppliers can track all ingredients back to their source
- [ ] Breweries can identify their best and worst suppliers
- [ ] Quality issues can be quickly traced to specific suppliers
- [ ] System maintains all data required for regulatory audits
- [ ] Performance insights help breweries negotiate better terms
- [ ] Reorder process is streamlined by favorite suppliers
- [ ] Users can generate supplier performance reports
- [ ] Mobile experience works for recording received orders

---

## 13. Testing Strategy

### Unit Tests
- Supplier CRUD operations
- Purchase order calculations (total cost, delivery time)
- Rating aggregation and metric calculations
- Data validation for all inputs

### Integration Tests
- Create supplier → Use in purchase order → Receive → Rate workflow
- Verify inventory receives tracked to purchase orders
- Quality correlation with degradation system
- Compliance audit trail completeness

### User Acceptance Tests
- Supplier management intuitive on mobile
- Purchase order workflow matches brewery operations
- Performance metrics accurate and insightful
- Data exports complete and accurate
