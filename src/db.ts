import Dexie, { Table } from 'dexie';
import { User } from './AuthContext';
import { Inquiry, Quote, Transaction, Shop, Product, Schedule, CalendarEvent, VenueSpace, AuditLog, PurchaseOrder, OrderConfirmation, DeliveryOrder } from './types';

export class AppDatabase extends Dexie {
  users!: Table<User, number>;
  inquiries!: Table<Inquiry, number>;
  quotes!: Table<Quote, number>;
  transactions!: Table<Transaction, number>;
  shops!: Table<Shop, number>;
  products!: Table<Product, number>;
  schedules!: Table<Schedule, number>;
  calendarEvents!: Table<CalendarEvent, number>;
  venueSpaces!: Table<VenueSpace, number>;
  auditLogs!: Table<AuditLog, number>;
  purchaseOrders!: Table<PurchaseOrder, number>;
  orderConfirmations!: Table<OrderConfirmation, number>;
  deliveryOrders!: Table<DeliveryOrder, number>;

  constructor() {
    super('AppDatabase');
    this.version(16).stores({
      users: '++id, email, role, phone, parentProviderId',
      inquiries: '++id, buyerId, status, createdAt, archivedBy, deletedBy',
      quotes: '++id, inquiryId, providerId, status, collectionCode, createdAt',
      transactions: '++id, userId, type, category, quoteId, createdAt, status',
      shops: '++id, providerId, name, category, location',
      products: '++id, providerId, category, status, createdAt',
      schedules: '++id, providerId, buyerId, inquiryId, quoteId, date, status',
      calendarEvents: '++id, userId, date, status, category',
      venueSpaces: '++id, providerId, status, createdAt',
      auditLogs: '++id, providerId, staffId, actionType, timestamp',
      purchaseOrders: '++id, inquiryId, quotationId, buyerId, providerId, status, createdAt',
      orderConfirmations: '++id, poId, inquiryId, quoteId, buyerId, providerId, createdAt',
      deliveryOrders: '++id, inquiryId, purchaseOrderId, orderConfirmationId, buyerId, sellerId, status, createdAt'
    });
  }

  async clearAllTables() {
    console.log('Clearing all tables...');
    try {
      await this.transaction('rw', this.tables, async () => {
        for (const table of this.tables) {
          console.log(`Clearing table: ${table.name}`);
          await table.clear();
        }
      });
      console.log('All tables cleared successfully.');
    } catch (error) {
      console.error('Error clearing tables:', error);
    }
  }
}

export const db = new AppDatabase();
