// ==========================================
// 1. 型定義 (Types & Interfaces)
// ==========================================
// ==========================================
// 2. UI・イベント・通信層 (Presentation & API)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const locationSelect = document.getElementById('locationSelect');
    const periodSelect = document.getElementById('periodSelect');
    const speedSelect = document.getElementById('speedSelect');
    const stationToggle = document.getElementById('stationToggle');
    const stationToggleInfo = document.getElementById('stationToggleInfo');
    const resultsArea = document.getElementById('resultsArea');
    const recommendRouteCard = document.getElementById('recommendRouteCard');
    const otherRoutesList = document.getElementById('otherRoutesList');
    menuBtn.addEventListener('click', () => {
        settingsDrawer.classList.add('is-open');
        drawerOverlay.classList.add('is-active');
    });
    const closeDrawer = () => {
        settingsDrawer.classList.remove('is-open');
        drawerOverlay.classList.remove('is-active');
    };
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    // 駅名切り替え時の再検索
    stationToggle.addEventListener('click', () => {
        const currentDest = stationToggle.getAttribute('data-destination');
        const nextDest = currentDest === 'JR' ? 'Keio' : 'JR';
        stationToggle.setAttribute('data-destination', nextDest);
        stationToggle.textContent = nextDest === 'JR' ? 'JR八王子駅' : '京王八王子駅';
        stationToggleInfo.textContent = nextDest === 'JR' ? '京王八王子駅' : 'JR八王子駅';
        if (!resultsArea.classList.contains('is-hidden')) {
            searchForm.requestSubmit();
        }
    });
    // フォーム送信時 ➔ ⚡ サーバーからリアルタイムデータをfetchする
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const building = locationSelect.value;
        const period = periodSelect.value;
        const destination = stationToggle.getAttribute('data-destination');
        try {
            // ※実際のサーバーのURLパスに合わせて調整してください
            const queryParams = new URLSearchParams({
                building: building,
                period: period,
                destination: destination,
            });
            const response = await fetch(`/api/routes?${queryParams.toString()}`);
            if (!response.ok)
                throw new Error('サーバー通信エラー');
            const routes = await response.json();
            // 画面への描画処理を実行
            renderAllRoutes(routes, building, destination);
        }
        catch (err) {
            console.error('ルートの取得に失敗しました:', err);
            recommendRouteCard.innerHTML = `<p class="error-text">⚠️ リアルタイムデータの取得に失敗しました。時間をおいて再度お試しください。</p>`;
            resultsArea.classList.remove('is-hidden');
        }
    });
    if (locationSelect.value) {
        searchForm.requestSubmit();
    }
    /** 🎯 リアルタイム遅延・増発に対応した新しいレンダリング関数 */
    function renderAllRoutes(data, from, destination) {
        if (!resultsArea || !recommendRouteCard || !otherRoutesList)
            return;
        if (data.length === 0) {
            recommendRouteCard.innerHTML = `<p class="placeholder-text">該当する運行ルートが見つかりませんでした。</p>`;
            otherRoutesList.innerHTML = '';
            resultsArea.classList.remove('is-hidden');
            return;
        }
        resultsArea.classList.remove('is-hidden');
        const toStationName = destination === 'JR' ? "JR八王子駅北口" : "京王八王子駅";
        // ==========================================
        // ① おすすめルート (最上位) の描画
        // ==========================================
        const recommend = data[0];
        // 遅延および増発状態に応じたリッチなテキスト・バッジの生成
        const delayNoticeHtml = recommend.delay && recommend.delay > 0
            ? `<span class="delay-badge" style="background-color: #ffebe6; color: #de350b; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; margin-left: 8px;">⚠️ ${recommend.delay}分遅れ情報あり</span>`
            : '';
        const extraTypeBadgeHtml = recommend.type === 'DUPLICATED'
            ? `<span class="extra-badge" style="background-color: #e6f4ea; color: #137333; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; margin-left: 8px;">✨ 臨時増発便</span>`
            : '';
        // 遅れがある場合は元の時刻に打ち消し線を入れ、修正時刻(depfix/arrfix)を赤文字で強調する
        const busDepartureHtml = recommend.depfix
            ? `<s style="color: #888;">${recommend.deptime}</s> ➔ <span style="color: #de350b; font-weight: bold;">${recommend.depfix}</span>`
            : recommend.deptime;
        // 目的地に応じた到着時刻の選択
        const baseArrivalTime = recommend.arrtime;
        const targetArrivalFix = recommend.arrfix; // サーバー側で反映済み想定
        const finalArrivalHtml = targetArrivalFix
            ? `<s style="color: #888;">${baseArrivalTime}</s> ➔ <span style="color: #de350b; font-weight: bold;">${targetArrivalFix}</span>`
            : baseArrivalTime;
        let recommendHtml = `
            <div class="recommend-card">
                <div class="recommend-meta">
                    <div class="meta-item"><span class="meta-label">⏱ 所要時間</span><span class="meta-value">${recommend.duration}分</span></div>
                    <div class="meta-item"><span class="meta-label">🚶‍♂️ 徒歩時間</span><span class="meta-value">${recommend.walk}分</span></div>
                    <div class="meta-item alert-item"><span class="meta-label">🚪 建物出発期限</span><span class="meta-value" style="color: #de350b; font-weight: bold;">${recommend.b_deptime} まで</span></div>
                </div>
                <div class="route-timeline">
                    <div class="timeline-node"><span class="node-time">${recommend.b_deptime}</span><span class="node-name">${from}</span></div>
                    <div class="timeline-link">🚶‍♂️ 徒歩 ${recommend.walk}分</div>
                    <div class="timeline-node">
                        <span class="node-time">${recommend.depfix || recommend.deptime}</span>
                        <span class="node-name">${recommend.stop_name}</span>
                    </div>
                    <div class="timeline-link">
                        <span class="via-badge">${recommend.route_name}</span>
                        ${extraTypeBadgeHtml}
                        <span class="departure-time-text">${busDepartureHtml} 発</span>
                        ${delayNoticeHtml}
                    </div>`;
        // JR止まり ➔ 京王まで追加徒歩があるルートのUI処理
        if (destination === 'Keio' && recommend.extra_walk > 0) {
            recommendHtml += `
                    <div class="timeline-node"><span class="node-time">${recommend.arrfix || recommend.arrtime}</span><span class="node-name">JR八王子駅北口 (降車)</span></div>
                    <div class="timeline-link" style="font-weight: bold; color: #666;">🚶‍♂️ 駅間徒歩 ${recommend.extra_walk}分</div>`;
        }
        recommendHtml += `
                    <div class="timeline-node"><span class="node-time" style="color: var(--main-blue); font-weight: bold;">${recommend.arrfix || baseArrivalTime}</span><span class="node-name" style="font-weight: bold;">${toStationName}</span></div>
                </div>
                <div class="recommend-msg">✓ 遅れ情報を反映した最適ルートを表示しています。</div>
            </div>`;
        recommendRouteCard.innerHTML = recommendHtml;
        // ==========================================
        // ② その他のルート (リスト表示) の描画
        // ==========================================
        otherRoutesList.innerHTML = '';
        const others = data.slice(1);
        if (others.length > 0) {
            others.forEach(route => {
                const row = document.createElement('div');
                row.className = 'other-route-row';
                const routeStationArrival = route.arrtime;
                // 行き先表示用のパーツ組み立て
                let arrivalFlowHtml = '';
                if (destination === 'Keio' && route.extra_walk > 0) {
                    arrivalFlowHtml = `
                        ${route.arrfix || route.arrtime_a}着(JR) 
                        <span class="other-walk-arrow">➔</span> 
                        <span class="other-walk-text">🚶‍♂️${route.extra_walk}分</span> 
                        <span class="other-walk-arrow">➔</span> 
                        <span class="dest-keio-time" style="${route.arrfix ? 'color: #de350b; font-weight: bold;' : ''}">${route.arrfix || route.arrtime}着</span>
                    `;
                }
                else {
                    arrivalFlowHtml = route.arrfix
                        ? `<span style="color: #de350b; font-weight: bold;">${route.arrfix}着</span>`
                        : `${routeStationArrival}着`;
                }
                // 遅延・臨時マークのテキスト化
                const delayText = route.delay && route.delay > 0 ? `[⚠️${route.delay}分遅れ]` : '';
                const addedText = route.type === 'DUPLICATED' ? '[✨臨時]' : '';
                row.innerHTML = `
                    <div class="other-route-main">
                        <span class="other-bus-stop" style="font-size: 0.85rem; padding: 2px 6px; background: #eee; border-radius: 4px;">${route.stop_name}</span>
                        <span class="other-flow" style="margin-left: 8px;">
                            ${route.b_deptime}発 ➔ 
                            <span class="other-via" style="font-weight: bold; color: var(--main-blue);">${route.route_name}${addedText}</span> 
                            ${route.depfix || route.deptime}発 ${delayText} ➔ 
                            ${arrivalFlowHtml}
                        </span>
                    </div>
                    <div class="other-route-side">
                        <span class="side-badge">所要 ${route.duration}分</span>
                    </div>
                `;
                otherRoutesList.appendChild(row);
            });
        }
        else {
            otherRoutesList.innerHTML = '<p class="placeholder-text">その他のルートはありません。</p>';
        }
        resultsArea.scrollIntoView({ behavior: 'smooth' });
    }
});
