// Effi Lia - Outreach — shared Supabase client, generic db helpers, small utils.
// Loaded first; everything else hangs off window.Effi.

const SUPABASE_URL = 'https://hseffkdzxyiescyrvvzr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZWZma2R6eHlpZXNjeXJ2dnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5OTM2NzIsImV4cCI6MjA5NDU2OTY3Mn0.X6upfM8BUyyvQiFSrS7WkDd5iR08qEp3p8tE9nn2bmQ';

window.Effi = {
  sb: supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY),

  PROJECTS: ['saha_synergy', 'bwb', 'bfp'],
  PROJECT_LABELS: {
    saha_synergy: 'Saha Synergy',
    bwb: 'BWB',
    bfp: 'Best Friend Production'
  },

  state: {
    activeProject: 'saha_synergy'
  },

  util: {
    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
    todayISODate() {
      const d = new Date();
      const tz = d.getTimezoneOffset() * 60000;
      return new Date(d - tz).toISOString().slice(0, 10);
    },
    formatDateTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    },
    formatTime(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    },
    openModal(id) {
      document.getElementById(id).hidden = false;
    },
    closeModal(id) {
      document.getElementById(id).hidden = true;
    }
  },

  db: {
    async getRows(table, filters = {}) {
      try {
        let q = Effi.sb.from(table).select('*');
        for (const [key, val] of Object.entries(filters)) {
          q = q.eq(key, val);
        }
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn(`Effi.db.getRows(${table}) failed`, e);
        return [];
      }
    },
    async insertRow(table, row) {
      try {
        const { data, error } = await Effi.sb.from(table).insert(row).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.warn(`Effi.db.insertRow(${table}) failed`, e);
        return null;
      }
    },
    async upsertRow(table, row, onConflict) {
      try {
        const { data, error } = await Effi.sb.from(table).upsert(row, { onConflict }).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.warn(`Effi.db.upsertRow(${table}) failed`, e);
        return null;
      }
    },
    async updateRow(table, id, patch) {
      try {
        const { data, error } = await Effi.sb.from(table).update(patch).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } catch (e) {
        console.warn(`Effi.db.updateRow(${table}) failed`, e);
        return null;
      }
    },
    async deleteRow(table, id) {
      try {
        const { error } = await Effi.sb.from(table).delete().eq('id', id);
        if (error) throw error;
        return true;
      } catch (e) {
        console.warn(`Effi.db.deleteRow(${table}) failed`, e);
        return false;
      }
    }
  }
};

// Generic modal close wiring (× buttons + backdrop click)
document.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('[data-close-modal]');
  if (closeBtn) {
    Effi.util.closeModal(closeBtn.dataset.closeModal);
    return;
  }
  if (e.target.classList && e.target.classList.contains('modal')) {
    e.target.hidden = true;
  }
});
