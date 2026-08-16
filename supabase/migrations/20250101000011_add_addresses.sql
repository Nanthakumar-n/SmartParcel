-- Alter booking_requests table to add consignee details and optional addresses
ALTER TABLE public.booking_requests
  ADD COLUMN consignee_name text,
  ADD COLUMN consignee_phone text,
  ADD COLUMN consignor_address_line1 text,
  ADD COLUMN consignor_address_line2 text,
  ADD COLUMN consignor_pin_code text,
  ADD COLUMN consignee_address_line1 text,
  ADD COLUMN consignee_address_line2 text,
  ADD COLUMN consignee_pin_code text;

-- Alter lorry_receipts table to add optional addresses
ALTER TABLE public.lorry_receipts
  ADD COLUMN consignor_address_line1 text,
  ADD COLUMN consignor_address_line2 text,
  ADD COLUMN consignor_pin_code text,
  ADD COLUMN consignee_address_line1 text,
  ADD COLUMN consignee_address_line2 text,
  ADD COLUMN consignee_pin_code text;
