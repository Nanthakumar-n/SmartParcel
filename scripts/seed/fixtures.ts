/**
 * Authentic Indian logistics domain fixtures for SmartParcel Seeder
 */

export interface HubFixture {
  hub_code: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  pin_code: string;
  latitude: number;
  longitude: number;
  contact_phone: string;
}

export const HUB_FIXTURES: HubFixture[] = [
  {
    hub_code: 'MUM',
    name: 'Mumbai Central Hub',
    address_line1: 'Plot 42, Transport Nagar, Bhiwandi',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400001',
    latitude: 19.2968,
    longitude: 73.0631,
    contact_phone: '+919876543210',
  },
  {
    hub_code: 'DEL',
    name: 'Delhi North Hub',
    address_line1: 'Block C-12, Sanjay Gandhi Transport Nagar',
    city: 'Delhi',
    state: 'Delhi',
    pin_code: '110042',
    latitude: 28.7521,
    longitude: 77.1438,
    contact_phone: '+919876543211',
  },
  {
    hub_code: 'BLR',
    name: 'Bangalore Electronic City Hub',
    address_line1: 'Gate 4, Hosur Road, Electronic City Phase 1',
    city: 'Bangalore',
    state: 'Karnataka',
    pin_code: '560100',
    latitude: 12.8452,
    longitude: 77.6602,
    contact_phone: '+919876543212',
  },
];

export interface DriverFixture {
  full_name: string;
  phone: string;
  license_number: string;
}

export const DRIVER_FIXTURES: DriverFixture[] = [
  {
    full_name: 'Ramesh Kumar',
    phone: '+919876543220',
    license_number: 'DL-1420110012345',
  },
  {
    full_name: 'Suresh Singh',
    phone: '+919876543221',
    license_number: 'MH-0120150098765',
  },
  {
    full_name: 'Vijay Verma',
    phone: '+919876543222',
    license_number: 'KA-0420180054321',
  },
  {
    full_name: 'Gurpreet Singh',
    phone: '+919876543223',
    license_number: 'PB-1020160087654',
  },
];

export interface VehicleFixture {
  registration_number: string;
  vehicle_type: 'TRUCK' | 'MINI_TRUCK' | 'TEMPO';
  capacity_tonnes: number;
  initialHubCode: string;
  defaultDriverName: string;
}

export const VEHICLE_FIXTURES: VehicleFixture[] = [
  {
    registration_number: 'MH 12 AB 1234',
    vehicle_type: 'TRUCK',
    capacity_tonnes: 10.5,
    initialHubCode: 'MUM',
    defaultDriverName: 'Ramesh Kumar',
  },
  {
    registration_number: 'DL 01 CD 5678',
    vehicle_type: 'TEMPO',
    capacity_tonnes: 2.5,
    initialHubCode: 'DEL',
    defaultDriverName: 'Suresh Singh',
  },
  {
    registration_number: 'KA 04 EF 9012',
    vehicle_type: 'MINI_TRUCK',
    capacity_tonnes: 5.0,
    initialHubCode: 'BLR',
    defaultDriverName: 'Vijay Verma',
  },
  {
    registration_number: 'MH 04 GH 3456',
    vehicle_type: 'TRUCK',
    capacity_tonnes: 16.0,
    initialHubCode: 'MUM',
    defaultDriverName: 'Gurpreet Singh',
  },
];

export interface CompanyProfile {
  name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  gstin: string;
}

export const CONSIGNOR_PROFILES: CompanyProfile[] = [
  {
    name: 'Tata Steel Processing & Distribution Ltd',
    phone: '+919820011223',
    address_line1: 'Plot 18, MIDC Industrial Area',
    address_line2: 'Taloja Phase 2',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '410208',
    gstin: '27AAACT2727Q1ZT',
  },
  {
    name: 'Godrej Consumer Products Ltd',
    phone: '+919830022334',
    address_line1: 'Eastern Express Highway',
    address_line2: 'Vikhroli East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '400079',
    gstin: '27AAACG0561F1Z8',
  },
  {
    name: 'Havells India Electricals Ltd',
    phone: '+919811033445',
    address_line1: 'QRG Towers, 2D Industrial Area',
    address_line2: 'Sector 18',
    city: 'Delhi',
    state: 'Delhi',
    pin_code: '110015',
    gstin: '07AAACH1234D1Z2',
  },
  {
    name: 'Raymond Textiles Bhiwandi Works',
    phone: '+919821044556',
    address_line1: 'Anjur Phata, Agra Road',
    address_line2: 'Bhiwandi Textile Zone',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '421302',
    gstin: '27AAACR1234A1ZX',
  },
  {
    name: 'Infosys BPM Logistics Depot',
    phone: '+919845055667',
    address_line1: 'Electronics City Hosur Main Rd',
    address_line2: 'Phase 1',
    city: 'Bangalore',
    state: 'Karnataka',
    pin_code: '560100',
    gstin: '29AAACI1234E1ZW',
  },
];

export const CONSIGNEE_PROFILES: CompanyProfile[] = [
  {
    name: 'Reliance Retail Distribution Centre',
    phone: '+919810099887',
    address_line1: 'Shed 5, Khasra 145, GT Karnal Road',
    address_line2: 'Kundli Logistics Hub',
    city: 'Delhi',
    state: 'Delhi',
    pin_code: '110036',
    gstin: '07AAACR7654B1ZF',
  },
  {
    name: 'Bajaj Auto Parts Regional Depot',
    phone: '+919844088776',
    address_line1: 'Peenya Industrial Area Stage 3',
    address_line2: 'Near Jalahalli Cross',
    city: 'Bangalore',
    state: 'Karnataka',
    pin_code: '560058',
    gstin: '29AAACB9876C1ZQ',
  },
  {
    name: 'Kalyani Forge Components Warehouse',
    phone: '+919822077665',
    address_line1: 'Transport Nagar Depot 8',
    address_line2: 'Nigdi Pradhikaran',
    city: 'Mumbai',
    state: 'Maharashtra',
    pin_code: '411044',
    gstin: '27AAACK5555M1Z1',
  },
  {
    name: 'Apollo Pharmacy Central Distribution',
    phone: '+919841066554',
    address_line1: 'Okhla Industrial Area Phase II',
    address_line2: 'Block F',
    city: 'Delhi',
    state: 'Delhi',
    pin_code: '110020',
    gstin: '07AAACA4321K1ZM',
  },
  {
    name: 'Titan Company Precision Parts Hub',
    phone: '+919880055443',
    address_line1: 'SIPCOT Industrial Complex',
    address_line2: 'Hosur Bangalore Border',
    city: 'Bangalore',
    state: 'Karnataka',
    pin_code: '560099',
    gstin: '29AAACT9087P1ZB',
  },
];

export interface CargoItemTemplate {
  goods_description: string;
  num_packages: number;
  weight_kg: number;
  quantity: number;
  baseFreightRupees: number; // will be converted to paise (* 100)
}

export const CARGO_TEMPLATES: CargoItemTemplate[] = [
  {
    goods_description: 'Precision CNC Machined Auto Engine Components',
    num_packages: 12,
    weight_kg: 850,
    quantity: 12,
    baseFreightRupees: 18500,
  },
  {
    goods_description: 'Pure Cotton Shirting & Suiting Fabric Bales',
    num_packages: 25,
    weight_kg: 1400,
    quantity: 25,
    baseFreightRupees: 26000,
  },
  {
    goods_description: 'Industrial LED Lighting Fixtures & Drivers',
    num_packages: 40,
    weight_kg: 620,
    quantity: 40,
    baseFreightRupees: 14500,
  },
  {
    goods_description: 'Packaged Pharmaceutical Syrups & Tablets',
    num_packages: 30,
    weight_kg: 500,
    quantity: 30,
    baseFreightRupees: 16000,
  },
  {
    goods_description: 'High Tensile Structural Fasteners & Bolts',
    num_packages: 50,
    weight_kg: 2200,
    quantity: 50,
    baseFreightRupees: 34000,
  },
  {
    goods_description: 'Consumer Electronics & Smart Meter Kits',
    num_packages: 18,
    weight_kg: 380,
    quantity: 18,
    baseFreightRupees: 12000,
  },
];
