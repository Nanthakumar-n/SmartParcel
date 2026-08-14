---
name: india-domain-formatting
description: India-specific validation patterns for logistics data including phone numbers, addresses, vehicle numbers, and currency. Use when generating forms, input fields, validation logic, or displaying financial/location data.
---
# India-Specific Domain Formatting

## Core Rule
Pre-load validation patterns for all Indian logistics domain data. Never generate a form, input field, or data display without applying the correct regional format and validation.

---

## Phone Numbers
- **Standard**: Indian format, `+91` country code prefix.
- **Validation**: 10-digit mobile numbers only (no leading 0).
- **Regex**: `/^(\+91)?[6-9]\d{9}$/`
- **Display format**: `+91 98765 43210`
- **Storage**: Store with `+91` prefix in E.164 format (`+919876543210`).

```typescript
// TypeScript validation example
const INDIA_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;

function validateIndianPhone(phone: string): boolean {
  return INDIA_PHONE_REGEX.test(phone.replace(/\s+/g, ''));
}
```

---

## Addresses & Geolocations
- Always capture **both** structured text and geolocation.
- Text fields: flat/building, street, landmark, city, state, pin code.
- Geo fields: `latitude` (decimal, 6 decimal places) and `longitude` (decimal, 6 decimal places).
- **Pin Code**: 6-digit Indian postal code — regex `/^\d{6}$/`.
- Display pin codes separately from state/city in UI forms.

```typescript
interface IndianAddress {
  line1: string;         // Flat / Building / Street
  landmark?: string;     // Nearby landmark
  city: string;
  state: string;         // Full state name (e.g., "Maharashtra")
  pinCode: string;       // 6-digit PIN
  latitude?: number;     // e.g., 19.076090
  longitude?: number;    // e.g., 72.877426
}
```

---

## Vehicle Numbers
- **Format**: Indian Motor Vehicle Act standard — `<State Code> <District Code> <Series> <Number>`
- **Example**: `MH 12 AB 1234`
- **Regex**: `/^[A-Z]{2}\s\d{2}\s[A-Z]{1,2}\s\d{4}$/`
- Always store in uppercase with spaces as separator.
- Validate on input; reject non-conforming formats.

```typescript
const VEHICLE_NUMBER_REGEX = /^[A-Z]{2}\s\d{2}\s[A-Z]{1,2}\s\d{4}$/;

function validateVehicleNumber(number: string): boolean {
  return VEHICLE_NUMBER_REGEX.test(number.toUpperCase().trim());
}
```

---

## Currency (INR)
- **Symbol**: ₹ (Unicode: `\u20B9`)
- **Code**: `INR`
- **Comma format**: Indian system — `1,00,000` (lakh) not `100,000`.
- Use `Intl.NumberFormat` with `en-IN` locale for all display formatting.

```typescript
function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
  // Output: ₹1,00,000.00
}
```

- Never use `en-US` locale for Indian currency display.
- Store raw amounts as integers in paise (1 INR = 100 paise) to avoid floating-point errors.
