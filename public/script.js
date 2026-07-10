document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const locationSelect = document.getElementById('locationSelect');
  const periodSelect = document.getElementById('periodSelect');
  const resultsArea = document.getElementById('resultsArea');
  const recommendRouteCard = document.getElementById('recommendRouteCard');
  const otherRoutesList = document.getElementById('otherRoutesList');

  // フォーム送信時のイベント処理
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const building = locationSelect.value;
    const period = periodSelect.value;

    if (building && period) {
      fetchRouteData(building, period);
    }
  });

  // fetch()によるバックエンドとの非同期通信
  function fetchRouteData(building, period) {
    const apiUrl = `/api/routes?building=${encodeURIComponent(building)}&period=${encodeURIComponent(period)}`;

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }
        return response.json();
      })
      .then(data => {
        renderAllRoutes(data,building,"JR八王子駅北口");
      })
      .catch(error => {
        console.error('Error fetching routes:', error);
      });
  }

  // 取得したルートデータを画面に反映させる関数
  function renderAllRoutes(data,from,to) {
    resultsArea.classList.remove('is-hidden');

    // ④ おすすめルートの描画（運賃を削除し、建物出発時刻と経由を追加）
    const recommend = data[0];
    if (recommend) {
      recommendRouteCard.innerHTML = `
        <div class="recommend-card">
          <div class="recommend-meta">
            <div class="meta-item">
              <span class="meta-label">⏱ 所要時間</span>
              <span class="meta-value">${recommend.duration}分</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">🚶‍♂️ 徒歩時間</span>
              <span class="meta-value">${recommend.walkTime}分</span>
            </div>
            <div class="meta-item alert-item">
              <span class="meta-label">🚪 建物出発期限</span>
              <span class="meta-value">${recommend.startTime} まで</span>
            </div>
          </div>

          <div class="route-timeline">
            <div class="timeline-node">
              <span class="node-time">${recommend.startTime}</span>
              <span class="node-name">${from}</span>
            </div>
            <div class="timeline-link">徒歩 ${recommend.walkTime}分</div>
            <div class="timeline-node">
              <span class="node-time">${recommend.departureTime}</span>
              <span class="node-name">${recommend.busStop}</span>
            </div>
            <div class="timeline-link">
              <span class="via-badge">${recommend.via}</span>
              <span class="departure-time-text">${recommend.departureTime} 発</span> (バス乗車)
            </div>
            <div class="timeline-node">
              <span class="node-time">${recommend.arrivalTime}</span>
              <span class="node-name">${to}</span>
            </div>
          </div>

          <div class="recommend-msg">✓ このルートが最短で到着できます。</div>
        </div>
      `;
    }

    // ⑤ その他のルートの描画（運賃を削除し、経由を追加）
    otherRoutesList.innerHTML = '';
    const others = data.slice(1);

    if (others && others.length > 0) {
      others.forEach(route => {
        const row = document.createElement('div');
        row.className = 'other-route-row';
        row.innerHTML = `
          <div class="other-route-main">
            <span class="other-bus-stop">${route.busStop}</span>
            <span class="other-flow">
              ${route.startTime} 徒歩 ${route.walkTime}分 &rarr; <span class="other-via">[${route.via}]</span> ${route.departureTime}発 &rarr; ${route.arrivalTime}着
            </span>
          </div>
          <div class="other-route-side">
            <span class="side-badge">所要時間 ${route.duration}分</span>
          </div>
        `;
        otherRoutesList.appendChild(row);
      });
    } else {
      otherRoutesList.innerHTML = '<p class="placeholder-text">その他のルートはありません。</p>';
    }

    resultsArea.scrollIntoView({ behavior: 'smooth' });
  }
});
