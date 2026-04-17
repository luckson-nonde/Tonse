// Frontend validators
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validatePassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}

export function validatePhoneNumber(phone: string): boolean {
  const regex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return regex.test(phone);
}

export function validateNRC(nrc: string): boolean {
  const regex = /^\d{6}-\d{7}-\d{1}$/;
  return regex.test(nrc);
}

export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateDiscountCode(code: string): boolean {
  return code.length >= 3 && code.length <= 20;
}

export function validatePrice(price: number): boolean {
  return price >= 0 && price <= 999999.99;
}

export function validateQuantity(qty: number): boolean {
  return Number.isInteger(qty) && qty > 0;
}
