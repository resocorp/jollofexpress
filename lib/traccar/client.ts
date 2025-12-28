// Traccar API Client
// Handles communication with Traccar GPS tracking server

import type {
  TraccarDevice,
  TraccarPosition,
  TraccarDriver,
  TraccarGeofence,
  TraccarOrder,
  TraccarSession,
} from './types';

const TRACCAR_URL = process.env.TRACCAR_SERVER_URL || 'http://localhost:8082';
const TRACCAR_EMAIL = process.env.TRACCAR_ADMIN_EMAIL || '';
const TRACCAR_PASSWORD = process.env.TRACCAR_ADMIN_PASSWORD || '';

// Base64 encode credentials for Basic Auth
function getAuthHeader(): string {
  const credentials = Buffer.from(`${TRACCAR_EMAIL}:${TRACCAR_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

// Generic fetch wrapper with auth
async function traccarFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${TRACCAR_URL}/api${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Traccar API error: ${response.status} - ${error}`);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============ SESSION ============
export async function getSession(): Promise<TraccarSession> {
  return traccarFetch<TraccarSession>('/session');
}

// ============ DEVICES ============
export async function getDevices(): Promise<TraccarDevice[]> {
  return traccarFetch<TraccarDevice[]>('/devices');
}

export async function getDevice(id: number): Promise<TraccarDevice> {
  return traccarFetch<TraccarDevice>(`/devices/${id}`);
}

export async function createDevice(device: Partial<TraccarDevice>): Promise<TraccarDevice> {
  return traccarFetch<TraccarDevice>('/devices', {
    method: 'POST',
    body: JSON.stringify(device),
  });
}

export async function updateDevice(id: number, device: Partial<TraccarDevice>): Promise<TraccarDevice> {
  return traccarFetch<TraccarDevice>(`/devices/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...device, id }),
  });
}

export async function deleteDevice(id: number): Promise<void> {
  await traccarFetch<void>(`/devices/${id}`, { method: 'DELETE' });
}

// ============ POSITIONS ============
export async function getPositions(deviceId?: number): Promise<TraccarPosition[]> {
  const params = deviceId ? `?deviceId=${deviceId}` : '';
  return traccarFetch<TraccarPosition[]>(`/positions${params}`);
}

export async function getLatestPosition(deviceId: number): Promise<TraccarPosition | null> {
  const positions = await getPositions(deviceId);
  return positions.length > 0 ? positions[0] : null;
}

// ============ DRIVERS ============
export async function getDrivers(): Promise<TraccarDriver[]> {
  return traccarFetch<TraccarDriver[]>('/drivers');
}

export async function createDriver(driver: Partial<TraccarDriver>): Promise<TraccarDriver> {
  return traccarFetch<TraccarDriver>('/drivers', {
    method: 'POST',
    body: JSON.stringify(driver),
  });
}

export async function updateDriver(id: number, driver: Partial<TraccarDriver>): Promise<TraccarDriver> {
  return traccarFetch<TraccarDriver>(`/drivers/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...driver, id }),
  });
}

export async function deleteDriver(id: number): Promise<void> {
  await traccarFetch<void>(`/drivers/${id}`, { method: 'DELETE' });
}

// ============ GEOFENCES ============
export async function getGeofences(): Promise<TraccarGeofence[]> {
  return traccarFetch<TraccarGeofence[]>('/geofences');
}

export async function createGeofence(geofence: Partial<TraccarGeofence>): Promise<TraccarGeofence> {
  return traccarFetch<TraccarGeofence>('/geofences', {
    method: 'POST',
    body: JSON.stringify(geofence),
  });
}

// Create circular geofence (helper)
export async function createCircularGeofence(
  name: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 100
): Promise<TraccarGeofence> {
  // WKT format for circle
  const area = `CIRCLE (${longitude} ${latitude}, ${radiusMeters})`;
  return createGeofence({ name, area });
}

export async function deleteGeofence(id: number): Promise<void> {
  await traccarFetch<void>(`/geofences/${id}`, { method: 'DELETE' });
}

// ============ ORDERS ============
export async function getOrders(): Promise<TraccarOrder[]> {
  return traccarFetch<TraccarOrder[]>('/orders');
}

export async function createOrder(order: Partial<TraccarOrder>): Promise<TraccarOrder> {
  return traccarFetch<TraccarOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

export async function updateOrder(id: number, order: Partial<TraccarOrder>): Promise<TraccarOrder> {
  return traccarFetch<TraccarOrder>(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...order, id }),
  });
}

export async function deleteOrder(id: number): Promise<void> {
  await traccarFetch<void>(`/orders/${id}`, { method: 'DELETE' });
}

// ============ PERMISSIONS ============
export async function linkDeviceToDriver(deviceId: number, driverId: number): Promise<void> {
  await traccarFetch<void>('/permissions', {
    method: 'POST',
    body: JSON.stringify({ deviceId, driverId }),
  });
}

export async function unlinkDeviceFromDriver(deviceId: number, driverId: number): Promise<void> {
  await traccarFetch<void>('/permissions', {
    method: 'DELETE',
    body: JSON.stringify({ deviceId, driverId }),
  });
}

// ============ UTILITY ============
export async function testConnection(): Promise<boolean> {
  try {
    await getSession();
    return true;
  } catch {
    return false;
  }
}

export function getWebSocketUrl(): string {
  // Convert HTTP URL to WebSocket URL
  const wsUrl = TRACCAR_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${wsUrl}/api/socket`;
}
