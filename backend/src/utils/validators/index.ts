// Custom validators
import { IsPhoneNumber, IsUrl } from 'class-validator';

// NRC validator
export function validateNRC(nrc: string): boolean {
  return /^\d{6}-\d{7}-\d{1}$/.test(nrc);
}

// Decimal validator for prices
export function validatePrice(price: number): boolean {
  return price >= 0 && price <= 999999.99;
}

// Phone number validator
export function validatePhoneNumber(phone: string): boolean {
  return /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im.test(
    phone,
  );
}

// Email validator
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// URL validator
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Quantity validator
export function validateQuantity(qty: number): boolean {
  return Number.isInteger(qty) && qty > 0 && qty <= 999999;
}
