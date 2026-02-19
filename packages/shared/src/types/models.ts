import {
  Role,
  AgencyStatus,
  TransactionType,
  RequestStatus,
  RequestType,
  ActivityType,
  OfferGroupStatus,
  PriceCalcOption,
  DealType,
  EmailStatus,
} from './enums';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  avatar?: string | null;
  agencyId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: number;
  name: string;
  county: string;
}

export interface Building {
  id: number;
  name: string;
  propertyCode?: string | null;
  totalSqm?: number | null;
  availableSqm?: number | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  transactionType: TransactionType;
  clearHeight?: number | null;
  floorLoading?: number | null;
  sprinkler?: boolean;
  heating?: string | null;
  powerSupply?: string | null;
  buildingStructure?: string | null;
  lighting?: string | null;
  gridStructure?: string | null;
  gridFormat?: string | null;
  hydrantSystem?: boolean;
  isuAuthorization?: boolean;
  temperature?: string | null;
  expandingPossibilities?: string | null;
  buildToSuit?: boolean;
  polygonPoints?: Array<{ lat: number; lng: number }> | null;
  serviceCharge?: number | null;
  availableFrom?: string | null;
  description?: string | null;
  locationId?: number | null;
  location?: Location | null;
  userId: number;
  user?: User;
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  minContractYears?: number | null;
  osmId?: number | null;
  developerId?: number | null;
  developer?: Company;
  units?: Unit[];
  createdAt: string;
  updatedAt: string;
}

export interface UnitSpace {
  sqm: number;
  rentPrice: number;
}

export interface Unit {
  id: number;
  name: string;
  transactionType?: TransactionType;
  warehouseSpace?: UnitSpace | null;
  officeSpace?: UnitSpace | null;
  sanitarySpace?: UnitSpace | null;
  othersSpace?: UnitSpace | null;
  usefulHeight?: number | null;
  hasOffice?: boolean;
  officeSqm?: number | null;
  hasSanitary?: boolean;
  sanitarySqm?: number | null;
  warehousePrice?: number | null;
  officePrice?: number | null;
  maintenancePrice?: number | null;
  floorPlan?: string | null;
  photos?: string[] | null;
  docks?: number | null;
  driveins?: number | null;
  crossDock?: boolean;
  images?: string[];
  // Technical specs
  temperature?: string | null;
  sprinkler?: boolean;
  hydrantSystem?: boolean;
  isuAuthorization?: boolean;
  heating?: string | null;
  buildingStructure?: string | null;
  gridStructure?: string | null;
  gridFormat?: string | null;
  floorLoading?: number | null;
  lighting?: string | null;
  // Commercial specs
  serviceCharge?: number | null;
  availableFrom?: string | null;
  contractLength?: string | null;
  expandingPossibilities?: string | null;
  salePrice?: number | null;
  salePriceVatIncluded?: boolean;
  buildingId: number;
  building?: Building;
  userId: number;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  name: string;
  vatNumber?: string | null;
  jNumber?: string | null;
  iban?: string | null;
  address?: string | null;
  logo?: string | null;
  openDeals: number;
  closedDeals: number;
  userId: number;
  user?: User;
  persons?: Person[];
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: number;
  name: string;
  jobTitle?: string | null;
  emails: string[];
  phones: string[];
  source?: string | null;
  openDeals: number;
  closedDeals: number;
  companyId?: number | null;
  company?: Company;
  labelId?: number | null;
  label?: Label;
  userId: number;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface PropertyRequest {
  id: number;
  name: string;
  numberOfSqm?: number | null;
  minHeight?: number | null;
  estimatedFeeValue?: number | null;
  contractPeriod?: number | null;
  breakOptionAfter?: number | null;
  startDate?: string | null;
  requestType?: RequestType | null;
  status: RequestStatus;
  dealType: DealType;
  lostReason?: string | null;
  holdReason?: string | null;
  agreedPrice?: number | null;
  actualFee?: number | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  signedDate?: string | null;
  wonBuildingId?: number | null;
  wonUnitIds?: number[] | null;
  closureNotes?: string | null;
  notes?: string | null;
  closedAt?: string | null;
  searchLat?: number | null;
  searchLng?: number | null;
  searchRadius?: number | null;
  companyId?: number | null;
  company?: Company;
  personId?: number | null;
  person?: Person;
  userId: number;
  user?: User;
  locations?: Location[];
  offers?: Offer[];
  tenants?: Tenant[];
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: number;
  offerCode: string;
  downloadable: boolean;
  sentAt?: string | null;
  emailStatus?: EmailStatus;
  emailId?: string | null;
  feedback?: string | null;
  feedbackNotes?: string | null;
  requestedSqm?: number | null;
  requestedType?: string | null;
  requestedStartDate?: string | null;
  requestedLocations?: Array<{ id: number; name: string }> | null;
  requestId: number;
  request?: PropertyRequest;
  userId: number;
  user?: User;
  companyId?: number | null;
  company?: Company;
  personId?: number | null;
  person?: Person;
  offerGroups?: OfferGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface OfferGroup {
  id: number;
  name: string;
  status: OfferGroupStatus;
  leaseTermMonths?: number | null;
  incentiveMonths?: number | null;
  earlyAccessMonths?: number | null;
  startDate?: string | null;
  priceCalcOption?: PriceCalcOption | null;
  warehouseSqm?: number | null;
  warehouseRentPrice?: number | null;
  officeSqm?: number | null;
  officeRentPrice?: number | null;
  sanitarySqm?: number | null;
  sanitaryRentPrice?: number | null;
  othersSqm?: number | null;
  othersRentPrice?: number | null;
  serviceCharge?: number | null;
  serviceChargeType?: string | null;
  docks?: number | null;
  driveins?: number | null;
  crossDock?: boolean;
  images?: string[];
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  polygonPoints?: Array<{ lat: number; lng: number }> | null;
  description?: string | null;
  offerId: number;
  offer?: Offer;
  buildingId: number;
  building?: Building;
  groupItems?: GroupItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupItem {
  id: number;
  unitName: string;
  warehouseSqm?: number | null;
  offerGroupId: number;
  offerGroup?: OfferGroup;
  unitId: number;
  unit?: Unit;
}

export interface Activity {
  id: number;
  title: string;
  date: string;
  time?: string | null;
  duration?: number | null;
  done: boolean;
  isSystem?: boolean;
  notes?: string | null;
  activityType: ActivityType;
  userId: number;
  user?: User;
  companyId?: number | null;
  company?: Company;
  requestId?: number | null;
  request?: PropertyRequest;
  persons?: Person[];
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: number;
  startDate: string;
  endDate: string;
  unitId: number;
  unit?: Unit;
  companyId: number;
  company?: Company;
  dealId?: number | null;
  deal?: PropertyRequest;
}

export interface Agency {
  id: number;
  name: string;
  logo?: string | null;
  coverImage?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  primaryColor: string;
  status: AgencyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: number;
  email: string;
  token: string;
  role: Role;
  firstName: string;
  lastName: string;
  agencyId: number;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
}
