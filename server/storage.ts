import {
  users,
  properties,
  inquiries,
  propertyViews,
  propertyFavorites,
  appointments,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Inquiry,
  type InsertInquiry,
  type PropertyView,
  type InsertPropertyView,
  type PropertyFavorite,
  type InsertPropertyFavorite,
  type Appointment,
  type InsertAppointment,
  type PaginationOptions,
  type CursorPaginationOptions,
  type PaginatedResponse,
  type SoftDeleteOptions,
  type SelectOptions,
  type QueryMetrics,
} from "@shared/schema";
import { PropertyFilters } from "./core/types";
import { db, executeWithMetrics, withoutSoftDeleted, onlySoftDeleted, withSoftDeleted } from "./db";
import { eq, desc, asc, and, gte, lte, lt, ilike, or, sql, inArray, isNull, isNotNull, exists, count, type SQL } from "drizzle-orm";
import type { PgSelectQueryBuilder, PgSelect } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Soft delete utilities
const applySoftDeleteFilter = (options?: SoftDeleteOptions) => {
  if (options?.onlySoftDeleted) {
    return onlySoftDeleted;
  }
  if (options?.includeSoftDeleted) {
    return withSoftDeleted;
  }
  return withoutSoftDeleted;
};

// Define query types for better type safety
type DatabaseQuery = PgSelect<any, any, any, any>;
type QueryWithConditions = PgSelectQueryBuilder<any, any, any, any, any, any, any>;

// Pagination utilities with proper typing
const applyPagination = <T extends DatabaseQuery>(query: T, pagination?: PaginationOptions): T => {
  if (!pagination) return query;
  
  if (pagination.limit) {
    query = query.limit(pagination.limit);
  }
  
  if (pagination.offset) {
    query = query.offset(pagination.offset);
  }
  
  return query;
};

const applyCursorPagination = <T extends QueryWithConditions>(
  query: T, 
  table: Record<string, any>, 
  pagination?: CursorPaginationOptions, 
  existingConditions: SQL[] = []
): T => {
  if (!pagination) return query;
  
  const conditions = [...existingConditions];
  
  if (pagination.cursor) {
    const field = table[pagination.sort];
    if (pagination.order === 'desc') {
      conditions.push(lt(field, pagination.cursor));
    } else {
      conditions.push(gte(field, pagination.cursor));
    }
  }
  
  // Apply conditions using and() to combine with existing filters
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  if (pagination.limit) {
    query = query.limit(pagination.limit + 1); // +1 to check if there are more results
  }
  
  return query;
};

// Create paginated response
const createPaginatedResponse = <T>(data: T[], pagination?: PaginationOptions | CursorPaginationOptions, total?: number): PaginatedResponse<T> => {
  const limit = pagination?.limit || data.length;
  const hasMore = data.length > limit;
  if (hasMore && pagination?.limit) {
    data.pop(); // Remove the extra item used for hasMore check
  }
  
  // Compute cursors based on sort field or fallback to id
  const getCursorValue = (item: Record<string, unknown>, sortField?: string): unknown => {
    if (!sortField || sortField === 'id') {
      return item.id;
    }
    // Return the value of the sort field, fallback to id if field doesn't exist
    return item[sortField] !== undefined ? item[sortField] : item.id;
  };
  
  const sortField = (pagination as CursorPaginationOptions)?.sort;
  
  return {
    data,
    pagination: {
      total,
      hasMore,
      nextCursor: hasMore && data.length > 0 ? getCursorValue(data[data.length - 1], sortField) : undefined,
      prevCursor: data.length > 0 ? getCursorValue(data[0], sortField) : undefined,
      page: (pagination as PaginationOptions)?.offset && limit ? Math.floor(((pagination as PaginationOptions).offset || 0) / limit) + 1 : undefined,
      totalPages: total && limit ? Math.ceil(total / limit) : undefined,
      limit,
    },
  };
};

// Enhanced interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string, options?: SoftDeleteOptions): Promise<User | undefined>;
  getUsers(pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<User>>;
  upsertUser(user: UpsertUser): Promise<User>;
  softDeleteUser(id: string): Promise<void>;
  restoreUser(id: string): Promise<User>;
  
  // Property operations
  getProperties(filters?: PropertyFilters, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Property>>;
  getPropertiesWithCursor(filters?: PropertyFilters, pagination?: CursorPaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Property>>;
  getProperty(id: string, options?: SoftDeleteOptions): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  softDeleteProperty(id: string): Promise<void>;
  restoreProperty(id: string): Promise<Property>;
  getFeaturedProperties(limit?: number, options?: SoftDeleteOptions): Promise<Property[]>;
  getPropertiesByAgent(agentId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Property>>;
  
  // Inquiry operations
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  getInquiriesByAgent(agentId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Inquiry>>;
  getInquiriesForProperty(propertyId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Inquiry>>;
  updateInquiry(id: string, updates: Partial<InsertInquiry>): Promise<Inquiry>;
  softDeleteInquiry(id: string): Promise<void>;
  restoreInquiry(id: string): Promise<Inquiry>;
  
  // Property metrics operations
  createPropertyView(view: InsertPropertyView): Promise<PropertyView>;
  getPropertyViewsCount(propertyId: string, options?: SoftDeleteOptions): Promise<number>;
  getPropertyViews(propertyId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<PropertyView>>;
  createPropertyFavorite(favorite: InsertPropertyFavorite): Promise<PropertyFavorite>;
  removePropertyFavorite(propertyId: string, userId: string): Promise<void>;
  softDeletePropertyFavorite(propertyId: string, userId: string): Promise<void>;
  restorePropertyFavorite(propertyId: string, userId: string): Promise<PropertyFavorite>;
  getPropertyFavoritesCount(propertyId: string, options?: SoftDeleteOptions): Promise<number>;
  isPropertyFavorited(propertyId: string, userId: string, options?: SoftDeleteOptions): Promise<boolean>;
  getUserFavorites(userId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Property>>;
  getAgentMetrics(agentId: string): Promise<{ totalViews: number; totalFavorites: number; totalInquiries: number; totalProperties: number }>;
  
  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsByAgent(agentId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Appointment>>;
  getAppointmentsByProperty(propertyId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Appointment>>;
  getAppointment(id: string, options?: SoftDeleteOptions): Promise<Appointment | undefined>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  softDeleteAppointment(id: string): Promise<void>;
  restoreAppointment(id: string): Promise<Appointment>;
  getAgentAvailableSlots(agentId: string, date: string, options?: SoftDeleteOptions): Promise<string[]>;
  
  // Analytics operations
  getAppointmentsByDateRange(startDate: string, endDate: string, options?: SoftDeleteOptions): Promise<Appointment[]>;
  getDashboardMetrics(agentId?: string): Promise<{
    totalProperties: number;
    totalInquiries: number;
    totalAppointments: number;
    totalViews: number;
    totalFavorites: number;
    recentActivity: Array<{
      type: 'property' | 'inquiry' | 'appointment';
      title: string;
      date: Date;
      status?: string;
    }>;
  }>;
}

export interface PropertyFilters {
  search?: string;
  keyword?: string; // Search in title and description
  propertyType?: string[] | string;
  status?: string;
  city?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minSquareFeet?: number;
  maxSquareFeet?: number;
  // Location filters
  latitude?: number;
  longitude?: number;
  radius?: number; // Distance in kilometers
  // Property features
  hasGarage?: boolean;
  hasPool?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasAirConditioning?: boolean;
  hasFireplace?: boolean;
  hasPetsAllowed?: boolean;
  furnished?: boolean;
  hasElevator?: boolean;
  hasSecurity?: boolean;
  hasGym?: boolean;
  hasPlayground?: boolean;
  // Additional filters
  featured?: boolean;
  agentId?: string;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  sortBy?: string;
  limit?: number;
  offset?: number;
}

export class DatabaseStorage implements IStorage {
  // ==================== USER OPERATIONS ====================
  
  async getUser(id: string, options?: SoftDeleteOptions): Promise<User | undefined> {
    return executeWithMetrics(async () => {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), applySoftDeleteFilter(options)));
      return user;
    }, `getUser:${id}`);
  }

  async getUsers(pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<User>> {
    return executeWithMetrics(async () => {
      // Get total count for pagination
      const [countResult] = await db
        .select({ count: count() })
        .from(users)
        .where(applySoftDeleteFilter(options));
      const total = Number(countResult.count);

      // Get paginated results
      let query = db
        .select()
        .from(users)
        .where(applySoftDeleteFilter(options))
        .orderBy(desc(users.createdAt));

      query = applyPagination(query, pagination);
      const data = await query;

      return createPaginatedResponse(data, pagination, total);
    }, 'getUsers');
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return executeWithMetrics(async () => {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    }, 'upsertUser');
  }

  async softDeleteUser(id: string): Promise<void> {
    return executeWithMetrics(async () => {
      await db
        .update(users)
        .set({ 
          deletedAt: new Date(),
          updatedAt: new Date(),
          isActive: false
        })
        .where(eq(users.id, id));
    }, `softDeleteUser:${id}`);
  }

  async restoreUser(id: string): Promise<User> {
    return executeWithMetrics(async () => {
      const [user] = await db
        .update(users)
        .set({ 
          deletedAt: null,
          updatedAt: new Date(),
          isActive: true
        })
        .where(eq(users.id, id))
        .returning();
      return user;
    }, `restoreUser:${id}`);
  }

  // ==================== PROPERTY OPERATIONS ====================

  async getProperties(filters?: PropertyFilters, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Property>> {
    return executeWithMetrics(async () => {
      const conditions = [applySoftDeleteFilter(options)];
      
      // Apply all filters
      if (filters?.search) {
        conditions.push(
          or(
            ilike(properties.title, `%${filters.search}%`),
            ilike(properties.address, `%${filters.search}%`),
            ilike(properties.city, `%${filters.search}%`),
            ilike(properties.description, `%${filters.search}%`)
          )
        );
      }
      
      if (filters?.keyword) {
        conditions.push(
          or(
            ilike(properties.title, `%${filters.keyword}%`),
            ilike(properties.description, `%${filters.keyword}%`)
          )
        );
      }
      
      if (filters?.propertyType) {
        if (Array.isArray(filters.propertyType)) {
          conditions.push(inArray(properties.propertyType, filters.propertyType as any[]));
        } else {
          conditions.push(eq(properties.propertyType, filters.propertyType as any));
        }
      }
      
      if (filters?.status) {
        conditions.push(eq(properties.status, filters.status as any));
      }
      
      if (filters?.city) {
        conditions.push(ilike(properties.city, `%${filters.city}%`));
      }

      if (filters?.state) {
        conditions.push(ilike(properties.state, `%${filters.state}%`));
      }
      
      if (filters?.minPrice) {
        conditions.push(gte(properties.price, filters.minPrice.toString()));
      }
      
      if (filters?.maxPrice) {
        conditions.push(lte(properties.price, filters.maxPrice.toString()));
      }
      
      if (filters?.bedrooms) {
        conditions.push(gte(properties.bedrooms, filters.bedrooms));
      }
      
      if (filters?.bathrooms) {
        conditions.push(gte(properties.bathrooms, filters.bathrooms));
      }

      if (filters?.minSquareFeet) {
        conditions.push(gte(properties.squareFeet, filters.minSquareFeet));
      }

      if (filters?.maxSquareFeet) {
        conditions.push(lte(properties.squareFeet, filters.maxSquareFeet));
      }
      
      // Property features filters
      if (filters?.hasGarage !== undefined) {
        conditions.push(eq(properties.hasGarage, filters.hasGarage));
      }
      
      if (filters?.hasPool !== undefined) {
        conditions.push(eq(properties.hasPool, filters.hasPool));
      }
      
      if (filters?.hasBalcony !== undefined) {
        conditions.push(eq(properties.hasBalcony, filters.hasBalcony));
      }
      
      if (filters?.hasGarden !== undefined) {
        conditions.push(eq(properties.hasGarden, filters.hasGarden));
      }
      
      if (filters?.hasAirConditioning !== undefined) {
        conditions.push(eq(properties.hasAirConditioning, filters.hasAirConditioning));
      }
      
      if (filters?.hasFireplace !== undefined) {
        conditions.push(eq(properties.hasFireplace, filters.hasFireplace));
      }
      
      if (filters?.hasPetsAllowed !== undefined) {
        conditions.push(eq(properties.hasPetsAllowed, filters.hasPetsAllowed));
      }

      if (filters?.furnished !== undefined) {
        conditions.push(eq(properties.furnished, filters.furnished));
      }

      if (filters?.hasElevator !== undefined) {
        conditions.push(eq(properties.hasElevator, filters.hasElevator));
      }

      if (filters?.hasSecurity !== undefined) {
        conditions.push(eq(properties.hasSecurity, filters.hasSecurity));
      }

      if (filters?.hasGym !== undefined) {
        conditions.push(eq(properties.hasGym, filters.hasGym));
      }

      if (filters?.hasPlayground !== undefined) {
        conditions.push(eq(properties.hasPlayground, filters.hasPlayground));
      }

      if (filters?.featured !== undefined) {
        conditions.push(eq(properties.featured, filters.featured));
      }

      if (filters?.agentId) {
        conditions.push(eq(properties.agentId, filters.agentId));
      }

      if (filters?.minYearBuilt) {
        conditions.push(gte(properties.yearBuilt, filters.minYearBuilt));
      }

      if (filters?.maxYearBuilt) {
        conditions.push(lte(properties.yearBuilt, filters.maxYearBuilt));
      }
      
      // Get total count for pagination
      const [countResult] = await db
        .select({ count: count() })
        .from(properties)
        .where(and(...conditions));
      const total = Number(countResult.count);

      // Build main query
      let query = db
        .select()
        .from(properties)
        .where(and(...conditions));
      
      // Add sorting logic
      if (filters?.sortBy) {
        switch (filters.sortBy) {
          case 'price-low':
            query = query.orderBy(asc(properties.price));
            break;
          case 'price-high':
            query = query.orderBy(desc(properties.price));
            break;
          case 'newest':
            query = query.orderBy(desc(properties.createdAt));
            break;
          case 'oldest':
            query = query.orderBy(asc(properties.createdAt));
            break;
          case 'bedrooms-high':
            query = query.orderBy(desc(properties.bedrooms));
            break;
          case 'bedrooms-low':
            query = query.orderBy(asc(properties.bedrooms));
            break;
          case 'size-high':
            query = query.orderBy(desc(properties.squareFeet));
            break;
          case 'size-low':
            query = query.orderBy(asc(properties.squareFeet));
            break;
          default:
            query = query.orderBy(desc(properties.createdAt));
        }
      } else {
        query = query.orderBy(desc(properties.createdAt));
      }
      
      query = applyPagination(query, pagination);
      let result = await query;
      
      // Apply distance filter if location and radius are provided
      if (filters?.latitude && filters?.longitude && filters?.radius) {
        result = result.filter(property => {
          if (!property.latitude || !property.longitude) return false;
          
          const distance = calculateDistance(
            filters.latitude!,
            filters.longitude!,
            parseFloat(property.latitude),
            parseFloat(property.longitude)
          );
          
          return distance <= filters.radius!;
        });
      }
      
      return createPaginatedResponse(result, pagination, total);
    }, 'getProperties');
  }

  async getPropertiesWithCursor(filters?: PropertyFilters, pagination?: CursorPaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Property>> {
    return executeWithMetrics(async () => {
      const conditions = [applySoftDeleteFilter(options)];
      
      // Apply filters (same as above, simplified for brevity)
      if (filters?.search) {
        conditions.push(
          or(
            ilike(properties.title, `%${filters.search}%`),
            ilike(properties.address, `%${filters.search}%`),
            ilike(properties.city, `%${filters.search}%`)
          )
        );
      }

      if (filters?.status) {
        conditions.push(eq(properties.status, filters.status as any));
      }

      if (filters?.propertyType) {
        if (Array.isArray(filters.propertyType)) {
          conditions.push(inArray(properties.propertyType, filters.propertyType as any[]));
        } else {
          conditions.push(eq(properties.propertyType, filters.propertyType as any));
        }
      }
      
      // Apply sorting first
      const sortField = pagination?.sort || 'createdAt';
      const order = pagination?.order || 'desc';
      
      let query = db
        .select()
        .from(properties);

      // Apply cursor pagination with existing conditions
      query = applyCursorPagination(query, properties, pagination, conditions);
      
      if (order === 'desc') {
        query = query.orderBy(desc(properties[sortField as keyof typeof properties]));
      } else {
        query = query.orderBy(asc(properties[sortField as keyof typeof properties]));
      }

      const result = await query;
      return createPaginatedResponse(result, pagination);
    }, 'getPropertiesWithCursor');
  }

  async getProperty(id: string, options?: SoftDeleteOptions): Promise<Property | undefined> {
    return executeWithMetrics(async () => {
      const [property] = await db
        .select()
        .from(properties)
        .where(and(eq(properties.id, id), applySoftDeleteFilter(options)));
      return property;
    }, `getProperty:${id}`);
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    return executeWithMetrics(async () => {
      const [created] = await db
        .insert(properties)
        .values({
          ...property,
          // Generate search vector for full-text search
          searchVector: `${property.title} ${property.description || ''} ${property.address} ${property.city} ${property.state}`.toLowerCase()
        })
        .returning();
      return created;
    }, 'createProperty');
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property> {
    return executeWithMetrics(async () => {
      const updateData = { 
        ...property, 
        updatedAt: new Date() 
      };

      // Update search vector if title, description, or address changed
      if (property.title || property.description || property.address || property.city || property.state) {
        const existing = await this.getProperty(id);
        if (existing) {
          updateData.searchVector = `${property.title || existing.title} ${property.description || existing.description || ''} ${property.address || existing.address} ${property.city || existing.city} ${property.state || existing.state}`.toLowerCase();
        }
      }

      const [updated] = await db
        .update(properties)
        .set(updateData)
        .where(eq(properties.id, id))
        .returning();
      return updated;
    }, `updateProperty:${id}`);
  }

  async deleteProperty(id: string): Promise<void> {
    return executeWithMetrics(async () => {
      await db.delete(properties).where(eq(properties.id, id));
    }, `deleteProperty:${id}`);
  }

  async softDeleteProperty(id: string): Promise<void> {
    return executeWithMetrics(async () => {
      await db
        .update(properties)
        .set({ 
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(properties.id, id));
    }, `softDeleteProperty:${id}`);
  }

  async restoreProperty(id: string): Promise<Property> {
    return executeWithMetrics(async () => {
      const [property] = await db
        .update(properties)
        .set({ 
          deletedAt: null,
          updatedAt: new Date()
        })
        .where(eq(properties.id, id))
        .returning();
      return property;
    }, `restoreProperty:${id}`);
  }

  async getFeaturedProperties(limit: number = 6, options?: SoftDeleteOptions): Promise<Property[]> {
    return executeWithMetrics(async () => {
      return await db
        .select()
        .from(properties)
        .where(and(eq(properties.featured, true), applySoftDeleteFilter(options)))
        .orderBy(desc(properties.createdAt))
        .limit(limit);
    }, 'getFeaturedProperties');
  }

  async getPropertiesByAgent(agentId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Property>> {
    return executeWithMetrics(async () => {
      const conditions = [eq(properties.agentId, agentId), applySoftDeleteFilter(options)];

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(properties)
        .where(and(...conditions));
      const total = Number(countResult.count);

      // Get paginated results
      let query = db
        .select()
        .from(properties)
        .where(and(...conditions))
        .orderBy(desc(properties.createdAt));

      query = applyPagination(query, pagination);
      const data = await query;

      return createPaginatedResponse(data, pagination, total);
    }, `getPropertiesByAgent:${agentId}`);
  }

  // ==================== INQUIRY OPERATIONS ====================

  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    return executeWithMetrics(async () => {
      const [created] = await db
        .insert(inquiries)
        .values(inquiry)
        .returning();
      return created;
    }, 'createInquiry');
  }

  async getInquiriesByAgent(agentId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Inquiry>> {
    return executeWithMetrics(async () => {
      const conditions = [eq(properties.agentId, agentId), applySoftDeleteFilter(options)];

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(inquiries)
        .innerJoin(properties, eq(inquiries.propertyId, properties.id))
        .where(and(...conditions));
      const total = Number(countResult.count);

      // Get paginated results with property info
      let query = db
        .select({
          id: inquiries.id,
          propertyId: inquiries.propertyId,
          firstName: inquiries.firstName,
          lastName: inquiries.lastName,
          email: inquiries.email,
          phone: inquiries.phone,
          message: inquiries.message,
          status: inquiries.status,
          priority: inquiries.priority,
          source: inquiries.source,
          respondedAt: inquiries.respondedAt,
          createdAt: inquiries.createdAt,
          updatedAt: inquiries.updatedAt,
          deletedAt: inquiries.deletedAt,
          propertyTitle: properties.title,
        })
        .from(inquiries)
        .innerJoin(properties, eq(inquiries.propertyId, properties.id))
        .where(and(...conditions))
        .orderBy(desc(inquiries.createdAt));

      query = applyPagination(query, pagination);
      const data = await query;

      return createPaginatedResponse(data, pagination, total);
    }, `getInquiriesByAgent:${agentId}`);
  }

  async getInquiriesForProperty(propertyId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Inquiry>> {
    return executeWithMetrics(async () => {
      const conditions = [eq(inquiries.propertyId, propertyId), applySoftDeleteFilter(options)];

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(inquiries)
        .where(and(...conditions));
      const total = Number(countResult.count);

      // Get paginated results
      let query = db
        .select()
        .from(inquiries)
        .where(and(...conditions))
        .orderBy(desc(inquiries.createdAt));

      query = applyPagination(query, pagination);
      const data = await query;

      return createPaginatedResponse(data, pagination, total);
    }, `getInquiriesForProperty:${propertyId}`);
  }

  async updateInquiry(id: string, updates: Partial<InsertInquiry>): Promise<Inquiry> {
    return executeWithMetrics(async () => {
      const [updated] = await db
        .update(inquiries)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, id))
        .returning();
      return updated;
    }, `updateInquiry:${id}`);
  }

  async softDeleteInquiry(id: string): Promise<void> {
    return executeWithMetrics(async () => {
      await db
        .update(inquiries)
        .set({ 
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(inquiries.id, id));
    }, `softDeleteInquiry:${id}`);
  }

  async restoreInquiry(id: string): Promise<Inquiry> {
    return executeWithMetrics(async () => {
      const [inquiry] = await db
        .update(inquiries)
        .set({ 
          deletedAt: null,
          updatedAt: new Date()
        })
        .where(eq(inquiries.id, id))
        .returning();
      return inquiry;
    }, `restoreInquiry:${id}`);
  }

  // ==================== PROPERTY METRICS OPERATIONS ====================

  async createPropertyView(view: InsertPropertyView): Promise<PropertyView> {
    return executeWithMetrics(async () => {
      // Use transaction to increment view count atomically
      const [created] = await db.transaction(async (tx) => {
        // Create view record
        const [viewRecord] = await tx
          .insert(propertyViews)
          .values(view)
          .returning();

        // Update property view count
        await tx
          .update(properties)
          .set({ 
            viewsCount: sql`${properties.viewsCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(properties.id, view.propertyId));

        return [viewRecord];
      });

      return created;
    }, 'createPropertyView');
  }

  async getPropertyViewsCount(propertyId: string, options?: SoftDeleteOptions): Promise<number> {
    return executeWithMetrics(async () => {
      const result = await db
        .select({ count: count() })
        .from(propertyViews)
        .where(and(eq(propertyViews.propertyId, propertyId), applySoftDeleteFilter(options)));
      return Number(result[0]?.count || 0);
    }, `getPropertyViewsCount:${propertyId}`);
  }

  async getPropertyViews(propertyId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<PropertyView>> {
    return executeWithMetrics(async () => {
      const conditions = [eq(propertyViews.propertyId, propertyId), applySoftDeleteFilter(options)];

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(propertyViews)
        .where(and(...conditions));
      const total = Number(countResult.count);

      // Get paginated results
      let query = db
        .select()
        .from(propertyViews)
        .where(and(...conditions))
        .orderBy(desc(propertyViews.createdAt));

      query = applyPagination(query, pagination);
      const data = await query;

      return createPaginatedResponse(data, pagination, total);
    }, `getPropertyViews:${propertyId}`);
  }

  async createPropertyFavorite(favorite: InsertPropertyFavorite): Promise<PropertyFavorite> {
    return executeWithMetrics(async () => {
      // Use transaction to increment favorite count atomically
      const [created] = await db.transaction(async (tx) => {
        // Create favorite record
        const [favoriteRecord] = await tx
          .insert(propertyFavorites)
          .values(favorite)
          .returning();

        // Update property favorites count
        await tx
          .update(properties)
          .set({ 
            favoritesCount: sql`${properties.favoritesCount} + 1`,
            updatedAt: new Date()
          })
          .where(eq(properties.id, favorite.propertyId));

        return [favoriteRecord];
      });

      return created;
    }, 'createPropertyFavorite');
  }

  async removePropertyFavorite(propertyId: string, userId: string): Promise<void> {
    return executeWithMetrics(async () => {
      // Use transaction to decrement favorite count atomically
      await db.transaction(async (tx) => {
        // Delete favorite record
        await tx
          .delete(propertyFavorites)
          .where(
            and(
              eq(propertyFavorites.propertyId, propertyId),
              eq(propertyFavorites.userId, userId)
            )
          );

        // Update property favorites count
        await tx
          .update(properties)
          .set({ 
            favoritesCount: sql`GREATEST(${properties.favoritesCount} - 1, 0)`,
            updatedAt: new Date()
          })
          .where(eq(properties.id, propertyId));
      });
    }, `removePropertyFavorite:${propertyId}:${userId}`);
  }

  async softDeletePropertyFavorite(propertyId: string, userId: string): Promise<void> {
    return executeWithMetrics(async () => {
      await db
        .update(propertyFavorites)
        .set({ 
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(propertyFavorites.propertyId, propertyId),
            eq(propertyFavorites.userId, userId)
          )
        );
    }, `softDeletePropertyFavorite:${propertyId}:${userId}`);
  }

  async restorePropertyFavorite(propertyId: string, userId: string): Promise<PropertyFavorite> {
    return executeWithMetrics(async () => {
      const [favorite] = await db
        .update(propertyFavorites)
        .set({ 
          deletedAt: null,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(propertyFavorites.propertyId, propertyId),
            eq(propertyFavorites.userId, userId)
          )
        )
        .returning();
      return favorite;
    }, `restorePropertyFavorite:${propertyId}:${userId}`);
  }

  async getPropertyFavoritesCount(propertyId: string, options?: SoftDeleteOptions): Promise<number> {
    return executeWithMetrics(async () => {
      const result = await db
        .select({ count: count() })
        .from(propertyFavorites)
        .where(and(eq(propertyFavorites.propertyId, propertyId), applySoftDeleteFilter(options)));
      return Number(result[0]?.count || 0);
    }, `getPropertyFavoritesCount:${propertyId}`);
  }

  async isPropertyFavorited(propertyId: string, userId: string, options?: SoftDeleteOptions): Promise<boolean> {
    return executeWithMetrics(async () => {
      const result = await db
        .select({ id: propertyFavorites.id })
        .from(propertyFavorites)
        .where(
          and(
            eq(propertyFavorites.propertyId, propertyId),
            eq(propertyFavorites.userId, userId),
            applySoftDeleteFilter(options)
          )
        )
        .limit(1);
      return result.length > 0;
    }, `isPropertyFavorited:${propertyId}:${userId}`);
  }

  async getUserFavorites(userId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Property>> {
    return executeWithMetrics(async () => {
      const conditions = [
        eq(propertyFavorites.userId, userId),
        applySoftDeleteFilter(options)
      ];

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(propertyFavorites)
        .innerJoin(properties, eq(propertyFavorites.propertyId, properties.id))
        .where(and(...conditions));
      const total = Number(countResult.count);

      // Get paginated results
      let query = db
        .select({
          property: properties,
        })
        .from(propertyFavorites)
        .innerJoin(properties, eq(propertyFavorites.propertyId, properties.id))
        .where(and(...conditions))
        .orderBy(desc(propertyFavorites.createdAt));

      query = applyPagination(query, pagination);
      const data = await query;
      const propertiesData = data.map(fp => fp.property);

      return createPaginatedResponse(propertiesData, pagination, total);
    }, `getUserFavorites:${userId}`);
  }

  async getAgentMetrics(agentId: string): Promise<{ totalViews: number; totalFavorites: number; totalInquiries: number; totalProperties: number }> {
    return executeWithMetrics(async () => {
      // Get all properties for this agent
      const agentProperties = await db
        .select({ id: properties.id })
        .from(properties)
        .where(and(eq(properties.agentId, agentId), withoutSoftDeleted));
      
      if (agentProperties.length === 0) {
        return { totalViews: 0, totalFavorites: 0, totalInquiries: 0, totalProperties: 0 };
      }
      
      const propertyIds = agentProperties.map(p => p.id);
      
      // Use Promise.all to run queries in parallel
      const [viewsResult, favoritesResult, inquiriesResult] = await Promise.all([
        // Count total views for agent's properties
        db
          .select({ count: count() })
          .from(propertyViews)
          .where(and(inArray(propertyViews.propertyId, propertyIds), withoutSoftDeleted)),
        
        // Count total favorites for agent's properties
        db
          .select({ count: count() })
          .from(propertyFavorites)
          .where(and(inArray(propertyFavorites.propertyId, propertyIds), withoutSoftDeleted)),
        
        // Count total inquiries for agent's properties
        db
          .select({ count: count() })
          .from(inquiries)
          .where(and(inArray(inquiries.propertyId, propertyIds), withoutSoftDeleted))
      ]);
      
      return {
        totalViews: Number(viewsResult[0]?.count || 0),
        totalFavorites: Number(favoritesResult[0]?.count || 0),
        totalInquiries: Number(inquiriesResult[0]?.count || 0),
        totalProperties: agentProperties.length
      };
    }, `getAgentMetrics:${agentId}`);
  }

  // ==================== APPOINTMENT OPERATIONS ====================

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    return executeWithMetrics(async () => {
      const [newAppointment] = await db
        .insert(appointments)
        .values(appointment)
        .returning();
      return newAppointment;
    }, 'createAppointment');
  }

  async getAppointmentsByAgent(agentId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Appointment>> {
    return executeWithMetrics(async () => {
      const conditions = [eq(appointments.agentId, agentId), applySoftDeleteFilter(options)];

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(and(...conditions));
      const total = Number(countResult.count);

      // Get paginated results
      let query = db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(asc(appointments.appointmentDate));

      query = applyPagination(query, pagination);
      const data = await query;

      return createPaginatedResponse(data, pagination, total);
    }, `getAppointmentsByAgent:${agentId}`);
  }

  async getAppointmentsByProperty(propertyId: string, pagination?: PaginationOptions, options?: SoftDeleteOptions): Promise<PaginatedResponse<Appointment>> {
    return executeWithMetrics(async () => {
      const conditions = [eq(appointments.propertyId, propertyId), applySoftDeleteFilter(options)];

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(and(...conditions));
      const total = Number(countResult.count);

      // Get paginated results
      let query = db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(asc(appointments.appointmentDate));

      query = applyPagination(query, pagination);
      const data = await query;

      return createPaginatedResponse(data, pagination, total);
    }, `getAppointmentsByProperty:${propertyId}`);
  }

  async getAppointment(id: string, options?: SoftDeleteOptions): Promise<Appointment | undefined> {
    return executeWithMetrics(async () => {
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, id), applySoftDeleteFilter(options)));
      return appointment;
    }, `getAppointment:${id}`);
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment> {
    return executeWithMetrics(async () => {
      // Convert appointmentDate string to Date object if needed
      const processedUpdates = { ...updates };
      if (processedUpdates.appointmentDate && typeof processedUpdates.appointmentDate === 'string') {
        processedUpdates.appointmentDate = new Date(processedUpdates.appointmentDate);
      }
      
      const [updatedAppointment] = await db
        .update(appointments)
        .set({
          ...processedUpdates,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, id))
        .returning();
      return updatedAppointment;
    }, `updateAppointment:${id}`);
  }

  async deleteAppointment(id: string): Promise<void> {
    return executeWithMetrics(async () => {
      await db
        .delete(appointments)
        .where(eq(appointments.id, id));
    }, `deleteAppointment:${id}`);
  }

  async softDeleteAppointment(id: string): Promise<void> {
    return executeWithMetrics(async () => {
      await db
        .update(appointments)
        .set({ 
          deletedAt: new Date(),
          updatedAt: new Date(),
          status: 'cancelled'
        })
        .where(eq(appointments.id, id));
    }, `softDeleteAppointment:${id}`);
  }

  async restoreAppointment(id: string): Promise<Appointment> {
    return executeWithMetrics(async () => {
      const [appointment] = await db
        .update(appointments)
        .set({ 
          deletedAt: null,
          updatedAt: new Date(),
          status: 'scheduled'
        })
        .where(eq(appointments.id, id))
        .returning();
      return appointment;
    }, `restoreAppointment:${id}`);
  }

  async getAgentAvailableSlots(agentId: string, date: string, options?: SoftDeleteOptions): Promise<string[]> {
    return executeWithMetrics(async () => {
      // Get all appointments for the agent on the given date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.agentId, agentId),
            gte(appointments.appointmentDate, startOfDay),
            lte(appointments.appointmentDate, endOfDay),
            applySoftDeleteFilter(options)
          )
        );

      // Generate available time slots (9 AM to 6 PM, 1-hour intervals)
      const allSlots = [];
      for (let hour = 9; hour < 18; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        allSlots.push(timeSlot);
      }

      // Filter out occupied slots
      const occupiedSlots = existingAppointments.map(apt => {
        const date = new Date(apt.appointmentDate);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      });

      return allSlots.filter(slot => !occupiedSlots.includes(slot));
    }, `getAgentAvailableSlots:${agentId}`);
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string, options?: SoftDeleteOptions): Promise<Appointment[]> {
    return executeWithMetrics(async () => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return await db
        .select()
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, start),
            lt(appointments.appointmentDate, end),
            applySoftDeleteFilter(options)
          )
        )
        .orderBy(asc(appointments.appointmentDate));
    }, `getAppointmentsByDateRange:${startDate}-${endDate}`);
  }

  // ==================== ANALYTICS OPERATIONS ====================

  async getDashboardMetrics(agentId?: string): Promise<any> {
    return executeWithMetrics(async () => {
      const baseConditions = agentId ? [eq(properties.agentId, agentId)] : [];
      const propertyConditions = [...baseConditions, withoutSoftDeleted];
      
      // Run all metrics queries in parallel for better performance
      const [
        totalProperties,
        activeProperties,
        totalInquiries,
        totalAppointments,
        totalViews,
        totalFavorites,
        recentProperties,
        recentInquiries
      ] = await Promise.all([
        // Total properties
        db.select({ count: count() }).from(properties).where(and(...propertyConditions)),
        
        // Active properties (for sale/rent)
        db.select({ count: count() }).from(properties).where(and(...propertyConditions, or(eq(properties.status, 'for_sale'), eq(properties.status, 'for_rent')))),
        
        // Total inquiries
        agentId 
          ? db.select({ count: count() }).from(inquiries).innerJoin(properties, eq(inquiries.propertyId, properties.id)).where(and(eq(properties.agentId, agentId), withoutSoftDeleted))
          : db.select({ count: count() }).from(inquiries).where(withoutSoftDeleted),
        
        // Total appointments
        agentId
          ? db.select({ count: count() }).from(appointments).where(and(eq(appointments.agentId, agentId), withoutSoftDeleted))
          : db.select({ count: count() }).from(appointments).where(withoutSoftDeleted),
        
        // Total views
        agentId
          ? db.select({ count: count() }).from(propertyViews).innerJoin(properties, eq(propertyViews.propertyId, properties.id)).where(and(eq(properties.agentId, agentId), withoutSoftDeleted))
          : db.select({ count: count() }).from(propertyViews).where(withoutSoftDeleted),
        
        // Total favorites
        agentId
          ? db.select({ count: count() }).from(propertyFavorites).innerJoin(properties, eq(propertyFavorites.propertyId, properties.id)).where(and(eq(properties.agentId, agentId), withoutSoftDeleted))
          : db.select({ count: count() }).from(propertyFavorites).where(withoutSoftDeleted),
        
        // Recent properties (last 7 days)
        db.select({ count: count() }).from(properties).where(and(...propertyConditions, gte(properties.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))),
        
        // Recent inquiries (last 7 days)
        agentId
          ? db.select({ count: count() }).from(inquiries).innerJoin(properties, eq(inquiries.propertyId, properties.id)).where(and(eq(properties.agentId, agentId), withoutSoftDeleted, gte(inquiries.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))))
          : db.select({ count: count() }).from(inquiries).where(and(withoutSoftDeleted, gte(inquiries.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))))
      ]);

      return {
        properties: {
          total: Number(totalProperties[0]?.count || 0),
          active: Number(activeProperties[0]?.count || 0),
          recent: Number(recentProperties[0]?.count || 0)
        },
        inquiries: {
          total: Number(totalInquiries[0]?.count || 0),
          recent: Number(recentInquiries[0]?.count || 0)
        },
        appointments: {
          total: Number(totalAppointments[0]?.count || 0)
        },
        engagement: {
          totalViews: Number(totalViews[0]?.count || 0),
          totalFavorites: Number(totalFavorites[0]?.count || 0)
        }
      };
    }, `getDashboardMetrics:${agentId || 'global'}`);
  }
}

export const storage = new DatabaseStorage();