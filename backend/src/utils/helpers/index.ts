// Pagination helper
export class PaginationHelper {
  static paginate(page: number, limit: number) {
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  static meta(page: number, limit: number, total: number) {
    return {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}

// Date helper
export class DateHelper {
  static isExpired(date: Date): boolean {
    return new Date(date) < new Date();
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// String helper
export class StringHelper {
  static generateRandomString(length: number): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }

  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  static truncate(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + '...' : text;
  }
}
