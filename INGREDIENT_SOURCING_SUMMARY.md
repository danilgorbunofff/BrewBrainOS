# Ingredient Sourcing Implementation Summary

## Project Context
**Feature**: Ingredient Sourcing with Supplier Tracking  
**Priority**: Phase 1 MVP (Critical)  
**Timeline**: 8 weeks (approx. 2 weeks per phase)  
**Objective**: Enable breweries to track suppliers, manage purchase orders, and monitor supplier performance for ingredient quality accountability and regulatory compliance.

---

## Quick Reference

### Related Documentation
- **Full Implementation Guide**: See [INGREDIENT_SOURCING_GUIDE.md](INGREDIENT_SOURCING_GUIDE.md)
- **Project Master Plan**: [MASTER_PLAN.md](MASTER_PLAN.md)
- **Full Roadmap**: [full_implementation_plan_roadmap.md](full_implementation_plan_roadmap.md)

### New Database Tables
1. `suppliers` - Supplier profiles and baseline metrics
2. `purchase_orders` - Order tracking and fulfillment
3. `purchase_order_items` - Individual items in orders
4. `supplier_ratings` - Quality and performance feedback
5. Updated: `inventory` - Added supplier relationship fields

### New Components (18 total)
**Suppliers Section**: SuppliersTable, SupplierForm, SupplierDetailCard, SupplierPerformanceDashboard, SupplierRatingModal, SupplierSearch

**Purchase Orders**: PurchaseOrdersTable, PurchaseOrderForm, PurchaseOrderDetail, ReceiveOrderForm, OrderItemsList, QuickReorderButton

**Integration**: SupplierSelector, InventorySupplierInfo, SupplierPerformanceWidget

### API Endpoints (12 total)
- Supplier CRUD: POST/GET/PUT/DELETE suppliers
- Purchase Orders: POST/GET/PUT purchase-orders, POST receive orders
- Ratings: POST/GET supplier ratings
- Analytics: Performance metrics, order history, quality trends

---

## 4-Phase Implementation Roadmap

### Phase 1: Core Supplier Management (Weeks 1-2)
**Focus**: Foundation for supplier data and relationships

**Database**:
- Create `suppliers` table with contact and basic metrics
- Add supplier_id, supplier_name, supplier_contact, purchase_price fields to inventory

**Components**:
- SuppliersTable (list view with search/filter)
- SupplierForm (create/edit modal)
- SupplierDetailCard (view supplier info)

**APIs**:
- GET/POST/PUT/DELETE /api/suppliers
- GET /api/suppliers/:id

**Integration**:
- Link suppliers to inventory items
- Show supplier info in inventory details

**Acceptance Criteria**:
- ✓ Can create, view, edit, delete suppliers
- ✓ Each brewery has isolated supplier data
- ✓ Inventory items can be linked to suppliers
- ✓ Supplier contact info easily accessible

---

### Phase 2: Purchase Order Tracking (Weeks 3-4)
**Focus**: Order lifecycle and fulfillment

**Database**:
- Create `purchase_orders` and `purchase_order_items` tables
- Add indexes for performance

**Components**:
- PurchaseOrdersTable (list with status filtering)
- PurchaseOrderForm (order creation with line items)
- ReceiveOrderForm (receive items and quality checks)
- OrderItemsList (display order line items)

**APIs**:
- POST/GET/PUT /api/purchase-orders
- POST /api/purchase-orders/:id/receive
- DELETE /api/purchase-orders/:id

**Workflows**:
- Create new order with supplier and items
- Track order status: pending → confirmed → shipped → delivered
- Receive items and update inventory
- Record quality issues

**Acceptance Criteria**:
- ✓ Can create orders with multiple items
- ✓ Order status tracked accurately
- ✓ Items marked as received update inventory
- ✓ Quality issues can be logged
- ✓ Audit trail maintains order history

---

### Phase 3: Supplier Performance Metrics (Weeks 5-6)
**Focus**: Quality tracking and analytics

**Database**:
- Create `supplier_ratings` table
- Update suppliers table with calculated metrics

**Components**:
- SupplierRatingModal (rate after delivery)
- SupplierPerformanceDashboard (analytics view)
- SupplierPerformanceWidget (quick stats)

**APIs**:
- POST/GET /api/suppliers/:id/ratings
- PUT /api/suppliers/ratings/:id
- GET /api/suppliers/:id/performance
- GET /api/suppliers/analytics/summary

**Metrics Calculated**:
- Quality rating (average 1-5)
- Delivery rating (average 1-5)
- Reliability rating (average 1-5)
- On-time delivery percentage
- Average delivery days
- Quality issues count
- Pricing consistency rating

**Acceptance Criteria**:
- ✓ Can rate supplier after order received
- ✓ Performance dashboard shows accurate metrics
- ✓ Historical ratings tracked
- ✓ Trends visible over time
- ✓ Can compare suppliers by performance

---

### Phase 4: Advanced Features & Integration (Weeks 7-8)
**Focus**: Intelligence and optimization

**Features**:
1. **Quality Correlation**: Link degradation tracking to supplier quality
2. **Reorder Intelligence**: Suggest best supplier for reorders
3. **Performance Alerts**: Notify on quality/reliability issues
4. **Spend Analytics**: Track total spend by supplier
5. **Recommendations**: Identify best/worst suppliers
6. **Export Capability**: CSV reports for supplier and order data

**Components**:
- SupplierSearch (quick lookup)
- QuickReorderButton (smart reorder)

**APIs**:
- GET /api/suppliers/analytics/quality
- GET /api/suppliers/analytics/spend
- POST /api/purchase-orders/quick-reorder

**Advanced Workflows**:
- Auto-suggest supplier when reordering ingredient
- Identify supplier that consistently delivers that ingredient issue-free
- Analyze if ingredient quality issues correlate with specific suppliers
- Generate supplier scorecard reports

**Acceptance Criteria**:
- ✓ Quality issues traceable to suppliers
- ✓ Reorder suggestions leverage history
- ✓ Alerts help identify problem suppliers early
- ✓ Spend reports optimize supplier negotiation
- ✓ Exports support reporting and audits

---

## Integration Points

### With Inventory System
- Inventory items linked to suppliers
- Purchase orders feed received items into inventory
- Supplier info visible in inventory detail view
- Reorder automation can suggest preferred supplier

### With Degradation Tracking
- Compare ingredient quality across suppliers
- Identify if degradation correlates with specific suppliers
- Rate supplier on quality metrics
- Alert if supplier's quality ratings drop

### With TTB/Compliance
- All purchase orders logged with dates for audit trail
- Lot numbers and expiration dates captured
- Supplier information maintains ingredient traceability
- Quality issues documented for regulatory review

### With Reorder Automation
- Suggest supplier when reorder point hit
- Can auto-create orders from preferred suppliers
- Track supplier response time for demand forecasting
- Identify if delivery delays cause stock-outs

---

## Key Success Metrics

| Metric | Target | Why it Matters |
|--------|--------|-----------------|
| Supplier Tracking Completeness | 100% of orders tracked | Maintains audit trail and accountability |
| Quality Issue Resolution Time | < 24 hours | Identifies problems quickly |
| On-Time Delivery Rate | > 95% | Prevents production delays |
| Supplier Data Accuracy | 100% | Ensures reliable reporting |
| Mobile Usability | > 90% click success | Supports floor operations |
| Report Generation | < 5 seconds | Enables quick analysis |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Duplicate suppliers (same supplier, different entries) | Enforce brewery-level uniqueness, soft delete inactive |
| Incomplete order data | Require all fields, validate before save |
| Quality ratings not submitted | Prompt after delivery, make easy one-click |
| Performance metrics inaccurate | Weekly recalculation, audit trail logs |
| Compliance audit trail incomplete | Log all changes with user/timestamp |

---

## Deliverables Checklist

### Phase 1
- [ ] Database schema (suppliers table)
- [ ] TypeScript types and interfaces
- [ ] Server actions for supplier CRUD
- [ ] SuppliersTable component
- [ ] SupplierForm component
- [ ] SupplierDetailCard component
- [ ] Update inventory table schema
- [ ] SupplierSelector component for inventory
- [ ] Unit tests for supplier operations

### Phase 2
- [ ] Database schema (purchase_orders, purchase_order_items)
- [ ] TypeScript types for purchase orders
- [ ] Server actions for order CRUD
- [ ] PurchaseOrdersTable component
- [ ] PurchaseOrderForm component
- [ ] ReceiveOrderForm component
- [ ] OrderItemsList component
- [ ] Order status workflow implementation
- [ ] Integration with inventory receipt
- [ ] Unit tests for purchase order operations

### Phase 3
- [ ] Database schema (supplier_ratings table)
- [ ] SupplierRatingModal component
- [ ] Performance calculation logic
- [ ] SupplierPerformanceDashboard component
- [ ] Analytics API endpoints
- [ ] Historical rating tracking
- [ ] Unit tests for rating calculations
- [ ] Integration tests for workflow

### Phase 4
- [ ] Quality correlation analysis
- [ ] Reorder suggestion engine
- [ ] Performance alerts/notifications
- [ ] Spend analytics dashboard
- [ ] Supplier comparison view
- [ ] CSV export functionality
- [ ] Advanced analytics queries
- [ ] End-to-end integration tests

---

## Technology Stack for This Feature

**Database**: PostgreSQL (Supabase)
- Row Level Security (RLS) for brewery isolation
- Indexes for performance on brewery_id, supplier_id

**Backend**: Next.js Server Actions
- Type-safe with TypeScript
- Server-side validation
- Supabase client integration

**Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- Form components with validation
- Tables with sorting/filtering
- Charts for performance metrics (Recharts)

**API**: RESTful routes
- /api/suppliers/* endpoints
- /api/purchase-orders/* endpoints
- /api/suppliers/*/ratings endpoints

**Testing**: Jest + React Testing Library
- Unit tests for calculations
- Integration tests for workflows
- Component tests for UI

---

## Estimated Effort

| Phase | Frontend | Backend | Database | Testing | Total |
|-------|----------|---------|----------|---------|-------|
| Phase 1 | 20h | 12h | 4h | 8h | 44h |
| Phase 2 | 24h | 16h | 6h | 12h | 58h |
| Phase 3 | 16h | 12h | 2h | 10h | 40h |
| Phase 4 | 20h | 16h | 2h | 12h | 50h |
| **Total** | **80h** | **56h** | **14h** | **42h** | **192h** |

**Assumes**: One full-stack developer, 8-hour work days = ~24 days = ~5 weeks at 40 hrs/week

---

## Next Steps

1. **Approve Plan**: Review and confirm implementation strategy
2. **Prepare Database**: Create migration files for new tables
3. **Start Phase 1**: Implement supplier management (Weeks 1-2)
4. **Phase 2**: Purchase order tracking (Weeks 3-4)
5. **Phase 3**: Performance metrics (Weeks 5-6)
6. **Phase 4**: Advanced features (Weeks 7-8)
7. **Testing & Refinement**: UAT and bug fixes
8. **Launch**: Deploy to production with documentation

---

## Questions & Clarifications

*These should be addressed before starting implementation*:

1. **Supplier Type Constraints**: Are there other supplier types beyond "Distributor", "Direct", "Cooperative"?
2. **Order Auto-Creation**: Should reorder automation create orders automatically or just suggest?
3. **Rating Deadlines**: How long after delivery should suppliers be ratable?
4. **Quality Thresholds**: What quality rating triggers alerts to user?
5. **Pricing Strategy**: Should this feature be locked behind paid tiers?
6. **Historical Data**: Do existing customers need supplier data imported from Excel?
7. **Notifications**: How should quality/delivery alerts be delivered (email, in-app, SMS)?
8. **Multi-Supplier**: Can breweries order same ingredient from different suppliers in same order?
