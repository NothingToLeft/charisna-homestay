import {
  Building2,
  CheckSquare2,
  CircleDollarSign,
  Cloud,
  CloudOff,
  DoorOpen,
  LayoutDashboard,
  RefreshCw,
  Settings,
  Users
} from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useCloudState } from '../hooks/useCloudState';
import { useLastSync } from '../hooks/useLastSync';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { synchronizeNow } from '../services/syncService';
import { formatDate } from '../core/format';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/properties', label: 'Properti', icon: Building2 },
  { to: '/rooms', label: 'Kamar', icon: DoorOpen },
  { to: '/tenants', label: 'Penghuni', icon: Users },
  { to: '/finance', label: 'Keuangan', icon: CircleDollarSign },
  { to: '/tasks', label: 'Tugas', icon: CheckSquare2 },
  { to: '/settings', label: 'Pengaturan', icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const online = useNetworkStatus();
  const cloud = useCloudState();
  const lastSync = useLastSync();
  const cloudReady = Boolean(cloud.user);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark"><Building2 size={23} /></span>
          <span><strong>Management</strong><small>Offline Suite</small></span>
        </div>
        <nav className="navigation" aria-label="Navigasi utama">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'navigation__item navigation__item--active' : 'navigation__item'}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className={`connection-card ${online ? 'connection-card--online' : ''}`}>
            {online ? <Cloud size={18} /> : <CloudOff size={18} />}
            <div>
              <strong>{online ? 'Internet aktif' : 'Mode offline'}</strong>
              <small>{cloudReady ? `Cloud: ${cloud.user?.email}` : 'Data tersimpan lokal'}</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar__status">
            <span className={`status-dot ${online ? 'status-dot--online' : ''}`} />
            <span>{online ? 'Online' : 'Offline'}</span>
            <span className="topbar__divider" />
            <span>{cloudReady ? 'Cloud terhubung' : 'Cloud belum masuk'}</span>
          </div>
          <div className="topbar__actions">
            {lastSync && <span className="last-sync">Sinkron terakhir {formatDate(lastSync)}</span>}
            <button
              className="sync-button"
              onClick={() => void synchronizeNow()}
              disabled={!online || !cloudReady || cloud.syncState === 'syncing'}
              title={cloud.message || 'Sinkronkan sekarang'}
            >
              <RefreshCw size={18} className={cloud.syncState === 'syncing' ? 'spin' : ''} />
              <span>{cloud.syncState === 'syncing' ? 'Menyinkronkan' : 'Sinkronkan'}</span>
            </button>
          </div>
        </header>

        <main className="content">{children}</main>

        <nav className="mobile-navigation" aria-label="Navigasi mobile">
          {navigation.slice(0, 6).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'mobile-navigation__item mobile-navigation__item--active' : 'mobile-navigation__item'}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'mobile-navigation__item mobile-navigation__item--active' : 'mobile-navigation__item'}>
            <Settings size={20} /><span>Atur</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
