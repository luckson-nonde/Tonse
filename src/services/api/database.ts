/**
 * API Database Service - Replaces IndexedDB (Dexie.js)
 * Provides the same interface as the original database but communicates with the backend
 */

import { apiClient } from './client';
import type {
  User,
  Inquiry,
  Quote,
  Transaction,
  Shop,
  Product,
  Schedule,
  CalendarEvent,
  VenueSpace,
  AuditLog,
  PurchaseOrder,
  OrderConfirmation,
  DeliveryOrder
} from '../../types';

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
  constructor(private endpoint: string, private entityName: string) {}

  async add(item: T | T[]): Promise<number> {
    const items = Array.isArray(item) ? item : [item];
    
    // For single item, POST directly to endpoint
    if (items.length === 1) {
      const response = await apiClient.post<any>(
        this.endpoint,
        items[0]
      );
      return response.data?.id || response.data?._id || 0;
    }
    
    // For multiple items, post each one
    let lastId = 0;
    for (const singleItem of items) {
      const response = await apiClient.post<any>(
        this.endpoint,
        singleItem
      );
      lastId = response.data?.id || response.data?._id || 0;
    }
    return lastId;
  }

  async put(item: T): Promise<number> {
    return this.add(item);
  }

  async get(id: number | string): Promise<T | undefined> {
    try {
      const response = await apiClient.get<T>(`${this.endpoint}/${id}`);
      return response.data;
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
      if (response.data) {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        // If response.data is an object with a 'data' property (nested structure)
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
      }
      return [];
    } catch (error: any) {
      console.debug(`Table.toArray() for ${this.entityName} returned no data:`, error?.message);
      return [];
    }
  }

  where(key: string): IQuery<T> {
    return new Query(this.endpoint, key);
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
  constructor(private endpoint: string, private key: string) {}

  equals(value: any): IQueryChain<T> {
    return new QueryChain(this.endpoint, this.key, [value]);
  }

  anyOf(values: any[]): IQueryChain<T> {
    return new QueryChain(this.endpoint, `${this.key}[]`, values);
  }
}

class QueryChain<T> implements IQueryChain<T> {
  private values: any[];
  private order: 'ASC' | 'DESC' = 'ASC';
  private filterFn?: (item: T) => boolean;

  constructor(private endpoint: string, private key: string, values: any[]) {
    this.values = values;
  }

  async toArray(): Promise<T[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('filter', this.key);
      if (this.values.length === 1) {
        queryParams.append('value', String(this.values[0]));
      } else {
        this.values.forEach(v => queryParams.append('values', String(v)));
      }
      queryParams.append('order', this.order);

      const response = await apiClient.get<any>(
        `${this.endpoint}?${queryParams.toString()}`
      );
      
      // Handle nested response structure: { data: [...], total: ... }
      let results: T[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          results = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          results = response.data.data;
        }
      }
      
      // Apply additional filter if provided
      if (this.filterFn) {
        results = results.filter(this.filterFn);
      }
      
      return results;
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
    this.inquiries = new Table<Inquiry>('/inquiries', 'inquiries');
    this.quotes = new Table<Quote>('/quotes', 'quotes');
    this.transactions = new Table<Transaction>('/transactions', 'transactions');
    this.shops = new Table<Shop>('/shops', 'shops');
    this.products = new Table<Product>('/products', 'products');
    this.schedules = new Table<Schedule>('/schedules', 'schedules');
    this.calendarEvents = new Table<CalendarEvent>('/calendar-events', 'calendarEvents');
    this.venueSpaces = new Table<VenueSpace>('/venue-spaces', 'venueSpaces');
    this.auditLogs = new Table<AuditLog>('/audit-logs', 'auditLogs');
    this.purchaseOrders = new Table<PurchaseOrder>('/purchase-orders', 'purchaseOrders');
    this.orderConfirmations = new Table<OrderConfirmation>('/order-confirmations', 'orderConfirmations');
    this.deliveryOrders = new Table<DeliveryOrder>('/delivery-orders', 'deliveryOrders');
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
  async transaction<T>(
    mode: string,
    tables: any[],
    callback: () => Promise<T>
  ): Promise<T> {
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
      this.deliveryOrders
    ];
  }
}

// Create and export database instance
export const db = new AppDatabaseAPI();
export const dbAPI = new AppDatabaseAPI();
