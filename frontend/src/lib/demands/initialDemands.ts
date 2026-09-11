import { DemandRecord, DemandSummaryMetrics, DemandsFilterState, DemandAssetClass } from "@/types/demands";

export const INITIAL_DEMANDS: DemandRecord[] = [
  // 2025Q3
  { id: 1, date: '2025-09-09', quarter: '2025Q3', assoc: 'MELIZA', source: 'Existing Network', type: 'CL', industry: 'Retail Services', client: 'Philippines Ecology Systems Corp.', minSqm: 2000, maxSqm: 3000, gloc: 'MM', city: 'Quezon City', location: 'Quezon City', priority: 'Shelved', purpose: 'Identified', status: 'Identified', remarks: '' },
  { id: 2, date: '2025-09-09', quarter: '2025Q3', assoc: 'CEDTRIX', source: 'Lamudi', type: 'INDL', industry: 'Warehousing & Logistics', client: 'OceanSpeed', minSqm: 10000, maxSqm: 20000, gloc: 'N', city: 'Bulacan', location: 'Marilao, Meycauayan', priority: 'Shelved', purpose: 'Identified', status: 'Identified', remarks: 'High bay warehouse with 40ft container access' },
  { id: 3, date: '2025-09-09', quarter: '2025Q3', assoc: 'PHIL', source: 'Existing Network', type: 'INDL', industry: 'F&B', client: 'Rebisco', minSqm: 11000, maxSqm: 11000, gloc: 'MM', city: 'North MM Corridor', location: 'Caloocan, Bulacan, Valenzuela, Novaliches', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Alternative candidate areas for 1 major plant (Either-Or mandate)', fulfillmentMode: 'either', alternativeLocations: ['Caloocan', 'Bulacan', 'Valenzuela', 'Novaliches'] },
  { id: 4, date: '2025-09-09', quarter: '2025Q3', assoc: 'PHIL', source: 'Existing Network', type: 'INDL', industry: 'F&B', client: 'ZAnest', minSqm: 8000, maxSqm: 10000, gloc: 'MM', city: 'Valenzuela', location: 'Valenzuela', priority: 'Normal', purpose: 'Manufacturing', status: 'Active', remarks: 'Heavy power requirement' },

  // 2025Q4 - Puregold Multi-Store Rollout (1 company, 3 distinct locations)
  { id: 5, date: '2025-10-01', quarter: '2025Q4', assoc: 'MELIZA', source: 'Existing Network', type: 'CL', industry: 'Grocery & Convenience', client: 'Puregold (Mart - 500)', minSqm: 1500, maxSqm: 1500, gloc: 'N', city: 'Bulacan', location: 'Bulacan', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Rollout site 1 of 3: Roadside standalone with dedicated customer parking', fulfillmentMode: 'rollout' },
  { id: 6, date: '2025-10-01', quarter: '2025Q4', assoc: 'MELIZA', source: 'Existing Network', type: 'CL', industry: 'Grocery & Convenience', client: 'Puregold (Mart - 500)', minSqm: 1500, maxSqm: 1500, gloc: 'N', city: 'Pampanga', location: 'Pampanga', priority: 'Normal', purpose: 'Expansion', status: 'Identified', remarks: 'Rollout site 2 of 3: High foot-traffic provincial highway frontage', fulfillmentMode: 'rollout' },
  { id: 7, date: '2025-10-01', quarter: '2025Q4', assoc: 'MELIZA', source: 'Existing Network', type: 'CL', industry: 'Grocery & Convenience', client: 'Puregold (Mart - 500)', minSqm: 1500, maxSqm: 1500, gloc: 'S', city: 'Cavite', location: 'Cavite', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Rollout site 3 of 3: Cavite masterplanned corridor', fulfillmentMode: 'rollout' },

  { id: 8, date: '2025-10-03', quarter: '2025Q4', assoc: 'MELIZA', source: 'Cold Calls', type: 'CS', industry: 'Surplus Store', client: 'HMR', minSqm: 2000, maxSqm: 2000, gloc: 'MM', city: 'Quezon City', location: 'Quezon City', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Preferably Calle Crisologo or major avenue' },
  { id: 9, date: '2025-10-03', quarter: '2025Q4', assoc: 'MELIZA', source: 'Cold Calls', type: 'CS', industry: 'Surplus Store', client: 'HMR', minSqm: 2000, maxSqm: 2000, gloc: 'MM', city: 'Mandaluyong', location: 'Mandaluyong', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Central warehouse & showroom concept' },
  { id: 10, date: '2025-10-13', quarter: '2025Q4', assoc: 'MELIZA', source: 'Existing Network', type: 'CS', industry: 'F&B', client: "Max's Group", minSqm: 600, maxSqm: 600, gloc: 'MM', city: 'Quezon City', location: 'Tomas Morato, Timog, Scout Area', priority: 'Priority', purpose: 'Expansion', status: 'Catered', remarks: 'High visibility restaurant cluster' },

  // KFC 5-Store Rollout
  { id: 11, date: '2025-10-21', quarter: '2025Q4', assoc: 'MELIZA', source: 'Cold Calls', type: 'CL', industry: 'F&B', client: 'KFC', minSqm: 750, maxSqm: 1000, gloc: 'MM', city: 'San Juan', location: 'San Juan', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Rollout site 1 of 5: Drive-thru requirement', fulfillmentMode: 'rollout' },
  { id: 12, date: '2025-10-21', quarter: '2025Q4', assoc: 'MELIZA', source: 'Cold Calls', type: 'CL', industry: 'F&B', client: 'KFC', minSqm: 750, maxSqm: 1000, gloc: 'MM', city: 'Mandaluyong', location: 'Mandaluyong', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Rollout site 2 of 5: High density residential/commercial', fulfillmentMode: 'rollout' },
  { id: 13, date: '2025-10-21', quarter: '2025Q4', assoc: 'MELIZA', source: 'Cold Calls', type: 'CL', industry: 'F&B', client: 'KFC', minSqm: 750, maxSqm: 1000, gloc: 'MM', city: 'Quezon City', location: 'Quezon City', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Rollout site 3 of 5: Corner lot or prime commercial strip', fulfillmentMode: 'rollout' },
  { id: 14, date: '2025-10-21', quarter: '2025Q4', assoc: 'MELIZA', source: 'Cold Calls', type: 'CL', industry: 'F&B', client: 'KFC', minSqm: 750, maxSqm: 1000, gloc: 'MM', city: 'Pasig', location: 'Pasig', priority: 'Normal', purpose: 'Expansion', status: 'Identified', remarks: 'Rollout site 4 of 5: Pasig commercial boulevard', fulfillmentMode: 'rollout' },
  { id: 15, date: '2025-10-21', quarter: '2025Q4', assoc: 'MELIZA', source: 'Cold Calls', type: 'CL', industry: 'F&B', client: 'KFC', minSqm: 750, maxSqm: 1000, gloc: 'GMM', city: 'Rizal', location: 'Rizal', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Rollout site 5 of 5: Suburban growth node', fulfillmentMode: 'rollout' },

  // Mercury Drug Pampanga Cluster Rollout
  { id: 16, date: '2025-10-21', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Email Blast', type: 'CL', industry: 'Health, Wellness & Beauty', client: 'Mercury Drug', minSqm: 300, maxSqm: 500, gloc: 'N', city: 'Pampanga', location: 'San Fernando', priority: 'Normal', purpose: 'Expansion', status: 'Identified', remarks: 'Pampanga network rollout site 1', fulfillmentMode: 'rollout' },
  { id: 17, date: '2025-10-21', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Email Blast', type: 'CL', industry: 'Health, Wellness & Beauty', client: 'Mercury Drug', minSqm: 300, maxSqm: 500, gloc: 'N', city: 'Pampanga', location: 'Lubao', priority: 'Priority', purpose: 'Expansion', status: 'Active', remarks: 'Pampanga network rollout site 2 (Priority)', fulfillmentMode: 'rollout' },
  { id: 18, date: '2025-10-21', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Email Blast', type: 'CL', industry: 'Health, Wellness & Beauty', client: 'Mercury Drug', minSqm: 300, maxSqm: 500, gloc: 'N', city: 'Pampanga', location: 'Guagua', priority: 'Priority', purpose: 'Expansion', status: 'Identified', remarks: 'Pampanga network rollout site 3 (Priority)', fulfillmentMode: 'rollout' },
  { id: 19, date: '2025-10-21', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Email Blast', type: 'CL', industry: 'Health, Wellness & Beauty', client: 'Mercury Drug', minSqm: 300, maxSqm: 500, gloc: 'N', city: 'Pampanga', location: 'Mexico', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Pampanga network rollout site 4', fulfillmentMode: 'rollout' },
  { id: 20, date: '2025-10-21', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Email Blast', type: 'CL', industry: 'Health, Wellness & Beauty', client: 'Mercury Drug', minSqm: 300, maxSqm: 500, gloc: 'N', city: 'Pampanga', location: 'Bacolor', priority: 'Normal', purpose: 'Expansion', status: 'Identified', remarks: 'Pampanga network rollout site 5', fulfillmentMode: 'rollout' },

  // MR. DIY Batangas Expansion Cluster (6 Sites)
  { id: 21, date: '2025-10-24', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Home Improvement & Hardware', client: 'MR. DIY', minSqm: 500, maxSqm: 700, gloc: 'S', city: 'Batangas', location: 'Calatagan', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Batangas cluster site 1', fulfillmentMode: 'rollout' },
  { id: 22, date: '2025-10-24', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Home Improvement & Hardware', client: 'MR. DIY', minSqm: 500, maxSqm: 700, gloc: 'S', city: 'Batangas', location: 'Cuenca', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Batangas cluster site 2', fulfillmentMode: 'rollout' },
  { id: 23, date: '2025-10-24', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Home Improvement & Hardware', client: 'MR. DIY', minSqm: 500, maxSqm: 700, gloc: 'S', city: 'Batangas', location: 'Ibaan', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Batangas cluster site 3', fulfillmentMode: 'rollout' },
  { id: 24, date: '2025-10-24', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Home Improvement & Hardware', client: 'MR. DIY', minSqm: 500, maxSqm: 700, gloc: 'S', city: 'Batangas', location: 'Lian', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Batangas cluster site 4', fulfillmentMode: 'rollout' },
  { id: 25, date: '2025-10-24', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Home Improvement & Hardware', client: 'MR. DIY', minSqm: 500, maxSqm: 700, gloc: 'S', city: 'Batangas', location: 'Malvar', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Batangas cluster site 5', fulfillmentMode: 'rollout' },
  { id: 26, date: '2025-10-24', quarter: '2025Q4', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Home Improvement & Hardware', client: 'MR. DIY', minSqm: 500, maxSqm: 700, gloc: 'S', city: 'Batangas', location: 'Padre Garcia', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Batangas cluster site 6', fulfillmentMode: 'rollout' },

  // Industrial Major Logistics
  { id: 27, date: '2025-11-07', quarter: '2025Q4', assoc: 'CEDTRIX', source: 'Existing Network', type: 'INDL', industry: 'Retail Services', client: 'DSV / DB Schenker', minSqm: 10000, maxSqm: 10000, gloc: 'MM', city: 'Metro Manila (South)', location: 'Metro Manila (South Corridor)', priority: 'Priority', purpose: 'Logistics Hub', status: 'Active', remarks: 'Urgent 10,000 sqm distribution warehouse, 12m clear height' },
  { id: 28, date: '2025-11-07', quarter: '2025Q4', assoc: 'CEDTRIX', source: 'Existing Network', type: 'INDL', industry: 'Retail Services', client: 'DSV / DB Schenker', minSqm: 10000, maxSqm: 10000, gloc: 'S', city: 'Laguna', location: 'Santa Rosa', priority: 'Normal', purpose: 'Logistics Hub', status: 'Active', remarks: 'Industrial park facility with multiple loading bays' },
  { id: 29, date: '2025-11-26', quarter: '2025Q4', assoc: 'CEDTRIX', source: 'Existing Network', type: 'INDL', industry: 'Retail Merchandise', client: 'Samsung SDS', minSqm: 3000, maxSqm: 5000, gloc: 'MM', city: 'Taguig', location: 'Taguig', priority: 'Shelved', purpose: 'Distribution', status: 'Shelved', remarks: '' },
  { id: 30, date: '2025-11-26', quarter: '2025Q4', assoc: 'CEDTRIX', source: 'Existing Network', type: 'INDL', industry: 'Retail Merchandise', client: 'Samsung SDS', minSqm: 3000, maxSqm: 5000, gloc: 'MM', city: 'Pasig', location: 'Pasig', priority: 'Shelved', purpose: 'Distribution', status: 'Shelved', remarks: '' },
  { id: 31, date: '2025-12-02', quarter: '2025Q4', assoc: 'PHIL', source: 'Existing Network', type: 'INDL', industry: 'Warehousing & Logistics', client: 'Siegwerk', minSqm: 10000, maxSqm: 10000, gloc: 'N', city: 'Bulacan', location: 'Bulacan', priority: 'Priority', purpose: 'Warehousing', status: 'Active', remarks: 'Chemical/ink distribution hub' },
  { id: 32, date: '2025-10-22', quarter: '2025Q4', assoc: 'CEDTRIX', source: 'Mktg Paid Ads', type: 'INDL', industry: 'Retail Services', client: 'NX Logistics Philippines', minSqm: 10000, maxSqm: 15000, gloc: 'S', city: 'Laguna', location: 'Laguna', priority: 'Priority', purpose: 'Logistics Hub', status: 'Active', remarks: '3PL warehouse with multi-dock setup' },
  { id: 33, date: '2025-10-22', quarter: '2025Q4', assoc: 'CEDTRIX', source: 'Mktg Paid Ads', type: 'INDL', industry: 'Retail Services', client: 'NX Logistics Philippines', minSqm: 10000, maxSqm: 15000, gloc: 'S', city: 'Cavite', location: 'Cavite', priority: 'Priority', purpose: 'Logistics Hub', status: 'Active', remarks: 'Alternative location in Cavite' },

  // The Bistro Group QC Flagships
  { id: 34, date: '2025-11-18', quarter: '2025Q4', assoc: 'ZARAH', source: 'Existing Network', type: 'CL', industry: 'F&B', client: 'The Bistro Group', minSqm: 600, maxSqm: 600, gloc: 'MM', city: 'Quezon City', location: 'Timog', priority: 'Priority', purpose: 'Expansion', status: 'Active', remarks: 'QC flagship cluster site 1' },
  { id: 35, date: '2025-11-18', quarter: '2025Q4', assoc: 'ZARAH', source: 'Existing Network', type: 'CL', industry: 'F&B', client: 'The Bistro Group', minSqm: 600, maxSqm: 600, gloc: 'MM', city: 'Quezon City', location: 'Tomas Morato', priority: 'Priority', purpose: 'Expansion', status: 'Active', remarks: 'QC flagship cluster site 2' },
  { id: 36, date: '2025-11-18', quarter: '2025Q4', assoc: 'ZARAH', source: 'Existing Network', type: 'CL', industry: 'F&B', client: 'The Bistro Group', minSqm: 600, maxSqm: 600, gloc: 'MM', city: 'Quezon City', location: 'Scout Area', priority: 'Priority', purpose: 'Expansion', status: 'Active', remarks: 'QC flagship cluster site 3' },

  // 2026Q1
  { id: 37, date: '2026-01-23', quarter: '2026Q1', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Grocery & Convenience', client: 'The Little Marketplace', minSqm: 150, maxSqm: 180, gloc: 'MM', city: 'Taguig', location: 'BGC High Street Corridor', priority: 'Normal', purpose: 'New Setup', status: 'Active', remarks: 'Targeting 2026 opening, luxury gourmet format' },
  { id: 38, date: '2026-01-23', quarter: '2026Q1', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Grocery & Convenience', client: 'The Marketplace', minSqm: 1200, maxSqm: 1500, gloc: 'N', city: 'Benguet', location: 'Baguio City Center', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Targeting 2028 flagship store' },
  { id: 39, date: '2026-01-23', quarter: '2026Q1', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Grocery & Convenience', client: 'Shopwise', minSqm: 3000, maxSqm: 3500, gloc: 'MM', city: 'Taguig', location: 'BGC', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Class A, Prime Condo/Offices podium space' },
  { id: 40, date: '2026-02-11', quarter: '2026Q1', assoc: 'MELIZA', source: 'Existing Network', type: 'CL', industry: 'F&B', client: 'KFC', minSqm: 600, maxSqm: 1000, gloc: 'MM', city: 'Taguig', location: 'BGC', priority: 'Priority', purpose: 'Expansion', status: 'Active', remarks: 'Flagship store, targeting 2027 opening' },

  // 2026Q2
  { id: 41, date: '2026-04-29', quarter: '2026Q2', assoc: 'MELIZA', source: 'Existing Network', type: 'CS', industry: 'Health, Wellness & Beauty', client: 'Anytime Fitness', minSqm: 400, maxSqm: 600, gloc: 'MM', city: 'Quezon City', location: 'Commonwealth (North Fairview)', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'High ceiling, mezzanine capability' },
  { id: 42, date: '2026-04-30', quarter: '2026Q2', assoc: 'MELIZA', source: 'Existing Network', type: 'CS', industry: 'Grocery & Convenience', client: 'Robinsons Easymart', minSqm: 300, maxSqm: 400, gloc: 'N', city: 'Baguio', location: 'Baguio City', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Suburban community center anchor' },
  { id: 43, date: '2026-05-18', quarter: '2026Q2', assoc: 'CARLO', source: 'Existing Network', type: 'CS', industry: 'F&B', client: 'Shake Shack', minSqm: 170, maxSqm: 180, gloc: 'MM', city: 'Metro Manila', location: 'Metro Manila Prime Mall / High Street', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'High pedestrian foot-traffic corner' },
  { id: 44, date: '2026-05-21', quarter: '2026Q2', assoc: 'SONDI', source: 'Cold Calls', type: 'CS', industry: 'Health, Wellness & Beauty', client: 'Happy Heart Salon', minSqm: 80, maxSqm: 120, gloc: 'MM', city: 'Makati', location: 'Makati CBD', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Ground floor retail with plumbing access' },
  { id: 45, date: '2026-07-07', quarter: '2026Q3', assoc: 'DYKSTRA', source: 'Lamudi', type: 'CL', industry: 'Grocery & Convenience', client: 'DALI', minSqm: 400, maxSqm: 500, gloc: 'SL', city: 'Cavite', location: 'Dasmarinas', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Subdivision entrance roadside unit' },
  { id: 46, date: '2026-07-13', quarter: '2026Q3', assoc: 'MELIZA', source: 'Existing Network', type: 'CS', industry: 'Grocery & Convenience', client: 'Alfamart', minSqm: 150, maxSqm: 200, gloc: 'MM', city: 'NCR', location: 'NCR High Density Residential', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Convenience rollout' },

  // ACTIVE HORIZON: AUGUST 2026 (Last Month) & SEPTEMBER 2026 (Current Month)
  { id: 47, date: '2026-08-05', quarter: '2026Q3', assoc: 'CARLO', source: 'Existing Network', type: 'CS', industry: 'F&B', client: 'Angels Pizza', minSqm: 100, maxSqm: 150, gloc: 'N', city: 'Baguio City', location: 'Baguio City', priority: 'Priority', purpose: 'Expansion', status: 'Active', remarks: 'Delivery hub + dine-in storefront' },
  { id: 48, date: '2026-08-11', quarter: '2026Q3', assoc: 'KRISTINA', source: 'Referral', type: 'CS', industry: 'Electronics & Technology', client: 'Abenson Group', minSqm: 400, maxSqm: 600, gloc: 'MM', city: 'Metro Manila', location: 'Metro Manila, Central Luzon', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Can also offer to Waltermart or standalone strip' },
  { id: 49, date: '2026-08-17', quarter: '2026Q3', assoc: 'CARLO', source: 'Existing Network', type: 'CS', industry: 'F&B', client: '24 Chicken', minSqm: 100, maxSqm: 200, gloc: 'MM', city: 'Metro Manila', location: 'Fairview, Valenzuela, South Caloocan, QC', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Alternative mandate: Fairview, Valenzuela, or South Caloocan', fulfillmentMode: 'either', alternativeLocations: ['Fairview', 'Valenzuela', 'South Caloocan', 'QC'] },
  { id: 50, date: '2026-08-24', quarter: '2026Q3', assoc: 'SONDI', source: 'LinkedIn', type: 'CS', industry: 'F&B', client: 'LA Chicks', minSqm: 120, maxSqm: 150, gloc: 'MM', city: 'Manila', location: 'University Belt / Manila', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Targeting student & office crowd' },
  { id: 51, date: '2026-08-26', quarter: '2026Q3', assoc: 'PHIL', source: 'Existing Network', type: 'INDL', industry: 'Warehousing & Logistics', client: 'J&T Express', minSqm: 8000, maxSqm: 12000, gloc: 'MM', city: 'Caloocan', location: 'North Caloocan Logistics Corridor', priority: 'Priority', purpose: 'Sortation Center', status: 'Active', remarks: 'Major automated parcel sortation hub, 40ft container access', fulfillmentMode: 'rollout' },
  { id: 52, date: '2026-08-28', quarter: '2026Q3', assoc: 'CEDTRIX', source: 'Existing Network', type: 'INDL', industry: 'F&B Manufacturing', client: 'Universal Robina Corp (URC)', minSqm: 15000, maxSqm: 25000, gloc: 'S', city: 'Laguna', location: 'Calamba / Santa Rosa', priority: 'Priority', purpose: 'Manufacturing & Distribution', status: 'Active', remarks: 'High clearance production plant + high bay racking' },
  { id: 53, date: '2026-08-29', quarter: '2026Q3', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CL', industry: 'Home Improvement & Hardware', client: 'Wilcon Depot', minSqm: 4000, maxSqm: 6000, gloc: 'N', city: 'Bulacan', location: 'San Jose del Monte', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Roadside big-box hardware depot with customer parking' },
  { id: 54, date: '2026-09-01', quarter: '2026Q3', assoc: 'MELIZA', source: 'Existing Network', type: 'CL', industry: 'Grocery & Convenience', client: '7-Eleven (Philippine Seven Corp)', minSqm: 120, maxSqm: 150, gloc: 'MM', city: 'Pasig', location: 'Ortigas Center CBD', priority: 'Priority', purpose: 'Expansion', status: 'Active', remarks: 'Ground floor office tower or high foot-traffic corner' },
  { id: 55, date: '2026-09-02', quarter: '2026Q3', assoc: 'MELIZA', source: 'Existing Network', type: 'CL', industry: 'Grocery & Convenience', client: '7-Eleven (Philippine Seven Corp)', minSqm: 120, maxSqm: 150, gloc: 'MM', city: 'Taguig', location: 'BGC North Sector', priority: 'Priority', purpose: 'Expansion', status: 'Active', remarks: 'Rollout site 2: BGC residential belt', fulfillmentMode: 'rollout' },
  { id: 56, date: '2026-09-03', quarter: '2026Q3', assoc: 'ZARAH', source: 'Cold Calls', type: 'CS', industry: 'F&B', client: 'Wildflour Hospitality Group', minSqm: 350, maxSqm: 500, gloc: 'MM', city: 'Makati', location: 'Salcedo / Legaspi Village', priority: 'Priority', purpose: 'New Concept', status: 'Active', remarks: 'Premium artisan bakery & cafe with alfresco seating' },
  { id: 57, date: '2026-09-04', quarter: '2026Q3', assoc: 'PHIL', source: 'Lamudi', type: 'INDL', industry: 'Cold Storage & Logistics', client: 'Glacier Megafridge', minSqm: 6000, maxSqm: 10000, gloc: 'S', city: 'Cavite', location: 'General Trias / Dasmarinas', priority: 'Priority', purpose: 'Cold Storage Hub', status: 'Active', remarks: 'Sub-zero temperature controlled facility, 10m clear height' },
  { id: 58, date: '2026-09-05', quarter: '2026Q3', assoc: 'DYKSTRA', source: 'Existing Network', type: 'CS', industry: 'Health, Wellness & Beauty', client: 'Watsons Philippines', minSqm: 180, maxSqm: 250, gloc: 'MM', city: 'Quezon City', location: 'Katipunan Avenue', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'High street strip adjacent to university cluster' },
  { id: 59, date: '2026-09-06', quarter: '2026Q3', assoc: 'CARLO', source: 'Cold Calls', type: 'CS', industry: 'F&B', client: 'Potato Corner', minSqm: 40, maxSqm: 60, gloc: 'MM', city: 'Mandaluyong', location: 'MRT / Shaw Boulevard Hub', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Compact transit kiosk with high power load' },
  { id: 60, date: '2026-09-07', quarter: '2026Q3', assoc: 'SONDI', source: 'Referral', type: 'CL', industry: 'Retail Services', client: 'BDO Unibank', minSqm: 250, maxSqm: 400, gloc: 'MM', city: 'Paranaque', location: 'BF Homes Commercial Strip', priority: 'Normal', purpose: 'Branch Relocation', status: 'Active', remarks: 'Ground floor with 24/7 ATM vestibule and armored truck parking' },
  { id: 61, date: '2026-09-08', quarter: '2026Q3', assoc: 'CEDTRIX', source: 'Existing Network', type: 'INDL', industry: 'Automotive & Logistics', client: 'Toyota Logistics Services', minSqm: 12000, maxSqm: 18000, gloc: 'S', city: 'Batangas', location: 'Batangas Port Vicinity', priority: 'Normal', purpose: 'Vehicle Processing Hub', status: 'Active', remarks: 'Open yard + covered inspection staging area' },
  { id: 62, date: '2026-09-08', quarter: '2026Q3', assoc: 'MELIZA', source: 'Existing Network', type: 'CS', industry: 'F&B', client: 'Jollibee Foods Corp', minSqm: 500, maxSqm: 800, gloc: 'N', city: 'Bulacan', location: 'Plaridel / Pulilan Highway', priority: 'Priority', purpose: 'Drive-Thru Store', status: 'Active', remarks: 'Standalone 2-storey drive-thru restaurant' },
  { id: 63, date: '2026-09-09', quarter: '2026Q3', assoc: 'PHIL', source: 'Existing Network', type: 'INDL', industry: 'E-Commerce Logistics', client: 'Shopee Express', minSqm: 10000, maxSqm: 15000, gloc: 'N', city: 'Bulacan', location: 'Marilao Logistics Hub', priority: 'Priority', purpose: 'Cross-Dock Hub', status: 'Active', remarks: 'Cross-dock warehouse with 20+ elevated truck docks' },
  { id: 64, date: '2026-09-10', quarter: '2026Q3', assoc: 'KRISTINA', source: 'Referral', type: 'CS', industry: 'Home Improvement & Hardware', client: 'True Value / Robinsons Retail', minSqm: 800, maxSqm: 1200, gloc: 'MM', city: 'Taguig', location: 'BGC Uptown Corridor', priority: 'Normal', purpose: 'Expansion', status: 'Active', remarks: 'Mall anchor or lifestyle podium' }
];

export function getDefaultHorizonDates() {
  // Default horizon: May 2026 through the current reporting month.
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return {
    start: '2026-05-01',
    end,
    preset: 'last-and-current' as const
  };
}

export function filterDemands(
  demands: DemandRecord[],
  filters: DemandsFilterState,
  assetClass: DemandAssetClass
): DemandRecord[] {
  return demands.filter((item) => {
    // 1. Asset class filter (Subpage)
    if (assetClass === 'retail' && item.type === 'INDL') return false;
    if (assetClass === 'industrial' && item.type !== 'INDL') return false;

    // 2. Date Horizon Filter
    if (filters.dateStart && item.date < filters.dateStart) return false;
    if (filters.dateEnd && item.date > filters.dateEnd) return false;

    // 3. Property Type Filter
    if (filters.type && item.type !== filters.type) return false;

    // 4. Region Filter (G.LOC)
    if (filters.region && item.gloc.toUpperCase() !== filters.region.toUpperCase()) return false;

    // 5. Priority Filter
    if (filters.priority && item.priority !== filters.priority) return false;

    // 6. Search Text
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const combined = `${item.client} ${item.city} ${item.location} ${item.industry} ${item.assoc} ${item.remarks || ''}`.toLowerCase();
      if (!combined.includes(q)) return false;
    }

    return true;
  });
}

export function calculateDemandMetrics(
  filteredDemands: DemandRecord[],
  allDemands: DemandRecord[]
): DemandSummaryMetrics {
  const totalDeals = filteredDemands.length;
  const totalFloorAreaSqm = filteredDemands.reduce((sum, d) => sum + (Number(d.maxSqm) || Number(d.minSqm) || 0), 0);
  const averageDealSizeSqm = totalDeals > 0 ? Math.round(totalFloorAreaSqm / totalDeals) : 0;
  
  const priorityDeals = filteredDemands.filter((d) => d.priority === 'Priority');
  const priorityDealsCount = priorityDeals.length;
  const priorityFloorAreaSqm = priorityDeals.reduce((sum, d) => sum + (Number(d.maxSqm) || Number(d.minSqm) || 0), 0);

  // Commercial Real Estate Estimation:
  // Retail (CL/CS) average PHP 650/sqm/month; Industrial (INDL) average PHP 280/sqm/month
  const estMonthlyValuePhp = filteredDemands.reduce((sum, d) => {
    const area = Number(d.maxSqm) || Number(d.minSqm) || 0;
    const rate = d.type === 'INDL' ? 280 : 650;
    return sum + (area * rate);
  }, 0);

  const estAnnualValuePhp = estMonthlyValuePhp * 12;

  const retailCount = filteredDemands.filter((d) => d.type === 'CL' || d.type === 'CS').length;
  const industrialCount = filteredDemands.filter((d) => d.type === 'INDL').length;

  return {
    totalDeals,
    totalFloorAreaSqm,
    averageDealSizeSqm,
    priorityDealsCount,
    priorityFloorAreaSqm,
    estMonthlyValuePhp,
    estAnnualValuePhp,
    retailCount,
    industrialCount,
    historicalTotalDeals: allDemands.length
  };
}
