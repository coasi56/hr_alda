const EMOJI_LABEL = {
  '알다-칭찬':  { text: '칭찬',  bg: '#FEF3C7', color: '#92400E' },
  '알다-신뢰':  { text: '신뢰',  bg: '#DBEAFE', color: '#1E40AF' },
  '알다-주도성': { text: '주도성', bg: '#EDE9FE', color: '#5B21B6' },
  '알다-원팀':  { text: '원팀',  bg: '#D1FAE5', color: '#065F46' },
};

function formatKST(iso) {
  const kst = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return kst.toISOString().replace('T', ' ').slice(0, 16);
}

function EmojiBadge({ emoji }) {
  const cfg = EMOJI_LABEL[emoji] ?? { text: emoji, bg: '#F1F5F9', color: '#475569' };
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.text}
    </span>
  );
}

export default function AldaTable({ reactions = [] }) {
  if (reactions.length === 0) {
    return <div className="state-box">해당 기간에 리액션이 없어요 😊</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>이모지</th>
            <th>보낸 사람</th>
            <th>받은 사람</th>
            <th>채널</th>
            <th>시간 (KST)</th>
          </tr>
        </thead>
        <tbody>
          {reactions.map((r) => (
            <tr key={r.id}>
              <td><EmojiBadge emoji={r.emoji} /></td>
              <td style={{ color: 'var(--text-muted)' }}>@{r.giverName || r.fromSlackId}</td>
              <td style={{ fontWeight: 500 }}>@{r.receiverName || r.toSlackId}</td>
              <td style={{ color: 'var(--text-muted)' }}>#{r.channelName || r.channelId}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatKST(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}