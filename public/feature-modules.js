/**
 * public/feature-modules.js
 * Feature Package Implementation for CHARISNA KOST
 * 1. Global Quick Search / Filter
 * 2. Simple Offline Indicator
 * 3. Central Audit Log
 * 4. Online Attachments / Images (Drive Upload)
 * 5. Export / Report (CSV, Print, Drive Sync)
 * 6. Centralized WhatsApp Templates
 * 7. Room Availability Calendar / Timeline UI
 * 8. Dark Mode / Theme Choice
 * 9. Due-Date Reminders / Badges
 * 10. Inventory & Room Asset Maintenance
 */

(function (window) {
    'use strict';

    // Helper: Safe HTML escaping
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Mask sensitive NIK
    function maskNik(nik) {
        if (!nik || typeof nik !== 'string') return '-';
        if (nik.length <= 8) return nik;
        return nik.slice(0, 4) + '****' + nik.slice(-4);
    }

    function initGeneratedActionBindings() {
        document.addEventListener('click', function (event) {
            const control = event.target.closest('[data-feature-action]');
            if (!control) return;
            const action = control.dataset.featureAction;
            if (action === 'close-search') closeGlobalSearch();
            if (action === 'navigate') navigateToItem(control.dataset.tab, control.dataset.id);
            if (action === 'undo') undoAuditLog(control.dataset.id);
            if (action === 'reminder') {
                const bill = (window.charisnaData?.snapshot()?.bills || []).find(item => item.id === control.dataset.id);
                if (bill) sendWaMessage(bill.phone, 'REMINDER', {
                    tenantName: bill.tenantName,
                    roomNumber: bill.roomNumber,
                    period: bill.period,
                    amount: Number(bill.amount || 0),
                    dueDate: bill.dueDate
                });
            }
        });
        document.addEventListener('input', function (event) {
            if (event.target.matches('[data-feature-action="search-input"]')) renderGlobalSearchResults(event.target.value);
        });
        document.addEventListener('change', function (event) {
            if (event.target.matches('[data-feature-action="timeline-month"]')) renderRoomTimeline(event.target.value);
        });
    }

    // Helper: Sanitize objects before writing to audit log
    function sanitizeForAudit(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const clone = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
            if (['password', 'token', 'idToken', 'secret', 'pin'].includes(key)) continue;
            if (key === 'nik' && typeof value === 'string') {
                clone[key] = maskNik(value);
            } else if ((key === 'ktpImage' || key === 'proofImage' || key === 'photo') && typeof value === 'string' && value.startsWith('data:')) {
                clone[key] = '[BASE64_IMAGE_OMITTED]';
            } else if ((key === 'ktpImage' || key === 'proofImage' || key === 'photo') && value && typeof value === 'object') {
                clone[key] = { fileId: value.fileId || '', url: value.url || '', path: value.path || '', name: value.name || '' };
            } else if (typeof value === 'object' && value !== null) {
                clone[key] = sanitizeForAudit(value);
            } else {
                clone[key] = value;
            }
        }
        return clone;
    }

    const undoSnapshots = new Map();
    const MAX_UNDO_SNAPSHOTS = 500;

    function privateUndoSnapshot(value) {
        if (!value || typeof value !== 'object') return null;
        try { return structuredClone(value); } catch { return null; }
    }

    function currentEntityRevision(value) {
        try { return JSON.stringify(value); } catch { return ''; }
    }

        // ==================== 1. GLOBAL QUICK SEARCH ====================
    let globalSearchModalEl = null;

    function initGlobalSearch() {
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                openGlobalSearch();
            } else if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
                e.preventDefault();
                openGlobalSearch();
            } else if (e.key === 'Escape' && globalSearchModalEl && !globalSearchModalEl.hidden) {
                closeGlobalSearch();
            }
        });
    }

    function openGlobalSearch() {
        if (!globalSearchModalEl) {
            createGlobalSearchModal();
        }
        globalSearchModalEl.hidden = false;
        const input = document.getElementById('globalSearchInput');
        if (input) {
            input.value = '';
            renderGlobalSearchResults('');
            setTimeout(() => { input.focus(); }, 0);
        }
    }

    function closeGlobalSearch() {
        if (globalSearchModalEl) {
            globalSearchModalEl.hidden = true;
        }
    }

    function createGlobalSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'globalSearchModal';
        modal.className = 'fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh]">
                <div class="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-lg"></i>
                    <input id="globalSearchInput" data-feature-action="search-input" type="text" placeholder="Cari kamar, penghuni, invoice, pengeluaran, inventaris... (Ctrl+K)"
                    class="w-full bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none">
                    <button data-feature-action="close-search" class="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg">ESC</button>
                </div>
                <div id="globalSearchResults" class="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
                    <p class="text-slate-400 text-center py-6">Ketik minimal 1 karakter untuk mencari di seluruh sistem.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        globalSearchModalEl = modal;
    }

    function renderGlobalSearchResults(query) {
        const resultsBox = document.getElementById('globalSearchResults');
        if (!resultsBox) return;
        const q = String(query || '').trim().toLowerCase();
        if (!q) {
            resultsBox.innerHTML = '<p class="text-slate-400 text-center py-6">Ketik minimal 1 karakter untuk mencari di seluruh sistem.</p>';
            return;
        }

        const data = window.charisnaData?.snapshot() || window.getCharisnaKostDataForSuperApp?.() || {};
        const rooms = (data.rooms || []).filter(r => (r.number + ' ' + r.type + ' ' + (r.facilities || '') + ' ' + r.status).toLowerCase().includes(q));
        const tenants = (data.tenants || []).filter(t => (t.name + ' ' + (t.nik || '') + ' ' + (t.phone || '') + ' ' + t.roomNumber + ' ' + (t.vehicle || '')).toLowerCase().includes(q));
        const bills = (data.bills || []).filter(b => (b.id + ' ' + b.tenantName + ' ' + b.roomNumber + ' ' + b.period + ' ' + b.status).toLowerCase().includes(q));
        const expenses = (data.expenses || []).filter(x => (x.title + ' ' + x.category + ' ' + x.date).toLowerCase().includes(q));
        const inventaris = (data.inventaris || []).filter(i => (i.item + ' ' + i.category + ' ' + i.roomRef + ' ' + (i.notes || '')).toLowerCase().includes(q));

        let html = '';
        let totalCount = rooms.length + tenants.length + bills.length + expenses.length + inventaris.length;

        if (totalCount === 0) {
            resultsBox.innerHTML = `<p class="text-slate-400 text-center py-6">Tidak ada hasil untuk "<b>${escapeHtml(q)}</b>".</p>`;
            return;
        }

        if (rooms.length > 0) {
            html += `<div class="space-y-1"><h4 class="font-bold uppercase text-[10px] tracking-wider text-slate-400">Unit Kamar (${rooms.length})</h4><div class="space-y-1">`;
            rooms.forEach(r => {
                html += `<div data-feature-action="navigate" data-tab="kamar" data-id="${escapeHtml(r.number)}" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer flex items-center justify-between transition">
                    <div>
                        <span class="font-bold text-slate-800 dark:text-slate-200">Unit ${escapeHtml(r.number)}</span>
                        <span class="text-[10px] text-slate-500 ml-2">${escapeHtml(r.type)} - Rp ${Number(r.price || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'TERISI' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}">${escapeHtml(r.status)}</span>
                </div>`;
            });
            html += `</div></div>`;
        }

        if (tenants.length > 0) {
            html += `<div class="space-y-1"><h4 class="font-bold uppercase text-[10px] tracking-wider text-slate-400">Penghuni (${tenants.length})</h4><div class="space-y-1">`;
            tenants.forEach(t => {
                html += `<div data-feature-action="navigate" data-tab="penghuni" data-id="${escapeHtml(t.id)}" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer flex items-center justify-between transition">
                    <div>
                        <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHtml(t.name)}</span>
                        <span class="text-[10px] text-slate-500 ml-2">Unit ${escapeHtml(t.roomNumber)} • NIK: ${escapeHtml(maskNik(t.nik))}</span>
                    </div>
                    <span class="text-[10px] font-semibold text-emerald-600"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(t.phone)}</span>
                </div>`;
            });
            html += `</div></div>`;
        }

        if (bills.length > 0) {
            html += `<div class="space-y-1"><h4 class="font-bold uppercase text-[10px] tracking-wider text-slate-400">Tagihan & Kwitansi (${bills.length})</h4><div class="space-y-1">`;
            bills.forEach(b => {
                html += `<div data-feature-action="navigate" data-tab="tagihan" data-id="${escapeHtml(b.id)}" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer flex items-center justify-between transition">
                    <div>
                        <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHtml(b.id)} - ${escapeHtml(b.tenantName)}</span>
                        <span class="text-[10px] text-slate-500 ml-2">Unit ${escapeHtml(b.roomNumber)} • ${escapeHtml(b.period)}</span>
                    </div>
                    <span class="font-bold text-rose-600">Rp ${Number(b.amount || 0).toLocaleString('id-ID')}</span>
                </div>`;
            });
            html += `</div></div>`;
        }

        if (expenses.length > 0) {
            html += `<div class="space-y-1"><h4 class="font-bold uppercase text-[10px] tracking-wider text-slate-400">Pengeluaran (${expenses.length})</h4><div class="space-y-1">`;
            expenses.forEach(x => {
                html += `<div data-feature-action="navigate" data-tab="pengeluaran" data-id="${escapeHtml(x.id)}" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer flex items-center justify-between transition">
                    <div>
                        <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHtml(x.title)}</span>
                        <span class="text-[10px] text-slate-500 ml-2">${escapeHtml(x.category)} • ${escapeHtml(x.date)}</span>
                    </div>
                    <span class="font-bold text-rose-600">Rp ${Number(x.amount || 0).toLocaleString('id-ID')}</span>
                </div>`;
            });
            html += `</div></div>`;
        }

        if (inventaris.length > 0) {
            html += `<div class="space-y-1"><h4 class="font-bold uppercase text-[10px] tracking-wider text-slate-400">Inventaris (${inventaris.length})</h4><div class="space-y-1">`;
            inventaris.forEach(i => {
                html += `<div data-feature-action="navigate" data-tab="operasional" data-id="${escapeHtml(i.id)}" class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer flex items-center justify-between transition">
                    <div>
                        <span class="font-bold text-slate-800 dark:text-slate-200">${escapeHtml(i.item)}</span>
                        <span class="text-[10px] text-slate-500 ml-2">${escapeHtml(i.roomRef)} • ${escapeHtml(i.category)}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${i.condition === 'Baik' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${escapeHtml(i.condition || 'Baik')}</span>
                </div>`;
            });
            html += `</div></div>`;
        }

        resultsBox.innerHTML = html;
    }

    function navigateToItem(tabName, itemId) {
        closeGlobalSearch();
        if (typeof window.switchTab === 'function') {
            window.switchTab(tabName);
        }
        // Specific tab search highlight
        setTimeout(function () {
            if (tabName === 'kamar') {
                const input = document.getElementById('searchRoomInput');
                if (input) { input.value = itemId; input.dispatchEvent(new Event('input')); }
            } else if (tabName === 'penghuni') {
                const input = document.getElementById('searchTenantInput');
                if (input) { input.value = itemId; input.dispatchEvent(new Event('input')); }
            } else if (tabName === 'tagihan') {
                const input = document.getElementById('searchBillInput');
                if (input) { input.value = itemId; input.dispatchEvent(new Event('input')); }
            }
        }, 150);
    }

    // ==================== 2. SIMPLE OFFLINE INDICATOR ====================
    function initNetworkStatus() {
        window.addEventListener('online', updateNetworkBadge);
        window.addEventListener('offline', updateNetworkBadge);
        updateNetworkBadge();
    }

    function updateNetworkBadge() {
        const isOnline = navigator.onLine;
        const badge = document.getElementById('network-online-badge');
        if (!badge) return;
        if (isOnline) {
            badge.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200';
            badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online';
            badge.title = 'Koneksi internet aktif';
        } else {
            badge.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200';
            badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Offline (Lokal)';
            badge.title = 'Perangkat offline — data lokal tetap dapat diedit, namun unggahan gambar/Drive ditangguhkan.';
        }
    }

    function checkOnlineOrNotify(actionName) {
        if (!navigator.onLine) {
            if (typeof window.showToast === 'function') {
                window.showToast(`Koneksi offline. ${actionName || 'Tindakan ini'} memerlukan koneksi internet.`, 'warning');
            } else {
                alert(`Koneksi offline. ${actionName || 'Tindakan ini'} memerlukan koneksi internet.`);
            }
            return false;
        }
        return true;
    }

    // ==================== 3. CENTRAL AUDIT LOG ====================
    function recordAuditLog(params = {}) {
        const data = window.charisnaData?.snapshot() || window.getCharisnaKostDataForSuperApp?.();
        if (!data) return;
        if (!Array.isArray(data.auditLogs)) data.auditLogs = [];

        const userLabel = window.CHARISNA_USER_EMAIL || window.CHARISNA_CURRENT_USER?.email || 'Owner/Staff';
        const logEntry = {
            id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            timestamp: new Date().toISOString(),
            user: userLabel,
            role: window.CHARISNA_ROLE || 'OWNER',
            action: params.action || 'UBAH',
            entity: params.entity || 'Data',
            entityId: String(params.entityId || ''),
            summary: params.summary || '',
            before: params.before ? sanitizeForAudit(params.before) : null,
            after: params.after ? sanitizeForAudit(params.after) : null
        };

        const undoSnapshot = params.before ? privateUndoSnapshot(params.before) : null;
        if (undoSnapshot) {
            undoSnapshots.set(logEntry.id, {
                value: undoSnapshot,
                revision: currentEntityRevision(params.after || null)
            });
            while (undoSnapshots.size > MAX_UNDO_SNAPSHOTS) undoSnapshots.delete(undoSnapshots.keys().next().value);
        }
        data.auditLogs.unshift(logEntry);
        if (data.auditLogs.length > 500) data.auditLogs = data.auditLogs.slice(0, 500);

        if (typeof window.charisnaData?.hydrate === 'function') {
            window.charisnaData.hydrate(data);
        }
        if (typeof window.saveData === 'function') {
            window.saveData();
        }
    }

    function renderAuditLogs() {
        const container = document.getElementById('auditLogsTableBody');
        if (!container) return;

        const data = window.charisnaData?.snapshot() || {};
        const logs = data.auditLogs || [];
        const entityFilter = document.getElementById('auditEntityFilter')?.value || 'ALL';
        const searchInput = document.getElementById('auditSearchInput')?.value?.toLowerCase() || '';

        const filtered = logs.filter(l => {
            if (entityFilter !== 'ALL' && l.entity !== entityFilter) return false;
            if (searchInput && !(l.summary + ' ' + l.user + ' ' + l.action + ' ' + l.entityId).toLowerCase().includes(searchInput)) return false;
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400 text-xs">Belum ada riwayat audit log.</td></tr>';
            return;
        }

        let html = '';
        filtered.slice(0, 100).forEach(l => {
            const timeStr = new Date(l.timestamp).toLocaleString('id-ID');
            const canUndo = Boolean(undoSnapshots.has(l.id) && (l.action === 'UBAH' || l.action === 'HAPUS'));

            let actionBadge = 'bg-blue-100 text-blue-700';
            if (l.action === 'TAMBAH') actionBadge = 'bg-emerald-100 text-emerald-700';
            if (l.action === 'HAPUS') actionBadge = 'bg-rose-100 text-rose-700';
            if (l.action === 'UNGGAH_DOKUMEN') actionBadge = 'bg-purple-100 text-purple-700';

            html += `<tr class="border-b border-slate-100 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/40">
                <td class="px-4 py-3 font-mono text-[10px] text-slate-400">${escapeHtml(timeStr)}</td>
                <td class="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">${escapeHtml(l.user)} <span class="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-600">${escapeHtml(l.role)}</span></td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${actionBadge}">${escapeHtml(l.action)}</span></td>
                <td class="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">${escapeHtml(l.entity)} <span class="text-[10px] text-slate-400 font-mono">(${escapeHtml(l.entityId)})</span></td>
                <td class="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">${escapeHtml(l.summary)}</td>
                <td class="px-4 py-3 text-right">
                    ${canUndo ? `<div data-feature-action="undo" data-id="${escapeHtml(l.id)}" class="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] border border-amber-200 cursor-pointer">Batalkan / Undo</div>` : '<span class="text-slate-300 text-[10px]">-</span>'}
                </td>
            </tr>`;
        });
        container.innerHTML = html;
    }

    async function undoAuditLog(logId) {
        const data = window.charisnaData?.snapshot() || {};
        const logs = data.auditLogs || [];
            const target = logs.find(l => l.id === logId);
            const snapshot = undoSnapshots.get(logId);
            const before = snapshot?.value;
            if (!target || !snapshot || !before) {
            if (typeof window.showToast === 'function') window.showToast('Tindakan ini tidak dapat dibatalkan otomatis.', 'warning');
            return;
        }

        if (!confirm(`Kembalikan data ${target.entity} (${target.entityId}) ke versi sebelum ${target.action}?`)) return;

        const entity = target.entity;
        const currentEntity = entity === 'Kamar'
            ? (data.rooms || []).find(r => r.id === target.entityId || r.number === target.entityId)
            : entity === 'Penghuni'
                ? (data.tenants || []).find(t => t.id === target.entityId)
                : entity === 'Tagihan'
                    ? (data.bills || []).find(b => b.id === target.entityId)
                    : entity === 'Pengeluaran'
                        ? (data.expenses || []).find(e => e.id === target.entityId)
                        : entity === 'Inventaris'
                            ? (data.inventaris || []).find(i => i.id === target.entityId)
                            : entity === 'Perbaikan'
                                ? (data.perbaikan || []).find(p => p.id === target.entityId)
                                : entity === 'Keluhan'
                                    ? (data.complaints || []).find(c => c.id === target.entityId)
                                    : null;
        if (snapshot.revision && currentEntityRevision(currentEntity) !== snapshot.revision) {
            if (typeof window.showToast === 'function') window.showToast('Undo ditolak: data sudah berubah. Buat pembalikan baru dari kondisi terbaru.', 'warning');
            return;
        }
        let restored = false;

        if (entity === 'Kamar') {
            const roomBefore = before.room || before;
            const tenantBefore = Array.isArray(before.tenants) ? before.tenants : [];
            const idx = (data.rooms || []).findIndex(r => r.id === target.entityId || r.number === target.entityId);
            if (idx >= 0) data.rooms[idx] = roomBefore;
            else (data.rooms = data.rooms || []).push(roomBefore);
            tenantBefore.forEach(tenant => {
                const tenantIdx = (data.tenants || []).findIndex(t => t.id === tenant.id);
                if (tenantIdx >= 0) data.tenants[tenantIdx] = tenant;
                else (data.tenants = data.tenants || []).push(tenant);
            });
            restored = true;
        } else if (entity === 'Penghuni') {
            const idx = (data.tenants || []).findIndex(t => t.id === target.entityId);
            if (idx >= 0) data.tenants[idx] = before;
            else (data.tenants = data.tenants || []).push(before);
            restored = true;
        } else if (entity === 'Tagihan') {
            const idx = (data.bills || []).findIndex(b => b.id === target.entityId);
            if (idx >= 0) data.bills[idx] = before;
            else (data.bills = data.bills || []).push(before);
            restored = true;
        } else if (entity === 'Pengeluaran') {
            const idx = (data.expenses || []).findIndex(e => e.id === target.entityId);
            if (idx >= 0) data.expenses[idx] = before;
            else (data.expenses = data.expenses || []).push(before);
            restored = true;
        } else if (entity === 'Inventaris') {
            const idx = (data.inventaris || []).findIndex(i => i.id === target.entityId);
            if (idx >= 0) data.inventaris[idx] = before;
            else (data.inventaris = data.inventaris || []).push(before);
            restored = true;
        } else if (entity === 'Perbaikan') {
            const idx = (data.perbaikan || []).findIndex(p => p.id === target.entityId);
            if (idx >= 0) data.perbaikan[idx] = before;
            else (data.perbaikan = data.perbaikan || []).push(before);
            restored = true;
        } else if (entity === 'Keluhan') {
            const idx = (data.complaints || []).findIndex(c => c.id === target.entityId);
            if (idx >= 0) data.complaints[idx] = before;
            else (data.complaints = data.complaints || []).push(before);
            restored = true;
        }

        if (!restored) {
            if (typeof window.showToast === 'function') window.showToast('Entitas ini belum didukung undo otomatis.', 'warning');
            return;
        }

        recordAuditLog({
            action: 'UNDO',
            entity: target.entity,
            entityId: target.entityId,
            summary: `Membatalkan tindakan audit ${target.id}`
        });

        if (typeof window.saveData === 'function') {
            await window.saveData();
            if (typeof window.showToast === 'function') window.showToast('Perubahan berhasil dibatalkan.', 'success');
        }
    }

    // ==================== 4. ONLINE ATTACHMENTS / DRIVE UPLOAD ====================
    async function compressImageInMemory(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                // Return original base64 for non-image (e.g. PDF)
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
                return;
            }

            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);

            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    async function uploadAttachmentToDrive(params = {}) {
        if (!checkOnlineOrNotify('Unggah foto/lampiran ke Drive')) return null;

        if (!params?.file || typeof File === 'undefined' || !(params.file instanceof File)) {
            if (typeof window.showToast === 'function') window.showToast('Berkas lampiran tidak valid.', 'danger');
            return null;
        }

        const data = window.charisnaData?.snapshot() || {};
        const scriptUrl = data.settings?.driveScriptUrl;
        if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(scriptUrl || ''))) {
            if (typeof window.showToast === 'function') {
                window.showToast('URL Google Apps Script belum dikonfigurasi atau format tidak valid di Pengaturan.', 'danger');
            }
            return null;
        }

        let idToken = '';
        if (typeof window.charisnaAuditToken === 'function') {
            try { idToken = await window.charisnaAuditToken(); } catch (err) { if (typeof window.showToast === 'function') window.showToast(err.message, 'danger'); return null; }
        }
        if (!idToken) {
            if (typeof window.showToast === 'function') window.showToast('Login owner diperlukan sebelum unggah ke Google Drive.', 'danger');
            return null;
        }

        const isImage = String(params.file.type || '').startsWith('image/');
        const compressedBase64 = await compressImageInMemory(params.file);
        const safeMimeType = isImage ? 'image/jpeg' : (params.file.type || 'application/pdf');
        const originalName = params.fileName || params.file.name || 'lampiran';
        const safeFileName = isImage
            ? originalName.replace(/\.[^.]+$/, '') + '.jpg'
            : originalName;
        const payload = {
            action: 'uploadAttachment',
            idToken: idToken,
            assetName: params.assetName || data.settings?.kostName || 'CHARISNA KOST',
            year: params.year || String(new Date().getFullYear()),
            monthKey: params.monthKey || (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0')),
            category: params.category || 'ktp',
            entityId: params.entityId || params.entityName || '',
            fileName: safeFileName,
            mimeType: safeMimeType,
            base64: compressedBase64
        };

        try {
            const response = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.ok) throw new Error(result.error || 'Gagal mengunggah berkas');
            if (params.category === 'ktp' || params.category === 'bukti-pembayaran' || params.category === 'perbaikan') {
                recordAuditLog({
                    action: 'UNGGAH_DOKUMEN',
                    entity: params.category === 'ktp' ? 'Penghuni' : params.category === 'perbaikan' ? 'Perbaikan' : 'Tagihan',
                    entityId: String(params.entityId || ''),
                    summary: `Unggah lampiran ${params.category} (${params.fileName || params.file.name}) ke Google Drive`
                });
            }
            return result; // { ok: true, fileId, url, path }
        } catch (error) {
            if (typeof window.showToast === 'function') {
                window.showToast('Unggah lampiran ke Drive gagal: ' + error.message, 'danger');
            }
            return null;
        }
    }

    async function deleteAttachmentFromDrive(fileId, data = window.charisnaData?.snapshot() || {}) {
        if (!fileId || typeof window.charisnaAuditToken !== 'function') return false;
        const scriptUrl = data.settings?.driveScriptUrl;
        if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(scriptUrl || ''))) return false;
        try {
            const idToken = await window.charisnaAuditToken();
            const response = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteAttachment', idToken, fileId })
            });
            const result = await response.json();
            return Boolean(result.ok);
        } catch {
            return false;
        }
    }

    // ==================== 5. EXPORT / REPORT (CSV, PRINT, DRIVE SYNC) ====================
    function exportTableToCsv(entityType) {
        const data = window.charisnaData?.snapshot() || {};
        let rows = [];
        let filename = `export-${entityType}-${new Date().toISOString().slice(0, 10)}.csv`;

        if (entityType === 'kamar') {
            rows = (data.rooms || []).map(r => ({
                ID: r.id,
                Nomor: r.number,
                Lantai: r.floor,
                Tipe: r.type,
                Kapasitas: r.capacity,
                Harga: r.price,
                ModeSewa: window.CharisnaRental?.mode(r) || 'MONTHLY',
                HargaPerMalam: Number(r.nightlyPrice || 0),
                Status: r.status,
                kWh: r.kwh,
                Fasilitas: r.facilities
            }));
        } else if (entityType === 'penghuni') {
            rows = (data.tenants || []).map(t => ({
                ID: t.id,
                Nama: t.name,
                NIK: maskNik(t.nik),
                Kamar: t.roomNumber,
                Phone: t.phone,
                Emergency: t.emergency,
                Pekerjaan: t.job,
                Kendaraan: t.vehicle,
                Deposit: t.deposit,
                TanggalMasuk: t.entryDate,
                KtpVerified: t.ktpVerified ? 'Ya' : 'Belum'
            }));
        } else if (entityType === 'tagihan') {
            rows = (data.bills || []).map(b => ({
                ID: b.id,
                NamaPenghuni: b.tenantName,
                Kamar: b.roomNumber,
                Periode: b.period,
                JatuhTempo: b.dueDate,
                SewaDasar: b.baseAmount,
                Listrik: b.electricAmount,
                Lainnya: b.otherAmount,
                Total: b.amount,
                Status: b.status,
                TanggalLunas: b.paidDate || '-'
            }));
        } else if (entityType === 'pengeluaran') {
            rows = (data.expenses || []).map(x => ({
                ID: x.id,
                Tanggal: x.date,
                Kategori: x.category,
                Judul: x.title,
                Jumlah: x.amount
            }));
        } else if (entityType === 'inventaris') {
            rows = (data.inventaris || []).map(i => ({
                ID: i.id,
                KamarRef: i.roomRef,
                Barang: i.item,
                Kategori: i.category,
                Jumlah: i.qty,
                Kondisi: i.condition || 'Baik',
                Catatan: i.notes || ''
            }));
        }

        if (rows.length === 0) {
            if (typeof window.showToast === 'function') window.showToast('Tidak ada data untuk diekspor.', 'warning');
            return;
        }

        const headers = Object.keys(rows[0]);
        let csvContent = headers.join(',') + '\n';

        rows.forEach(r => {
            const line = headers.map(h => {
                const raw = String(r[h] ?? '');
                const val = /^[\s]*[=+\-@]/.test(raw) ? '\t' + raw : raw;
                return `"${val.replace(/"/g, '""')}"`;
            }).join(',');
            csvContent += line + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        if (typeof window.showToast === 'function') {
            window.showToast(`Ekspor CSV ${entityType} berhasil diunduh.`, 'success');
        }
    }

    function printReportSection(title, sections) {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) return;
        const content = Array.isArray(sections) ? sections.map(section => {
            const heading = escapeHtml(section?.heading || '');
            const rows = Array.isArray(section?.rows) ? section.rows : [];
            const tableRows = rows.map(row => `<tr>${(Array.isArray(row) ? row : [row]).map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
            return `<h3>${heading}</h3><table><tbody>${tableRows}</tbody></table>`;
        }).join('') : '';
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHtml(title)}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #1e293b; }
                    h2, h3 { border-bottom: 2px solid #059669; padding-bottom: 8px; color: #047857; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
                    th { background-color: #f1f5f9; font-weight: bold; }
                    .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: right; }
                </style>
            </head>
            <body>
                <h2>CHARISNA KOST - ${escapeHtml(title)}</h2>
                <p style="font-size:12px; color:#64748b;">Tanggal Cetak: ${escapeHtml(new Date().toLocaleString('id-ID'))}</p>
                <div>${content}</div>
                <div class="footer">CHARISNA KOST Enterprise Management System</div>
                <script>window.onload = function() { window.print(); window.close(); };</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // ==================== 6. CENTRALIZED WHATSAPP TEMPLATES ====================
    function buildWaMessage(type, params = {}) {
        const data = window.charisnaData?.snapshot() || {};
        const settings = data.settings || {};
        const kostName = settings.kostName || 'CHARISNA KOST';
        const bankInfo = settings.bankInfo || 'BCA 8291048291 a/n CHARISNA KOST';
        if(window.CharisnaRental && ['INVOICE','REMINDER','RECEIPT','BOOKING_WELCOME'].includes(type)){
            const bill=(data.bills || []).find(item=>item.tenantName===params.tenantName && item.roomNumber===params.roomNumber && item.period===params.period);
            const tenant=(data.tenants || []).find(item=>item.name===params.tenantName && item.roomNumber===params.roomNumber);
            const language=data.plugins?.some(plugin=>plugin.id==='plg-i18n' && plugin.enabled) ? params.language || tenant?.communicationLanguage || bill?.communicationLanguage || settings.communicationLanguage : 'id';
            return window.CharisnaRental.message(type,{bill:bill || params,settings},language);
        }

        let msg = '';
        if (type === 'INVOICE') {
            msg = `Halo *${params.tenantName}*,\n\nBerikut rincian tagihan sewa *${kostName}* (Unit ${params.roomNumber}) periode *${params.period}*:\n` +
                `• Sewa Dasar: Rp ${Number(params.baseAmount || 0).toLocaleString('id-ID')}\n` +
                `• Biaya Listrik: Rp ${Number(params.electricAmount || 0).toLocaleString('id-ID')}\n` +
                (params.otherAmount ? `• Lainnya: Rp ${Number(params.otherAmount).toLocaleString('id-ID')}\n` : '') +
                `*TOTAL TAGIHAN: Rp ${Number(params.amount || 0).toLocaleString('id-ID')}*\n` +
                `Jatuh Tempo: *${params.dueDate}*\n\n` +
                `Pembayaran dapat ditransfer ke:\n*${bankInfo}*\n\n` +
                `Harap konfirmasi dengan mengirimkan bukti transfer. Terima kasih! 🙏`;
        } else if (type === 'BOOKING_WELCOME') {
            msg = `Selamat Datang di *${kostName}*! 🎉\n\nHalo *${params.tenantName}*,\n` +
                `Terima kasih telah bergabung di unit kamar *${params.roomNumber}*.\n\n` +
                `Detail Kontrak Sewa:\n` +
                `• Tanggal Masuk: ${params.entryDate || '-'}\n` +
                `• Interval Sewa: ${params.leaseInterval || 'Bulanan'}\n` +
                `• Deposit: Rp ${Number(params.deposit || 0).toLocaleString('id-ID')}\n\n` +
                `Tata tertib dasar dan fasilitas Wi-Fi dapat ditanyakan langsung ke pengelola.\n` +
                `Semoga nyaman tinggal di ${kostName}!😊`;
        } else if (type === 'REMINDER') {
            msg = `PENGINGAT SEWA - *${kostName}*\n\nHalo *${params.tenantName}* (Unit ${params.roomNumber}),\n` +
                `Tagihan sewa periode *${params.period}* sebesar *Rp ${Number(params.amount || 0).toLocaleString('id-ID')}* ` +
                `jatuh tempo pada tanggal *${params.dueDate}*.\n\n` +
                `Transfer dapat dikirim ke:\n*${bankInfo}*\n\n` +
                `Mohon abaikan pesan ini jika pembayaran sudah dilakukan. Terima kasih! 🙏`;
        }
        return msg;
    }

    function sendWaMessage(phone, type, params = {}) {
        const cleanPhone = String(phone || '').replace(/^0/, '62').replace(/\D/g, '');
        if (!cleanPhone) {
            if (typeof window.showToast === 'function') window.showToast('Nomor WhatsApp tidak valid.', 'warning');
            return;
        }

        const messageText = buildWaMessage(type, params);
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

        // Log WA message
        const data = window.charisnaData?.snapshot() || {};
        data.waLogs = data.waLogs || [];
        data.waLogs.unshift({
            id: 'LOG-' + Date.now(),
            timestamp: new Date().toISOString(),
            type: type,
            recipient: `${params.tenantName} (${phone})`,
            summary: `${type} Unit ${params.roomNumber} (${params.period || ''})`,
            status: 'SENT'
        });

        if (typeof window.charisnaData?.hydrate === 'function') {
            window.charisnaData.hydrate(data);
        }
        if (typeof window.saveData === 'function') {
            window.saveData();
        }
        window.dispatchEvent(new CustomEvent('charisna:wa-log', { detail: { type, phone: cleanPhone } }));
        window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    // ==================== 7. ROOM TIMELINE / CALENDAR ====================
    function renderRoomTimeline(monthKey) {
        const container = document.getElementById('roomTimelineContainer');
        if (!container) return;

        const data = window.charisnaData?.snapshot() || {};
        const rooms = data.rooms || [];
        const tenants = data.tenants || [];
        const complaints = data.complaints || [];
        const repairs = data.perbaikan || [];

        const targetMonth = monthKey || container.dataset.month || new Date().toISOString().slice(0, 7);
        container.dataset.month = targetMonth;
        const [yearStr, monthStr] = targetMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const daysInMonth = new Date(year, month, 0).getDate();

        let html = `
            <div class="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Visual Kalender Unit Kamar (${targetMonth})</h3>
                    <div class="flex items-center gap-2">
                        <input type="month" data-feature-action="timeline-month" value="${escapeHtml(targetMonth)}"
                            class="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-[10px] border-collapse min-w-[700px]">
                        <thead>
                            <tr class="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                <th class="p-2 border border-slate-200 dark:border-slate-700 w-24 text-left">Unit</th>
                                ${Array.from({ length: daysInMonth }, (_, i) => `<th class="p-1 border border-slate-200 dark:border-slate-700 text-center w-6">${i + 1}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;

        rooms.forEach(r => {
            const tenantInRoom = tenants.find(t => t.roomNumber === r.number && (!r.propertyId || !t.propertyId || t.propertyId === r.propertyId));
            const overlaps = (start, end) => {
                const rangeStart = start || end;
                const rangeEnd = end || start;
                if (!rangeStart && !rangeEnd) return false;
                const startDate = new Date((rangeStart || targetMonth + '-01') + 'T00:00:00');
                const endDate = new Date((rangeEnd || rangeStart || targetMonth + '-01') + 'T23:59:59');
                const monthStart = new Date(year, month - 1, 1);
                const monthEnd = new Date(year, month, 0, 23, 59, 59);
                return startDate <= monthEnd && endDate >= monthStart;
            };
            const tenantActive = tenantInRoom && overlaps(tenantInRoom.entryDate, tenantInRoom.endDate || new Date().toISOString().slice(0, 10));
            const repairActive = repairs.some(p => (p.roomNumber === r.number || p.roomRef === r.number || p.propertyId === r.propertyId) && p.status !== 'SELESAI' && overlaps(p.startDate || p.date, p.endDate || p.date));
            const complaintActive = complaints.some(c => c.roomNumber === r.number && (!r.propertyId || !c.propertyId || c.propertyId === r.propertyId) && c.status !== 'RESOLVED' && c.status !== 'SELESAI' && overlaps(c.date, c.resolvedDate || c.date));
            const isRepaired = r.status === 'PERBAIKAN' || repairActive || complaintActive;

            html += `<tr><td class="p-2 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">Unit ${escapeHtml(r.number)}</td>`;

            for (let day = 1; day <= daysInMonth; day++) {
                const date=targetMonth+'-'+String(day).padStart(2,'0');
                const occupied=tenantInRoom && (tenantInRoom.leaseInterval==='Transit'?date===tenantInRoom.entryDate:tenantInRoom.leaseInterval!=='Harian' || (date>=tenantInRoom.entryDate && date<tenantInRoom.endDate));
                let cellClass = 'bg-slate-50 dark:bg-slate-800/40'; // Kosong
                let title = `Unit ${r.number}: Kosong`;

                if (isRepaired) {
                    cellClass = 'bg-amber-200 dark:bg-amber-900/60 text-amber-800';
                    title = `Unit ${r.number}: Dalam Perbaikan / Tiket Maintenance`;
                } else if (r.turnover || (data.plugins?.some(plugin=>plugin.id==='plg-ical' && plugin.enabled) && [...(r.calendarBlocks || []),...(r.feedCalendarBlocks || [])].some(block=>block.start<=date && date<block.end))) {
                    cellClass='bg-amber-200 text-amber-900';
                    title='Unit '+r.number+': Tidak tersedia';
                } else if (occupied) {
                    cellClass = 'bg-emerald-500 text-white font-bold';
                    title = `Unit ${r.number}: Terisi oleh ${tenantInRoom.name}`;
                }

                html += `<td class="p-1 border border-slate-200 dark:border-slate-700 text-center ${cellClass}" title="${escapeHtml(title)}"></td>`;
            }
            html += `</tr>`;
        });

        html += `
                        </tbody>
                    </table>
                </div>
                <div class="flex items-center gap-4 text-[10px] text-slate-500">
                    <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Terisi</span>
                    <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-amber-300 inline-block"></span> Perbaikan</span>
                    <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-slate-200 inline-block"></span> Kosong</span>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // ==================== 8. DARK MODE / THEME CHOICE ====================
    function initTheme() {
        const savedTheme = localStorage.getItem('CHARISNA_THEME') || 'light';
        setTheme(savedTheme);
    }

    function setTheme(mode) {
        localStorage.setItem('CHARISNA_THEME', mode);
        const root = document.documentElement;

        if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            root.classList.add('dark');
            document.body.classList.add('bg-slate-900', 'text-slate-100');
        } else {
            root.classList.remove('dark');
            document.body.classList.remove('bg-slate-900', 'text-slate-100');
        }

        const select = document.getElementById('themeSelector');
        if (select) select.value = mode;
    }

    // ==================== 9. DUE-DATE REMINDERS / BADGES ====================
    function computeDueReminders() {
        const data = window.charisnaData?.snapshot() || {};
        const todayStr = new Date().toISOString().slice(0, 10);
        const today = new Date();

        const rooms = typeof window.getScopedRooms === 'function' ? window.getScopedRooms() : (data.rooms || []);
        const belongsToScope = item => {
            const matches = (data.rooms || []).filter(room => room.number === item.roomNumber
                && (!item.propertyId || (room.propertyId || 'PROP-1') === item.propertyId));
            return matches.length === 1 && rooms.some(room => room.id === matches[0].id);
        };
        const bills = (data.bills || []).filter(belongsToScope);
        const contracts = (data.kontrak || []).filter(belongsToScope);
        const overdueBills = bills.filter(b => b.status !== 'LUNAS' && b.dueDate <= todayStr);
        const dueSoonBills = bills.filter(b => {
            if (b.status === 'LUNAS' || b.dueDate <= todayStr) return false;
            const diffDays = Math.ceil((new Date(b.dueDate) - today) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 3;
        });

        const expiringContracts = contracts.filter(k => {
            if (!k.endDate) return false;
            const diffDays = Math.ceil((new Date(k.endDate) - today) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
        });

        return { overdueBills, dueSoonBills, expiringContracts };
    }

    function renderDashboardReminders() {
        const container = document.getElementById('dashboardRemindersWidget');
        if (!container) return;
        const rooms = typeof window.getScopedRooms === 'function'
            ? window.getScopedRooms() : (window.charisnaData?.snapshot()?.rooms || []);
        if (!rooms.length) {
            container.replaceChildren();
            return;
        }

        const { overdueBills, dueSoonBills, expiringContracts } = computeDueReminders();
        const totalAlerts = overdueBills.length + dueSoonBills.length + expiringContracts.length;

        if (totalAlerts === 0) {
            container.innerHTML = `
                <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                    <i class="fa-solid fa-circle-check text-emerald-600 text-xl"></i>
                    <div>
                        <h4 class="font-bold text-emerald-900 dark:text-emerald-200 text-xs">Semua Tagihan & Kontrak Lancar</h4>
                        <p class="text-[11px] text-emerald-700 dark:text-emerald-400">Tidak ada tunggakan jatuh tempo atau kontrak berakhir minggu ini.</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = `<div class="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
            <div class="flex items-center justify-between">
                <h4 class="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-2">
                    <i class="fa-solid fa-bell text-rose-500 animate-bounce"></i> Pengingat & Jatuh Tempo Aktif (${totalAlerts})
                </h4>
            </div>
            <div class="space-y-2 text-xs">
        `;

        overdueBills.forEach(b => {
            html += `<div class="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                <div>
                    <span class="font-bold text-rose-800 dark:text-rose-200">TERLAMBAT: ${escapeHtml(b.tenantName)} (Unit ${escapeHtml(b.roomNumber)})</span>
                    <p class="text-[10px] text-rose-600 dark:text-rose-400">Rp ${Number(b.amount).toLocaleString('id-ID')} • Jatuh Tempo: ${escapeHtml(b.dueDate)}</p>
                </div>
                <button data-feature-action="reminder" data-id="${escapeHtml(b.id)}"
                    class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]">
                    <i class="fa-brands fa-whatsapp"></i> WA Remind
                </button>
            </div>`;
        });

        dueSoonBills.forEach(b => {
            html += `<div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                <div>
                    <span class="font-bold text-amber-800 dark:text-amber-200">Jatuh Tempo Segera: ${escapeHtml(b.tenantName)} (Unit ${escapeHtml(b.roomNumber)})</span>
                    <p class="text-[10px] text-amber-600 dark:text-amber-400">Rp ${Number(b.amount).toLocaleString('id-ID')} • Due: ${escapeHtml(b.dueDate)}</p>
                </div>
                <button data-feature-action="reminder" data-id="${escapeHtml(b.id)}"
                    class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]">
                    <i class="fa-brands fa-whatsapp"></i> WA Remind
                </button>
            </div>`;
        });

        expiringContracts.forEach(k => {
            html += `<div class="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <div>
                    <span class="font-bold text-blue-800 dark:text-blue-200">Kontrak Berakhir: ${escapeHtml(k.tenantName)} (Unit ${escapeHtml(k.roomNumber)})</span>
                    <p class="text-[10px] text-blue-600 dark:text-blue-400">Berakhir: ${escapeHtml(k.endDate)}</p>
                </div>
            </div>`;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    }

    // ==================== 10. INVENTORY & ASSETS MAINTENANCE ====================
    function addAssetMaintenanceRecord(inventarisId, desc, cost) {
        const data = window.charisnaData?.snapshot() || {};
        data.inventaris = data.inventaris || [];
        data.perbaikan = data.perbaikan || [];

        const asset = data.inventaris.find(i => i.id === inventarisId);
        if (!asset) return;

        const record = {
            id: 'PRB-' + Date.now(),
            date: new Date().toISOString().slice(0, 10),
            asset: asset.item,
            desc: desc || 'Perawatan rutin',
            cost: Number(cost || 0),
            photo: '',
            status: 'SELESAI',
            propertyId: asset.propertyId || 'PROP-1'
        };

        data.perbaikan.unshift(record);
        asset.condition = 'Baik';

        recordAuditLog({
            action: 'TAMBAH',
            entity: 'Perbaikan',
            entityId: record.id,
            summary: `Catat perbaikan aset ${asset.item} (Biaya: Rp ${Number(cost || 0).toLocaleString('id-ID')})`
        });

        if (typeof window.charisnaData?.hydrate === 'function') {
            window.charisnaData.hydrate(data);
        }
    }

    // Initialize module & hooks
    function initModule() {
        initGeneratedActionBindings();
        initGlobalSearch();
        initNetworkStatus();
        initTheme();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModule);
    } else {
        initModule();
    }

    // Export API
    window.CharisnaFeatureModules = {
        openGlobalSearch,
        closeGlobalSearch,
        renderGlobalSearchResults,
        navigateToItem,
        checkOnlineOrNotify,
        updateNetworkBadge,
        recordAuditLog,
        renderAuditLogs,
        undoAuditLog,
        compressImageInMemory,
        uploadAttachmentToDrive,
        deleteAttachmentFromDrive,
        exportTableToCsv,
        printReportSection,
        buildWaMessage,
        sendWaMessage,
        renderRoomTimeline,
        setTheme,
        renderDashboardReminders,
        addAssetMaintenanceRecord
    };

})(window);
