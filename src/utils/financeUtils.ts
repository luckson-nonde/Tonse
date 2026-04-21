/**
 * Simple hash function to generate a consistent ID from a string.
 */
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  // Return something that looks like a UUID part
  return `${hex}-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(0, 4)}-${hex}${hex}`;
};

export const generateVirtualAccount = (phone: string | undefined): string => {
  if (!phone) return '000 000 0000';
  
  // Clean phone number (remove +, spaces, etc)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Format as a professional account number using the phone number
  // e.g., 260 977 123 456
  if (cleanPhone.length >= 9) {
    const last9 = cleanPhone.slice(-9);
    return `260 ${last9.slice(0, 3)} ${last9.slice(3, 6)} ${last9.slice(6)}`;
  }
  
  return cleanPhone;
};

/**
 * Formats a currency value to ZMW standard.
 */
export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
