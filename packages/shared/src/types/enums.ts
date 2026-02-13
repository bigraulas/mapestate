export enum Role {
  ADMIN = 'ADMIN',
  BROKER = 'BROKER',
}

export enum TransactionType {
  RENT = 'RENT',
  SALE = 'SALE',
}

export enum RequestStatus {
  NEW = 'NEW',
  OFFERING = 'OFFERING',
  TOUR = 'TOUR',
  SHORTLIST = 'SHORTLIST',
  NEGOTIATION = 'NEGOTIATION',
  HOT_SIGNED = 'HOT_SIGNED',
  ON_HOLD = 'ON_HOLD',
  WON = 'WON',
  LOST = 'LOST',
}

export enum RequestType {
  RENT = 'RENT',
  SALE = 'SALE',
}

export enum ActivityType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  TOUR = 'TOUR',
  NOTE = 'NOTE',
  TASK = 'TASK',
}

export enum OfferGroupStatus {
  UNFINISHED = 'UNFINISHED',
  READY = 'READY',
}

export enum PriceCalcOption {
  OPTION_ONE = 'OPTION_ONE',
  OPTION_TWO = 'OPTION_TWO',
}

export const REQUEST_STATUS_ORDER: RequestStatus[] = [
  RequestStatus.NEW,
  RequestStatus.OFFERING,
  RequestStatus.TOUR,
  RequestStatus.SHORTLIST,
  RequestStatus.NEGOTIATION,
  RequestStatus.HOT_SIGNED,
  RequestStatus.ON_HOLD,
  RequestStatus.WON,
  RequestStatus.LOST,
];

export const TERMINAL_STATUSES: RequestStatus[] = [
  RequestStatus.WON,
  RequestStatus.LOST,
];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.NEW]: 'Nou',
  [RequestStatus.OFFERING]: 'Ofertare',
  [RequestStatus.TOUR]: 'Vizionare',
  [RequestStatus.SHORTLIST]: 'Shortlist',
  [RequestStatus.NEGOTIATION]: 'Negociere',
  [RequestStatus.HOT_SIGNED]: 'Hot Signed',
  [RequestStatus.ON_HOLD]: 'În Așteptare',
  [RequestStatus.WON]: 'Câștigat',
  [RequestStatus.LOST]: 'Pierdut',
};

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  [RequestStatus.NEW]: '#6B7280',
  [RequestStatus.OFFERING]: '#3B82F6',
  [RequestStatus.TOUR]: '#8B5CF6',
  [RequestStatus.SHORTLIST]: '#F59E0B',
  [RequestStatus.NEGOTIATION]: '#F97316',
  [RequestStatus.HOT_SIGNED]: '#EF4444',
  [RequestStatus.ON_HOLD]: '#9CA3AF',
  [RequestStatus.WON]: '#10B981',
  [RequestStatus.LOST]: '#DC2626',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.CALL]: 'Apel',
  [ActivityType.EMAIL]: 'Email',
  [ActivityType.MEETING]: 'Întâlnire',
  [ActivityType.TOUR]: 'Vizionare',
  [ActivityType.NOTE]: 'Notă',
  [ActivityType.TASK]: 'Sarcină',
};
