/**
 * API Database Service - Replaces IndexedDB (Dexie.js)
 * Provides the same interface as the original database but communicates with the backend
 */

import { apiClient } from './client';
import { robustParse } from '../../utils/jsonUtils';
import type {
  Inquiry,
  Quote,
  User,
  Transaction,
  Shop,
  Product,
  Schedule,
  CalendarEvent,
  VenueSpace,
  AuditLog,
  PurchaseOrder,
  OrderConfirmation,
  DeliveryOrder,
} from '../../types';

// Helper to normalize Inquiries
function transformInquiry(inquiry: any): Inquiry {
  if (!inquiry) return inquiry;
  return {
    ...inquiry,
    preferences: robustParse(inquiry.preferences, {}),
    attributes: robustParse(inquiry.attributes, {}),
    items: robustParse(inquiry.items, []),
    entertainmentData: robustParse(inquiry.entertainmentData, null),
    repairData: robustParse(inquiry.repairData, null),
    // Ensure description isn't a stringified empty object
    description:
      typeof inquiry.description === 'string' &&
      (inquiry.description === '{}' || inquiry.description === '[]')
        ? ''
        : inquiry.description || '',
  };
}

// Helper to normalize Quotes
function transformQuote(quote: any): Quote {
  if (!quote) return quote;
  return {
    ...quote,
    itemPrices: robustParse(quote.itemPrices, []),
    inquiry: quote.inquiry ? transformInquiry(quote.inquiry) : undefined,
  };
}

// Helper to normalize AuditLogs
function transformAuditLog(log: any): AuditLog {
  if (!log) return log;
  return {
    ...log,
    actionType: log.action || log.actionType,
    timestamp: log.createdAt ? new Date(log.createdAt).getTime() : log.timestamp || Date.now(),
  };
}

// Table interfaces that mirror Dexie operations
interface ITable<T> {
  add: (item: T | T[]) => Promise<number>;
  put: (item: T) => Promise<number>;
  get: (id: number | string) => Promise<T | undefined>;
  update: (id: number | string, changes: Partial<T>) => Promise<void>;
  delete: (id: number | string) => Promise<void>;
  toArray: () => Promise<T[]>;
  where: (key: string) => IQuery<T>;
  clear: () => Promise<void>;
  bulkAdd: (items: T[]) => Promise<void>;
}

interface IQuery<T> {
  equals: (value: any) => IQueryChain<T>;
  anyOf: (values: any[]) => IQueryChain<T>;
}

interface IQueryChain<T> {
  toArray: () => Promise<T[]>;
  sortBy: (key: string) => Promise<T[]>;
  reverse: () => IQueryChain<T>;
  and: (filterFn: (item: T) => boolean) => IQueryChain<T>;
  first: () => Promise<T | undefined>;
}

// Implementation of Table
class Table<T> implements ITable<T> {
  constructor(
    private endpoint: string,
    private entityName: string,
    private transform?: (item: any) => T
  ) {}

  private doTransform(item: any): T {
    return this.transform ? this.transform(item) : (item as T);
  }

  async add(item: T | T[]): Promise<number> {
    const items = Array.isArray(item) ? item : [item];

    // For single item, POST directly to endpoint
    if (items.length === 1) {
      const response = await apiClient.post<any>(this.endpoint, items[0]);
      return response.data?.id || response.data?._id || 0;
    }

    // For multiple items, post each one
    let lastId = 0;
    for (const singleItem of items) {
      const response = await apiClient.post<any>(this.endpoint, singleItem);
      lastId = response.data?.id || response.data?._id || 0;
    }
    return lastId;
  }

  async put(item: T): Promise<number> {
    return this.add(item);
  }

  async get(id: number | string): Promise<T | undefined> {
    try {
      const response = await apiClient.get<any>(`${this.endpoint}/${id}`);
      return response.data ? this.doTransform(response.data) : undefined;
    } catch {
      return undefined;
    }
  }

  async update(id: number | string, changes: Partial<T>): Promise<void> {
    await apiClient.patch<T>(`${this.endpoint}/${id}`, changes);
  }

  async delete(id: number | string): Promise<void> {
    await apiClient.delete(`${this.endpoint}/${id}`);
  }

  async toArray(): Promise<T[]> {
    try {
      const response = await apiClient.get<any>(`${this.endpoint}`);
      // Handle nested response structure: { data: [...], total: ... }
      let rawData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          rawData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          rawData = response.data.data;
        }
      }
      return rawData.map((item) => this.doTransform(item));
    } catch (error: any) {
      console.debug(`Table.toArray() for ${this.entityName} returned no data:`, error?.message);
      return [];
    }
  }

  where(key: string): IQuery<T> {
    return new Query(this.endpoint, key, this.transform);
  }

  async clear(): Promise<void> {
    // This would need a special endpoint on the backend
    console.warn(`Clear operation for ${this.entityName} not implemented for batch operations`);
  }

  async bulkAdd(items: T[]): Promise<void> {
    await this.add(items);
  }
}

// Implementation of Query chain
class Query<T> implements IQuery<T> {
  constructor(
    private endpoint: string,
    private key: string,
    private transform?: (item: any) => T
  ) {}

  equals(value: any): IQueryChain<T> {
    return new QueryChain(this.endpoint, this.key, [value], this.transform);
  }

  anyOf(values: any[]): IQueryChain<T> {
    return new QueryChain(this.endpoint, `${this.key}[]`, values, this.transform);
  }
}

class QueryChain<T> implements IQueryChain<T> {
  private values: any[];
  private order: 'ASC' | 'DESC' = 'ASC';
  private filterFn?: (item: T) => boolean;

  constructor(
    private endpoint: string,
    private key: string,
    values: any[],
    private transform?: (item: any) => T
  ) {
    this.values = values;
  }

  private doTransform(item: any): T {
    return this.transform ? this.transform(item) : (item as T);
  }

  async toArray(): Promise<T[]> {
    try {
      const queryParams = new URLSearchParams();
      if (this.values.length === 1) {
        queryParams.append(this.key, String(this.values[0]));
      } else {
        this.values.forEach((v) => queryParams.append(this.key, String(v)));
      }
      queryParams.append('order', this.order);

      const response = await apiClient.get<any>(`${this.endpoint}?${queryParams.toString()}`);

      // Handle nested response structure: { data: [...], total: ... }
      let results: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          results = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          results = response.data.data;
        }
      }

      let transformedResults = results.map((item) => this.doTransform(item));

      // Apply additional filter if provided
      if (this.filterFn) {
        transformedResults = transformedResults.filter(this.filterFn);
      }

      return transformedResults;
    } catch (error: any) {
      // Return empty array on any error (404, network, etc)
      console.debug('Query returned no data:', error?.message);
      return [];
    }
  }

  sortBy(key: string): Promise<T[]> {
    return this.toArray();
  }

  reverse(): IQueryChain<T> {
    this.order = 'DESC';
    return this;
  }

  and(filterFn: (item: T) => boolean): IQueryChain<T> {
    this.filterFn = filterFn;
    return this;
  }

  async first(): Promise<T | undefined> {
    const results = await this.toArray();
    return results.length > 0 ? results[0] : undefined;
  }
}

// Main Database Class
export class AppDatabaseAPI {
  // Define tables
  users: ITable<User>;
  inquiries: ITable<Inquiry>;
  quotes: ITable<Quote>;
  transactions: ITable<Transaction>;
  shops: ITable<Shop>;
  products: ITable<Product>;
  schedules: ITable<Schedule>;
  calendarEvents: ITable<CalendarEvent>;
  venueSpaces: ITable<VenueSpace>;
  auditLogs: ITable<AuditLog>;
  purchaseOrders: ITable<PurchaseOrder>;
  orderConfirmations: ITable<OrderConfirmation>;
  deliveryOrders: ITable<DeliveryOrder>;

  constructor() {
    // Initialize all tables with their respective API endpoints
    this.users = new Table<User>('/users', 'users');
    this.inquiries = new Table<Inquiry>('/inquiries', 'inquiries', transformInquiry);
    this.quotes = new Table<Quote>('/quotes', 'quotes', transformQuote);
    this.transactions = new Table<Transaction>('/payments', 'transactions');
    this.shops = new Table<Shop>('/shops', 'shops');
    this.products = new Table<Product>('/products', 'products');
    this.schedules = new Table<Schedule>('/schedules', 'schedules');
    this.calendarEvents = new Table<CalendarEvent>('/calendar-events', 'calendarEvents');
    this.venueSpaces = new Table<VenueSpace>('/venue-spaces', 'venueSpaces');
    this.auditLogs = new Table<AuditLog>('/audit', 'auditLogs', transformAuditLog);
    this.purchaseOrders = new Table<PurchaseOrder>('/orders', 'purchaseOrders');
    this.orderConfirmations = new Table<OrderConfirmation>('/orders', 'orderConfirmations');
    this.deliveryOrders = new Table<DeliveryOrder>('/orders', 'deliveryOrders');
  }

  async clearAllTables() {
    console.log('Clearing all tables via API...');
    try {
      await apiClient.post('/admin/clear-all-data');
      console.log('All tables cleared successfully.');
    } catch (error) {
      console.error('Error clearing tables:', error);
    }
  }

  // Syncing/transaction support (placeholder for API-based implementation)
  async transaction<T>(mode: string, tables: any[], callback: () => Promise<T>): Promise<T> {
    // In a real implementation, this would handle database transactions
    // For now, just execute the callback
    return callback();
  }

  get tables() {
    return [
      this.users,
      this.inquiries,
      this.quotes,
      this.transactions,
      this.shops,
      this.products,
      this.schedules,
      this.calendarEvents,
      this.venueSpaces,
      this.auditLogs,
      this.purchaseOrders,
      this.orderConfirmations,
      this.deliveryOrders,
    ];
  }
}

// Create and export database instance
export const db = new AppDatabaseAPI();
export const dbAPI = new AppDatabaseAPI();
