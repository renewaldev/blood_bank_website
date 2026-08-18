/* ============================================================
   RENEWAL BLOOD NETWORK — Leaderboard Module
   ============================================================ */

const LeaderboardModule = {
  async render() {
    const donors = await DataStore.getDonors();
    // Sort by donationCount descending, then trustScore descending
    donors.sort((a, b) => b.donationCount - a.donationCount || b.trustScore - a.trustScore);
    
    // Filter out people with 0 donations from leaderboard? 
    // Show top 20 donors
    const topDonors = donors.filter(d => d.donationCount > 0);
    
    this.renderTop3(topDonors.slice(0, 3));
    this.renderList(topDonors.slice(3, 20));
  },

  renderTop3(donors) {
    const grid = document.getElementById('top3-grid');
    if (!grid) return;
    
    if (donors.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--font-bn)">এখনো কোনো রক্তদাতা নেই। প্রথম রক্তদাতা হয়ে লিডারবোর্ডে যুক্ত হোন!</div>';
      return;
    }

    // Reorder: 2nd, 1st, 3rd for podium effect
    const podium = [];
    if (donors[1]) podium.push({ ...donors[1], rank: 2 });
    if (donors[0]) podium.push({ ...donors[0], rank: 1 });
    if (donors[2]) podium.push({ ...donors[2], rank: 3 });

    grid.innerHTML = podium.map(d => {
      return `
        <div class="top3-card rank-${d.rank} anim-fade-up" style="animation-delay:${d.rank*0.1}s">
          <div class="rank-badge">${d.rank}</div>
          <div class="top3-avatar">${d.name.charAt(0)}</div>
          <div class="top3-name">${d.name.split(' ')[0]}</div>
          <div class="top3-blood">${d.bloodGroup}</div>
          <div class="top3-count">${d.donationCount} বার রক্তদান</div>
          <div class="top3-location" style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem"><i class="fas fa-location-dot"></i> ${d.district}</div>
        </div>
      `;
    }).join('');
  },

  renderList(donors) {
    const list = document.getElementById('full-leaderboard');
    if (!list) return;
    
    if (donors.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = donors.map((d, i) => {
      const rank = i + 4;
      return `
        <div class="leaderboard-item anim-fade-up" style="animation-delay:${i*0.05}s; display:flex; align-items:center; gap:1rem; padding:1rem; border-bottom:1px solid var(--border-card);">
          <div class="lb-rank" style="font-size:1.2rem; font-weight:bold; color:var(--text-muted); width:30px; text-align:center">${rank}</div>
          <div class="lb-avatar" style="width:40px; height:40px; border-radius:50%; background:var(--blood-light); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold;">${d.name.charAt(0)}</div>
          <div class="lb-info" style="flex-grow:1;">
            <div class="lb-name" style="font-weight:600; font-family:var(--font-bn)">${d.name}</div>
            <div class="lb-meta" style="font-size:0.85rem; color:var(--text-muted); font-family:var(--font-bn)">${d.district} • ${d.bloodGroup}</div>
          </div>
          <div class="lb-stats" style="text-align:right">
            <div class="lb-count" style="font-size:1.2rem; font-weight:bold; color:var(--blood-red)">${d.donationCount}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">বার</div>
          </div>
        </div>
      `;
    }).join('');
  }
};
