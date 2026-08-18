import { api, storeAuth } from './client';
import { isAdminRole, type AdminUser } from '../lib/types';

export async function login(identifier: string, password: string) {
  const value = identifier.trim();
  const { data } = await api.post('/api/users/login', {
    identifier: value,
    email: value,
    password,
  });
  const role = Number(data.role ?? data.user?.role ?? 0);
  if (!isAdminRole(role)) {
    throw new Error('Admin access only. This account is not an admin.');
  }
  const token = data.accessToken || data.token;
  storeAuth(token, data.user);
  return data.user as AdminUser;
}

export async function fetchMe() {
  const { data } = await api.get('/api/users/me');
  return data.user as AdminUser;
}
