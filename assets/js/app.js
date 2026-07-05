// Effi Lia - Outreach — bootstraps modules, handles project-tab switching.

(function () {
  async function loadProject(project) {
    Effi.state.activeProject = project;
    await Promise.all([
      Effi.clients.load(),
      Effi.dailyTargets.initForProject(project),
      Effi.reminders.refresh()
    ]);
  }

  function wireTabs() {
    document.getElementById('project-tabs').addEventListener('click', async (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await loadProject(btn.dataset.project);
    });
  }

  function boot() {
    Effi.clients.wireEvents();
    Effi.dailyTargets.wireEvents();
    Effi.bookedFlow.wireEvents();
    Effi.reminders.wireEvents();
    wireTabs();
    loadProject(Effi.state.activeProject);
  }

  if (document.getElementById('app').hidden === false) {
    boot();
  } else {
    document.addEventListener('effi:unlocked', boot, { once: true });
  }
})();
