// Traccar API Types

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: 'online' | 'offline' | 'unknown';
  disabled: boolean;
  lastUpdate: string | null;
  positionId: number | null;
  groupId: number | null;
  phone: string | null;
  model: string | null;
  contact: string | null;
  category: string | null;
  attributes: Record<string, any>;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  deviceTime: string;
  fixTime: string;
  serverTime: string;
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address: string | null;
  accuracy: number;
  attributes: Record<string, any>;
}

export interface TraccarDriver {
  id: number;
  name: string;
  uniqueId: string;
  attributes: Record<string, any>;
}

export interface TraccarGeofence {
  id: number;
  name: string;
  description: string;
  area: string; // WKT format
  calendarId: number | null;
  attributes: Record<string, any>;
}

export interface TraccarOrder {
  id: number;
  uniqueId: string;
  description: string;
  fromAddress: string;
  toAddress: string;
  attributes: Record<string, any>;
}

export interface TraccarUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  readonly: boolean;
  administrator: boolean;
  disabled: boolean;
  deviceLimit: number;
  userLimit: number;
  attributes: Record<string, any>;
}

export interface TraccarSession {
  id: number;
  name: string;
  email: string;
  administrator: boolean;
  attributes: Record<string, any>;
}

export interface TraccarEvent {
  id: number;
  type: string;
  eventTime: string;
  deviceId: number;
  positionId: number | null;
  geofenceId: number | null;
  maintenanceId: number | null;
  attributes: Record<string, any>;
}

// API Response types
export interface TraccarApiError {
  error: string;
  message: string;
}
