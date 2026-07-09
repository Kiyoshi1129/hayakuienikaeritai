document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const locationSelect = document.getElementById('locationSelect');
  const periodSelect = document.getElementById('periodSelect');
  const resultsArea = document.getElementById('resultsArea');
  const recommendRouteCard = document.getElementById('recommendRouteCard');
  const otherRoutesList = document.getElementById('otherRoutesList');

  // フォーム送信時のイベント処理
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault(); // これで画面の自動リロードを完全に防ぎます

    const building = locationSelect.value;
    const period = periodSelect.value;

    if (building && period) {
      fetchRouteData(building, period);
    }
  });

  // fetch()によるバックエンドとの非同期通信
  function fetchRouteData(building, period) {
    // クエリパラメータ付きのURLを構築（※環境に合わせてエンドポイントを変更してください）
    const apiUrl = `/api/routes?building=${encodeURIComponent(building)}&period=${encodeURIComponent(period)}`;

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }
        return response.json();
      })
      .then(data => {
        // バックエンドから成功データを受信した場合の描画
        renderAllRoutes(data);
      })
      .catch(error => {
        console.error('Error fetching routes:', error);
        
        // 【フロントエンド単体動作確認用】
        // バックエンドが未実装でも画面構築の確認ができるよう、仮のデータを生成して表示させます。
        console.log('開発用：バックエンド未検出のため、ダミーデータを表示します。');
        const mockData = generateMockData(building, period);
        renderAllRoutes(mockData);
      });
  }

  // 取得したルートデータを画面に反映させる関数
  function renderAllRoutes(data) {
    // 1. まず結果エリアの非表示クラスを解除して表示する
    resultsArea.classList.remove('is-hidden');

    // 2. おすすめルートの描画
    const recommend = data.recommendRoute;
    if (recommend) {
      recommendRouteCard.innerHTML = `
        <div class="recommend-card">
          <div class="recommend-meta">
            <div class="meta-item">
              <span class="meta-label">⏱ 所要時間</span>
              <span class="meta-value">${recommend.duration}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">💴 運賃</span>
              <span class="meta-value">${recommend.fare}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">🚶‍♂️ 徒歩時間</span>
              <span class="meta-value">${recommend.walkTime}</span>
            </div>
          </div>

          <div class="route-timeline">
            <div class="timeline-node">
              <span class="node-time">---</span>
              <span class="node-name">${recommend.startBuilding}</span>
            </div>
            <div class="timeline-link">徒歩 ${recommend.walkTime}</div>
            <div class="timeline-node">
              <span class="node-time">---</span>
              <span class="node-name">${recommend.busStop}</span>
            </div>
            <div class="timeline-link">${recommend.departureTime} 発 (バス乗車)</div>
            <div class="timeline-node">
              <span class="node-time">${recommend.arrivalTime} 着</span>
              <span class="node-name">${recommend.destination}</span>
            </div>
          </div>

          <div class="recommend-msg">✓ このルートが最短で到着できます。</div>
        </div>
      `;
    }

    // 3. その他のルートの描画
    otherRoutesList.innerHTML = ''; // 既存のリストをクリア
    const others = data.otherRoutes;

    if (others && others.length > 0) {
      others.forEach(route => {
        const row = document.createElement('div');
        row.className = 'other-route-row';
        row.innerHTML = `
          <div class="other-route-main">
            <span class="other-bus-stop">${route.busStop}</span>
            <span class="other-flow">
              徒歩 ${route.walkTime} &rarr; ${route.departureTime}発 &rarr; ${route.arrivalTime}着
            </span>
          </div>
          <div class="other-route-side">
            <span class="side-badge">所要時間 ${route.duration}</span>
            <span class="side-badge">運賃 ${route.fare}</span>
          </div>
        `;
        otherRoutesList.appendChild(row);
      });
    } else {
      otherRoutesList.innerHTML = '<p class="placeholder-text">その他のルートはありません。</p>';
    }

    // 検索完了後に結果位置までスムーズスクロール
    resultsArea.scrollIntoView({ behavior: 'smooth' });
  }

  // --- 【開発検証用】指示書に沿ったモックデータ生成ロジック ---
  function generateMockData(building, period) {
    // 選択された時限によって、ベースとなるダミーの発車時刻を決定
    const timeTable = {
      '1限終わり': '10:40',
      '2限終わり': '12:20',
      '3限終わり': '14:10',
      '4限終わり': '15:50',
      '5限終わり': '17:30'
    };
    
    const baseTimeStr = timeTable[period] || '12:00';
    const [h, m] = baseTimeStr.split(':').map(Number);

    return {
      recommendRoute: {
        duration: '17分',
        fare: '330円',
        walkTime: '5分',
        startBuilding: building,
        busStop: '正門バス停',
        departureTime: `${h}:${(m + 8).toString().padStart(2, '0')}`,
        arrivalTime: `${h}:${(m + 25).toString().padStart(2, '0')}`,
        destination: '八王子駅'
      },
      otherRoutes: [
        {
          busStop: '東門バス停ルート',
          walkTime: '10分',
          departureTime: `${h}:${(m + 12).toString().padStart(2, '0')}`,
          arrivalTime: `${h}:${(m + 32).toString().padStart(2, '0')}`,
          duration: '20分',
          fare: '330円'
        },
        {
          busStop: '西門バス停ルート(急行)',
          walkTime: '15分',
          departureTime: `${h}:${(m + 15).toString().padStart(2, '0')}`,
          arrivalTime: `${h}:${(m + 37).toString().padStart(2, '0')}`,
          duration: '22分',
          fare: '330円'
        }
      ]
    };
  }
});