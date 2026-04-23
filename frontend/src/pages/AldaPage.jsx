import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import AldaFilter from '../components/alda/AldaFilter.jsx';
import AldaChart from '../components/alda/AldaChart.jsx';
import AldaTable from '../components/alda/AldaTable.jsx';

const RANK_ICONS = ['🥇', '🥈', '🥉', '4위', '5위'];

function StatCard({ label, value, sub, color = 'var(--primary)' }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

export default function AldaPage() {
  const [period, setPeriod] = useState('this_week');

  const stats = useApi(() => api.get(`/alda/stats?period=${period}`), [period]);
  const top = useApi(() => api.get(`/alda/top?period=${period}&limit=5`), [period]);
  const reactions = useApi(() => api.get(`/alda/reactions?period=${period}`), [period]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>

      {/* 페이지 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>알다 인정/칭찬 현황</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            이모지 리액션 집계 (인메모리 · 서버 재시작 시 초기화)
          </p>
        </div>
        <AldaFilter value={period} onChange={setPeriod} />
      </div>

      {/* 통계 카드 */}
      <div style={{ display: 'flex', gap: 14 }}>
        <StatCard
          label="총 칭찬 수"
          value={stats.data ? `${stats.data.total}건` : null}
          sub="선택 기간 전체"
          color="var(--primary)"
        />
        <StatCard
          label="칭찬 보낸 멤버"
          value={stats.data ? `${stats.data.uniqueGivers}명` : null}
          sub="중복 제외"
          color="#F59E0B"
        />
        <StatCard
          label="칭찬 받은 멤버"
          value={stats.data ? `${stats.data.uniqueReceivers}명` : null}
          sub="중복 제외"
          color="#10B981"
        />
      </div>

      {/* 차트 + Top 5 */}
      <div style={{ display: 'flex', gap: 14 }}>

        {/* 이모지별 현황 차트 */}
        <div className="card" style={{ flex: 2 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>이모지별 현황</div>
          {stats.loading && <div className="state-box">로딩 중...</div>}
          {stats.error && <div className="state-box" style={{ color: '#DC2626' }}>{stats.error}</div>}
          {stats.data && (
            <div style={{ height: 200 }}>
              <AldaChart byEmoji={stats.data.byEmoji} />
            </div>
          )}
        </div>

        {/* Top 5 수신자 */}
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Top 5 수신자</div>
          {top.loading && <div className="state-box">로딩 중...</div>}
          {top.error && <div className="state-box" style={{ color: '#DC2626' }}>{top.error}</div>}
          {top.data && top.data.length === 0 && (
            <div className="state-box">데이터 없음</div>
          )}
          {top.data && top.data.map(({ slackId, receiverName, count }, idx) => (
            <div
              key={slackId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: idx < top.data.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, minWidth: 24 }}>{RANK_ICONS[idx]}</span>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>@{receiverName || slackId}</span>
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--primary)',
                background: 'var(--primary-light)',
                padding: '2px 8px',
                borderRadius: 99,
              }}>
                {count}개
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 리액션 이력 테이블 */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>리액션 이력</div>
          {reactions.data && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              총 {reactions.data.length}건
            </span>
          )}
        </div>
        {reactions.loading && <div className="state-box">로딩 중...</div>}
        {reactions.error && <div className="state-box" style={{ color: '#DC2626' }}>{reactions.error}</div>}
        {reactions.data && <AldaTable reactions={reactions.data} />}
      </div>

    </div>
  );
}
