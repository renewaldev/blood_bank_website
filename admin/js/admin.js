/* ============================================================
   RENEWAL BLOOD NETWORK — Admin Dashboard Module
   ============================================================ */

const AdminModule = {
  currentTab: 'overview',

  async render() {
    await this.renderStats();
    await this.renderBloodGroupStats();
    await this.renderPendingVerifications();
    await this.renderEmergencyQueue();
    await this.renderContactRequests();
    await this.renderAllDonors();
    this.initChart();
  },

  async renderStats() {
    const donors  = await DataStore.getDonors();
    const reqs    = await DataStore.getRequests();
    const contacts = await DataStore.getContactRequests();

    const totalDonors    = donors.length;
    const verifiedDonors = donors.filter(d => d.verificationLevel >= 3).length;
    const availDonors    = donors.filter(d => d.availability === 'available').length;
    const emergencyReqs  = reqs.filter(r => ['pending','under_review','verified'].includes(r.status)).length;
    const pendingVerif   = donors.filter(d => d.verificationLevel < 2).length;
    const suspicious     = donors.filter(d => d.suspicious).length;
    const connected      = contacts.filter(c => c.status === 'connected').length;

    const stats = [
      { id: 'stat-total',     icon: '<i class="fas fa-droplet" style="color:var(--blood-red)"></i>',         label: 'মোট দাতা',          value: totalDonors,    change: '+' },
      { id: 'stat-verified',  icon: '<i class="fas fa-circle-check" style="color:var(--verified-green)"></i>', label: 'যাচাইকৃত দাতা',     value: verifiedDonors, change: '+' },
      { id: 'stat-available', icon: '<i class="fas fa-circle-dot" style="color:var(--verified-green)"></i>', label: 'উপলব্ধ দাতা',       value: availDonors,    change: '' },
      { id: 'stat-emergency', icon: '<i class="fas fa-triangle-exclamation" style="color:var(--blood-red)"></i>', label: 'জরুরি অনুরোধ',      value: emergencyReqs,  change: '' },
      { id: 'stat-connected', icon: '<i class="fas fa-handshake" style="color:var(--status-review)"></i>', label: 'সফল সংযোগ',         value: connected,      change: '+' },
      { id: 'stat-pending',   icon: '<i class="fas fa-clock" style="color:var(--pending-amber)"></i>', label: 'যাচাই বাকি',        value: pendingVerif,   change: '' },
    ];

    const grid = document.getElementById('admin-stats-grid');
    if (!grid) return;
    grid.innerHTML = stats.map(s => `
      <div class="compact-stat-card">
        <span class="compact-stat-icon">${s.icon}</span>
        <div class="compact-stat-info">
          <h4>${s.label}</h4>
          <p class="val" data-target="${s.value}">${s.value}</p>
        </div>
      </div>`).join('');

    // Animate counters
    grid.querySelectorAll('[data-target]').forEach(el => {
      counterObserver.observe(el);
    });
  },

  async renderBloodGroupStats() {
    const donors = await DataStore.getDonors();
    const container = document.getElementById('blood-group-stats');
    if (!container) return;

    const groupData = {};
    BLOOD_GROUPS.forEach(g => groupData[g] = { total: 0, available: 0 });
    donors.forEach(d => {
      if (groupData[d.bloodGroup]) {
        groupData[d.bloodGroup].total++;
        if (d.availability === 'available') groupData[d.bloodGroup].available++;
      }
    });

    const maxTotal = Math.max(...Object.values(groupData).map(d => d.total), 1);

    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th>গ্রুপ</th>
            <th>মোট</th>
            <th>উপলব্ধ</th>
            <th>বিতরণ</th>
          </tr>
        </thead>
        <tbody>
          ${BLOOD_GROUPS.map(g => {
            const d = groupData[g];
            const pct = Math.round((d.total / maxTotal) * 100);
            return `
            <tr>
              <td><span class="bg-badge">${g}</span></td>
              <td style="font-family:var(--font-mono);font-weight:700">${d.total}</td>
              <td style="color:var(--verified-green);font-family:var(--font-mono)">${d.available}</td>
              <td style="width:200px">
                <div class="bg-stat-bar"><div class="bg-stat-fill" style="width:${pct}%"></div></div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  },

  async renderPendingVerifications() {
    const donors = (await DataStore.getDonors()).filter(d => d.verificationLevel < 3);
    const container = document.getElementById('pending-verif-list');
    if (!container) return;

    if (donors.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-circle-check"></i></div><p>কোনো বাকি যাচাই নেই</p></div>';
      return;
    }

    container.innerHTML = donors.slice(0, 10).map(d => {
      const levels = [
        { key: 'mobile', label: 'মোবাইল', done: d.verificationLevel >= 1 },
        { key: 'identity', label: 'পরিচয়', done: d.verificationLevel >= 2 },
        { key: 'blood', label: 'রক্তের গ্রুপ', done: d.verificationLevel >= 3 },
        { key: 'renewal', label: 'রিনিউয়েল', done: d.verificationLevel >= 4 },
      ];
      const nextLevel = levels.find(l => !l.done);

      return `
      <div class="data-item">
        <div style="display:flex; gap: 1rem; align-items: center; flex: 1">
          <div class="donor-avatar" style="width:36px;height:36px;font-size:0.9rem;flex-shrink:0">${d.name.charAt(0)}</div>
          <div class="data-info">
            <h4>${d.name}</h4>
            <p>${d.district} • <span class="bg-badge" style="font-size:0.7rem;padding:0.1rem 0.4rem">${d.bloodGroup}</span></p>
          </div>
        </div>
        <div style="display:flex;gap:0.3rem;flex-wrap:wrap; margin: 0 1rem; flex: 1">
          ${levels.map(l => `<span class="verify-chip ${l.done ? 'done' : 'pending'}">${l.done ? '<i class="fas fa-check"></i>' : '○'} ${l.label}</span>`).join('')}
        </div>
        <div class="data-actions">
          ${nextLevel ? `<button class="btn btn-primary" onclick="AdminModule.approveVerification('${d.id}', ${d.verificationLevel + 1})"><i class="fas fa-check"></i> ${nextLevel.label} যাচাই</button>` : ''}
          <button class="btn btn-ghost btn-icon" title="ফ্ল্যাগ করুন" onclick="AdminModule.flagSuspicious('${d.id}')"><i class="fas fa-flag"></i></button>
        </div>
      </div>`;
    }).join('');
  },

  async renderEmergencyQueue() {
    const reqs = (await DataStore.getRequests()).filter(r => r.status !== 'completed' && r.status !== 'expired');
    const container = document.getElementById('admin-emergency-queue');
    if (!container) return;

    if (reqs.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>কোনো সক্রিয় অনুরোধ নেই</p></div>';
      return;
    }

    container.innerHTML = reqs.map(r => {
      const statusInfo = Utils.getStatusBadge(r.status);
      return `
      <div class="data-item">
        <div style="display:flex;gap:1rem;align-items:center;flex:2">
          <span class="bg-badge">${r.bloodGroup}</span>
          <div class="data-info">
            <h4>${r.patientName} — ${r.units} ব্যাগ</h4>
            <p>${r.hospital} • ${r.district}</p>
          </div>
        </div>
        <div style="flex:1;margin:0 1rem">
          <span class="status-badge ${statusInfo.class}">${statusInfo.icon} ${statusInfo.label}</span>
        </div>
        <div class="data-actions">
          ${r.status === 'pending' ? `<button class="btn btn-ghost" onclick="AdminModule.updateRequestStatus('${r.id}','under_review')"><i class="fas fa-magnifying-glass"></i> পর্যালোচনা</button>` : ''}
          ${r.status === 'under_review' ? `<button class="btn btn-green" onclick="AdminModule.updateRequestStatus('${r.id}','verified')"><i class="fas fa-check"></i> যাচাই</button>` : ''}
          ${r.status === 'verified' ? `<button class="btn btn-primary" onclick="AdminModule.updateRequestStatus('${r.id}','completed')"><i class="fas fa-circle-check"></i> সম্পন্ন</button>` : ''}
          <button class="btn btn-ghost btn-icon" style="color:var(--blood-red)" title="বাতিল করুন" onclick="AdminModule.updateRequestStatus('${r.id}','rejected')"><i class="fas fa-xmark"></i></button>
        </div>
      </div>`;
    }).join('');
  },

  async renderContactRequests() {
    const reqs = await DataStore.getContactRequests();
    const container = document.getElementById('admin-contact-requests');
    if (!container) return;

    if (reqs.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>কোনো যোগাযোগ অনুরোধ নেই</p></div>';
      return;
    }

    // Process all contact requests and fetch the corresponding donor info
    const reqHtml = await Promise.all(reqs.slice(0, 10).map(async r => {
      const donor = await DataStore.getDonorById(r.donorId);
      return `
      <div class="data-item">
        <div style="display:flex;gap:1rem;align-items:center;flex:2">
          <span class="bg-badge">${r.bloodGroup}</span>
          <div class="data-info">
            <h4>${r.patient} — ${r.units} ব্যাগ</h4>
            <p>${r.hospital} | দাতা: ${donor?.name || 'N/A'} (${donor?.district || ''})</p>
          </div>
        </div>
        <div style="flex:1;margin:0 1rem">
          <span class="status-badge ${r.status === 'pending' ? 'status-pending' : 'status-completed'}">${r.status === 'pending' ? '<i class="fas fa-clock"></i> অপেক্ষমাণ' : '<i class="fas fa-circle-check"></i> সম্পন্ন'}</span>
        </div>
        <div class="data-actions">
          ${r.status === 'pending' ? `<button class="btn btn-primary" onclick="AdminModule.connectDonor('${r.id}')"><i class="fas fa-phone"></i> সংযোগ করুন</button>` : ''}
        </div>
      </div>`;
    }));
    
    container.innerHTML = reqHtml.join('');
  },

  async renderAllDonors() {
    const donors = await DataStore.getDonors();
    const container = document.getElementById('admin-all-donors');
    if (!container) return;

    container.innerHTML = donors.map(d => {
      const avail = Utils.getAvailabilityInfo(d.availability);
      return `
      <div class="data-item">
        <div style="display:flex;gap:1rem;align-items:center;flex:1.5">
          <div class="donor-avatar" style="width:36px;height:36px;font-size:0.9rem;flex-shrink:0">${d.name.charAt(0)}</div>
          <div class="data-info">
            <h4 style="font-family:var(--font-bn);font-weight:700">${d.name}</h4>
            <p>${d.district} • <span class="bg-badge" style="font-size:0.7rem;padding:0.1rem 0.4rem">${d.bloodGroup}</span></p>
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:0.2rem;margin:0 1rem">
          <span class="verify-chip done">${Utils.getVerificationLabel(d.verificationLevel)}</span>
          ${d.suspicious ? '<span class="status-badge status-rejected"><i class="fas fa-triangle-exclamation"></i> সন্দেহজনক</span>' : ''}
          <div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.2rem">
            <div class="trust-bar-track" style="width:60px"><div class="trust-bar-fill" style="width:${d.trustScore}%"></div></div>
            <span style="font-family:var(--font-mono);font-size:0.8rem">${d.trustScore}</span>
          </div>
        </div>
        <div style="flex:0.5;margin:0 1rem">
          <span class="avail-dot ${avail.dot} ${avail.class}">${avail.label}</span>
        </div>
        <div class="data-actions">
          ${d.verificationLevel < 4 ? `<button class="btn btn-ghost" onclick="AdminModule.approveVerification('${d.id}', ${Math.min(d.verificationLevel + 1, 4)})"><i class="fas fa-check"></i> Level ${d.verificationLevel + 1}</button>` : '<span style="color:var(--verified-green);font-size:0.8rem"><i class="fas fa-star" style="color:#FFD700"></i> সর্বোচ্চ</span>'}
          ${!d.suspicious ? `<button class="btn btn-ghost btn-icon" style="color:var(--pending-amber)" title="ফ্ল্যাগ করুন" onclick="AdminModule.flagSuspicious('${d.id}')"><i class="fas fa-flag"></i></button>` : ''}
        </div>
      </div>`;
    }).join('');
  },

  async approveVerification(donorId, newLevel) {
    const typeMap = ['', 'mobile', 'identity', 'bloodGroup', 'renewal'];
    const type = typeMap[newLevel] || 'renewal';
    await DataStore.updateDonor(donorId, {
      verificationLevel: newLevel,
      [`verif_${type}`]: true,
    });

    const donor = await DataStore.getDonorById(donorId);
    const levelLabels = ['','<i class="fas fa-mobile"></i> মোবাইল','<i class="fas fa-id-card"></i> পরিচয়','<i class="fas fa-droplet"></i> রক্তের গ্রুপ','<i class="fas fa-star"></i> রিনিউয়েল'];
    Toast.show({
      type: 'success',
      title: 'যাচাই সম্পন্ন!',
      message: `${donor?.name} — ${levelLabels[newLevel]} যাচাই করা হয়েছে।`
    });
    this.render();
  },

  async flagSuspicious(donorId) {
    await DataStore.updateDonor(donorId, { suspicious: true });
    Toast.show({ type: 'warning', title: 'সন্দেহজনক হিসেবে চিহ্নিত', message: 'এই অ্যাকাউন্টটি পর্যালোচনার জন্য ফ্ল্যাগ করা হয়েছে।' });
    this.render();
  },

  async updateRequestStatus(id, status) {
    await DataStore.updateRequest(id, {
      status,
      verifiedAt: status === 'verified' ? new Date().toISOString() : undefined
    });
    const labels = { under_review: 'পর্যালোচনা শুরু', verified: 'যাচাই সম্পন্ন', completed: 'সম্পন্ন', rejected: 'প্রত্যাখ্যাত' };
    Toast.show({ type: 'success', title: labels[status] || 'আপডেট', message: 'অনুরোধের স্ট্যাটাস আপডেট হয়েছে।' });
    this.render();
  },

  async connectDonor(contactId) {
    await DataStore.updateContactRequest(contactId, { status: 'connected' });
    Toast.show({ type: 'success', title: 'সংযোগ করা হয়েছে', message: 'দাতা ও রোগীর পরিবারকে সংযুক্ত করা হয়েছে।' });
    this.render();
  },

  initChart() {
    const canvas = document.getElementById('donation-trend-chart');
    if (!canvas || !window.Chart) return;

    if (canvas._chart) { canvas._chart.destroy(); }

    const months = ['মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট'];
    const data = [45, 62, 78, 95, 110, 128];

    canvas._chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'নিবন্ধিত দাতা',
          data,
          borderColor: '#E53935',
          backgroundColor: 'rgba(229,57,53,0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#E53935',
          pointRadius: 5,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#334155', font: { family: "'Hind Siliguri', sans-serif" } } }
        },
        scales: {
          x: { ticks: { color: '#64748B', font: { family: "'Hind Siliguri', sans-serif" } }, grid: { color: 'rgba(0,0,0,0.06)' } },
          y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.06)' } }
        }
      }
    });
  },

  switchTab(tabId) {
    document.querySelectorAll('.sidebar-link').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.toggle('active', p.id === 'atab-' + tabId));
    this.currentTab = tabId;
    
    // Close sidebar on mobile after clicking
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  }
};

/* ============================================================
   RENEWAL BLOOD NETWORK — Leaderboard Module
   ============================================================ */

const LeaderboardModule = {
  async render() {
    const donors = (await DataStore.getDonors())
      .filter(d => d.donationCount > 0)
      .sort((a, b) => b.donationCount - a.donationCount);

    this.renderTop3(donors.slice(0, 3));
    this.renderFullList(donors);
  },

  renderTop3(top) {
    const container = document.getElementById('top3-grid');
    if (!container) return;

    const order = [1, 0, 2]; // 2nd, 1st, 3rd position
    const icons = ['<i class="fas fa-award" style="color:#c0c0c0"></i>', '<i class="fas fa-crown" style="color:#ffd700"></i>', '<i class="fas fa-award" style="color:#cd7f32"></i>'];
    const classes = ['rank-2', 'rank-1', 'rank-3'];

    container.innerHTML = order.map(i => {
      const d = top[i];
      if (!d) return '';
      return `
      <div class="top-donor-card ${classes[order.indexOf(i)]} hover-lift anim-fadeInUp delay-${(order.indexOf(i) + 1) * 100}">
        <span class="top-rank-icon">${icons[order.indexOf(i)]}</span>
        <div class="top-donor-name">${d.name.charAt(0)}.${d.name.split(' ').slice(-1)[0].charAt(0)}.</div>
        <div class="top-donor-count">${d.donationCount} বার রক্তদান</div>
        <div style="margin-top:0.5rem"><span class="bg-badge">${d.bloodGroup}</span></div>
        <div style="margin-top:0.5rem"><span class="donor-badge ${Utils.getBadgeInfo(d.badge).class}">${Utils.getBadgeInfo(d.badge).label}</span></div>
        <div style="margin-top:0.75rem;font-size:0.8rem;color:var(--text-muted);font-family:var(--font-bn)"><i class="fas fa-star" style="color:#ffd700"></i> Trust: ${d.trustScore}/100</div>
      </div>`;
    }).join('');
  },

  renderFullList(donors) {
    const container = document.getElementById('full-leaderboard');
    if (!container) return;

    container.innerHTML = donors.map((d, i) => {
      const badge = Utils.getBadgeInfo(d.badge);
      return `
      <div style="display:flex;align-items:center;gap:1rem;padding:0.85rem 0;border-bottom:1px solid var(--border)">
        <span style="font-family:var(--font-mono);font-weight:700;color:var(--text-muted);width:28px;text-align:center">${i + 1}</span>
        <div class="donor-avatar" style="width:36px;height:36px;font-size:0.85rem;flex-shrink:0">${d.name.charAt(0)}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-bn);font-weight:700;font-size:0.9rem">${d.name.charAt(0)}.${d.name.split(' ').slice(-1)[0].charAt(0)}. <span style="font-size:0.75rem;color:var(--text-muted)">${d.district}</span></div>
          <div style="display:flex;gap:0.4rem;margin-top:0.3rem;flex-wrap:wrap">
            <span class="bg-badge" style="font-size:0.7rem">${d.bloodGroup}</span>
            <span class="donor-badge ${badge.class}" style="font-size:0.7rem">${badge.label}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-mono);font-weight:800;font-size:1.1rem;color:var(--blood-light)">${d.donationCount}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">বার</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.8rem;color:var(--verified-green)"><i class="fas fa-star" style="color:#ffd700"></i> ${d.trustScore}</div>
        </div>
      </div>`;
    }).join('');
  }
};

window.AdminModule = AdminModule;
window.LeaderboardModule = LeaderboardModule;
