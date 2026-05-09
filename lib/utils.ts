export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `HFS-${timestamp}-${random}`;
}

export function generatePickupCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function calculateLoyaltyPoints(amount: number, rate = 0.05): number {
  return Math.floor(amount * rate * 100);
}

export function pointsToDiscount(points: number): number {
  return points / 100;
}

export function getEstimatedTime(type: string, prepTime = 20): number {
  if (type === "delivery") return prepTime + 20;
  if (type === "pickup") return prepTime + 5;
  return prepTime;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
