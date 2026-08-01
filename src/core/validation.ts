import { z } from 'zod';

const optionalText = z.string().trim().max(1000).default('');

export const propertySchema = z.object({
  name: z.string().trim().min(2, 'Nama properti minimal 2 karakter.').max(100),
  address: z.string().trim().min(3, 'Alamat wajib diisi.').max(300),
  city: z.string().trim().min(2, 'Kota wajib diisi.').max(100),
  notes: optionalText
});

export const roomSchema = z.object({
  propertyId: z.string().min(1, 'Pilih properti.'),
  name: z.string().trim().min(1, 'Nama kamar wajib diisi.').max(100),
  monthlyRent: z.coerce.number().min(0, 'Harga sewa tidak boleh negatif.'),
  status: z.enum(['available', 'occupied', 'maintenance']),
  notes: optionalText
});

export const tenantSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama penghuni minimal 2 karakter.').max(120),
  phone: z.string().trim().max(30).default(''),
  email: z.union([z.literal(''), z.string().email('Format email tidak valid.')]),
  roomId: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  emergencyContact: z.string().trim().max(150).default(''),
  notes: optionalText
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().trim().min(2, 'Kategori wajib diisi.').max(100),
  amount: z.coerce.number().positive('Nominal harus lebih dari nol.'),
  date: z.string().min(1, 'Tanggal wajib diisi.'),
  description: z.string().trim().min(2, 'Keterangan wajib diisi.').max(500),
  status: z.enum(['paid', 'pending']),
  tenantId: z.string().default(''),
  roomId: z.string().default('')
});

export const taskSchema = z.object({
  title: z.string().trim().min(2, 'Judul tugas minimal 2 karakter.').max(150),
  dueDate: z.string().default(''),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['open', 'in_progress', 'done']),
  notes: optionalText
});
