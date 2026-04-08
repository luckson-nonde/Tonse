import Dexie, { Table } from 'dexie';
import { User } from './AuthContext';
import { Inquiry, Quote, Transaction, Shop, Product, Schedule, CalendarEvent, VenueSpace, AuditLog } from './types';

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

  constructor() {
    super('AppDatabase');
    this.version(12).stores({
      users: '++id, email, role, phone, parentProviderId',
      inquiries: '++id, buyerId, status, createdAt',
      quotes: '++id, inquiryId, providerId, status, collectionCode, createdAt',
      transactions: '++id, userId, type, category, quoteId, createdAt, status',
      shops: '++id, providerId, name, category, location',
      products: '++id, providerId, category, status, createdAt',
      schedules: '++id, providerId, buyerId, inquiryId, quoteId, date, status',
      calendarEvents: '++id, userId, date, status, category',
      venueSpaces: '++id, providerId, status, createdAt',
      auditLogs: '++id, providerId, staffId, actionType, timestamp'
    });
  }
}

export const db = new AppDatabase();
