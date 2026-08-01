import type { BaseEntity, RoomEntity, TenantEntity } from '../core/types';
import { db } from '../db/database';
import { saveEntity, softDeleteEntity } from '../db/repository';

const refreshRoomOccupancy = async (roomId: string): Promise<void> => {
  if (!roomId) return;
  const room = await db.rooms.get(roomId);
  if (!room || room.deletedAt || room.status === 'maintenance') return;
  const activeTenants = await db.tenants.where('roomId').equals(roomId).filter((tenant) => !tenant.deletedAt).count();
  const nextStatus = activeTenants > 0 ? 'occupied' : 'available';
  if (room.status !== nextStatus) {
    await saveEntity<RoomEntity>('rooms', { ...room, status: nextStatus });
  }
};

export const saveTenantWithRoomConsistency = async (
  data: Record<string, unknown>,
  editing: TenantEntity | null
): Promise<void> => {
  const previousRoomId = editing?.roomId ?? '';
  const metadata: Partial<BaseEntity> = editing
    ? {
        id: editing.id,
        createdAt: editing.createdAt,
        version: editing.version,
        deviceId: editing.deviceId
      }
    : {};
  const tenant = await saveEntity<TenantEntity>('tenants', {
    ...(data as Omit<TenantEntity, keyof BaseEntity>),
    ...metadata
  });
  await refreshRoomOccupancy(tenant.roomId);
  if (previousRoomId && previousRoomId !== tenant.roomId) await refreshRoomOccupancy(previousRoomId);
};

export const deleteTenantWithRoomConsistency = async (tenant: TenantEntity): Promise<void> => {
  await softDeleteEntity('tenants', tenant.id);
  await refreshRoomOccupancy(tenant.roomId);
};
