import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const TABS = ['구성원 관리', '템플릿 설정', '캘린더', '공휴일 관리', '발송 이력'];

const cardStyle = {
  background: 'var(--white)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)',
  padding: '20px 24px',
  marginBottom: 20,
};

const btnStyle = (color = 'var(--primary)') => ({
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
});

const inputStyle = {
  background: 'var(--white)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  color: 'var(--text)',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 100,
  resize: 'vertical',
  fontFamily: 'inherit',
};

// ───────────────────────────────────────────
// 구성원 관리 탭
// ───────────────────────────────────────────
function MembersTab() {
  const [members, setMembers]   = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');

  const load = useCallback(async () => {
    const data = await api.get('/members');
    setMembers(data.members);
    setLastSync(data.lastSync);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setLoading(true); setMsg('');
    try {
      const res = await api.post('/members/sync');
      setMsg(res.message);
      await load();
    } catch (e) {
      setMsg('오류: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>구글 스프레드시트 연동</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            마지막 업데이트: {lastSync ? new Date(lastSync).toLocaleString('ko-KR') : '없음'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {msg && <span style={{ fontSize: 12, color: msg.startsWith('오류') ? '#e53e3e' : '#38a169' }}>{msg}</span>}
          <button style={btnStyle()} onClick={sync} disabled={loading}>
            {loading ? '불러오는 중...' : '🔄 불러오기'}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
          구성원 목록 ({members.length}명)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['이름', '부서', '생일', '입사일', 'Slack ID'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>구성원 없음</td></tr>
              ) : members.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{m.name}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{m.department || '-'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{m.birthday || '-'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    {m.hire_date ? new Date(m.hire_date).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{m.slack_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────
// 템플릿 설정 탭
// ───────────────────────────────────────────
function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings]   = useState({ send_channel: '', birthday_time: '10:00', anniversary_time: '10:00' });
  const [editing, setEditing]     = useState({});
  const [msg, setMsg]             = useState('');

  useEffect(() => {
    api.get('/birthday/templates').then(setTemplates);
    api.get('/birthday/settings').then(setSettings);
  }, []);

  const saveTemplate = async (t) => {
    try {
      await api.put(`/birthday/templates/${t.id}`, { content: editing[t.id] });
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, content: editing[t.id] } : x));
      setEditing(prev => { const n = { ...prev }; delete n[t.id]; return n; });
      setMsg('저장됐어요!');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('오류: ' + e.message);
    }
  };

  const saveSettings = async () => {
    try {
      await api.put('/birthday/settings', settings);
      setMsg('설정 저장됐어요!');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('오류: ' + e.message);
    }
  };

  const typeLabel    = { birthday: '🎂 생일', anniversary: '🎊 입사기념일' };
  const channelLabel = { public: '공개 채널', dm: 'DM (당사자)' };

  return (
    <div>
      {msg && (
        <div style={{ ...cardStyle, background: msg.startsWith('오류') ? '#fff0f0' : '#f0fff4', color: msg.startsWith('오류') ? '#e53e3e' : '#38a169', fontSize: 13, marginBottom: 16 }}>
          {msg}
        </div>
      )}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>발송 설정</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>발송 채널 ID</label>
            <input style={inputStyle} value={settings.send_channel || ''} onChange={e => setSettings(s => ({ ...s, send_channel: e.target.value }))} placeholder="예: C0779P92ZFS" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>생일 발송 시간 (KST)</label>
            <input style={inputStyle} type="time" value={settings.birthday_time || '10:00'} onChange={e => setSettings(s => ({ ...s, birthday_time: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>기념일 발송 시간 (KST)</label>
            <input style={inputStyle} type="time" value={settings.anniversary_time || '10:00'} onChange={e => setSettings(s => ({ ...s, anniversary_time: e.target.value }))} />
          </div>
        </div>
        <button style={btnStyle()} onClick={saveSettings}>저장</button>
      </div>

      {templates.map(t => (
        <div key={t.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{typeLabel[t.type] || t.type}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>— {channelLabel[t.channel] || t.channel}</span>
            </div>
            {editing[t.id] !== undefined ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btnStyle('#38a169')} onClick={() => saveTemplate(t)}>저장</button>
                <button style={btnStyle('#718096')} onClick={() => setEditing(prev => { const n = { ...prev }; delete n[t.id]; return n; })}>취소</button>
              </div>
            ) : (
              <button style={btnStyle('#718096')} onClick={() => setEditing(prev => ({ ...prev, [t.id]: t.content }))}>편집</button>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            사용 가능한 변수: {'{{이름}}'} {'{{연차}}'} {'{{부서}}'} {'{{생일}}'} {'{{입사일}}'}
          </div>
          {editing[t.id] !== undefined ? (
            <textarea style={textareaStyle} value={editing[t.id]} onChange={e => setEditing(prev => ({ ...prev, [t.id]: e.target.value }))} />
          ) : (
            <pre style={{ margin: 0, fontSize: 13, color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6 }}>{t.content}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────
// 캘린더 탭
// ───────────────────────────────────────────
function CalendarTab() {
  const [members, setMembers]   = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selected, setSelected] = useState(null);

  const today = new Date();
  const months = [
    new Date(today.getFullYear(), today.getMonth(), 1),
    new Date(today.getFullYear(), today.getMonth() + 1, 1),
  ];

  useEffect(() => {
    api.get('/members').then(d => setMembers(d.members));
    api.get(`/birthday/holidays?year=${today.getFullYear()}`).then(setHolidays);
  }, []);

  const buildEventMap = (year, month) => {
    const map = {};
    members.forEach(m => {
      if (m.birthday) {
        const [mm, dd] = m.birthday.split('-');
        if (parseInt(mm) - 1 === month) {
          const key = parseInt(dd);
          if (!map[key]) map[key] = [];
          map[key].push({ type: 'birthday', name: m.name });
        }
      }
      if (m.hire_date) {
        const hd = new Date(m.hire_date);
        if (hd.getMonth() === month) {
          const key = hd.getDate();
          if (!map[key]) map[key] = [];
          map[key].push({ type: 'anniversary', name: m.name, years: year - hd.getFullYear() });
        }
      }
    });
    return map;
  };

  const buildHolidayMap = (month) => {
    const map = {};
    holidays.forEach(h => {
      const d = new Date(h.date);
      if (d.getMonth() === month) map[d.getDate()] = h.name;
    });
    return map;
  };

  const buildWeeks = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let cells = Array(firstDay).fill(null);
    const weeks = [];
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
      if (cells.length === 7) { weeks.push(cells); cells = []; }
    }
    if (cells.length) weeks.push([...cells, ...Array(7 - cells.length).fill(null)]);
    return weeks;
  };

  const getCellBg = (events) => {
    if (!events || events.length === 0) return 'transparent';
    const hasBirthday    = events.some(e => e.type === 'birthday');
    const hasAnniversary = events.some(e => e.type === 'anniversary');
    if (hasBirthday && hasAnniversary) return '#FED7AA'; // 주황
    if (hasBirthday)    return '#FED7E2'; // 분홍
    if (hasAnniversary) return '#BEE3F8'; // 파랑
    return 'transparent';
  };

  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  const SingleCalendar = ({ date }) => {
    const year  = date.getFullYear();
    const month = date.getMonth();
    const eventMap   = buildEventMap(year, month);
    const holidayMap = buildHolidayMap(month);
    const weeks      = buildWeeks(year, month);

    return (
      <div style={{ flex: 1, background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '16px 20px' }}>
        {/* 월 헤더 */}
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', textAlign: 'center', marginBottom: 12 }}>
          {year}년 {month + 1}월
        </div>

        {/* 요일 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DAYS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0',
              color: i === 0 ? '#e53e3e' : i === 6 ? '#4299e1' : 'var(--text-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {week.map((day, di) => {
              const events    = day ? (eventMap[day] || []) : [];
              const isHoliday = day && holidayMap[day];
              const isToday   = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const cellBg    = day ? getCellBg(events) : 'transparent';
              const hasEvent  = events.length > 0;

              return (
                <div key={di}
                  onClick={() => hasEvent && setSelected({ day, month, year, events, holiday: holidayMap[day] })}
                  style={{
                    height: 36,
                    borderRadius: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: hasEvent ? 'pointer' : 'default',
                    background: isToday ? 'var(--primary)' : cellBg,
                    border: isToday ? 'none' : hasEvent ? '1px solid rgba(0,0,0,0.06)' : '1px solid transparent',
                    transition: 'opacity 0.1s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (hasEvent) e.currentTarget.style.opacity = '0.8'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {day && (
                    <span style={{
                      fontSize: 12,
                      fontWeight: isToday || hasEvent ? 700 : 400,
                      color: isToday ? '#fff' : isHoliday ? '#e53e3e' : di === 0 ? '#e53e3e' : di === 6 ? '#4299e1' : 'var(--text)',
                    }}>
                      {day}
                    </span>
                  )}
                  {isHoliday && !isToday && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#e53e3e', marginTop: 1 }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* 범례 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        {[['#FED7E2', '생일'], ['#BEE3F8', '입사기념일'], ['#FED7AA', '동일 날짜'], ['#e53e3e', '공휴일']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
            <span>{l}</span>
          </div>
        ))}
      </div>

      {/* 2개월 나란히 */}
      <div style={{ display: 'flex', gap: 16 }}>
        {months.map((m, i) => <SingleCalendar key={i} date={m} />)}
      </div>

      {/* 상세 팝업 */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 12, padding: 24, minWidth: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
              {selected.year}년 {selected.month + 1}월 {selected.day}일
            </div>
            {selected.holiday && (
              <div style={{ fontSize: 13, color: '#e53e3e', marginBottom: 12 }}>🏖️ {selected.holiday}</div>
            )}
            {selected.events.map((e, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                background: e.type === 'birthday' ? '#FFF5F7' : '#EBF8FF',
                borderLeft: `3px solid ${e.type === 'birthday' ? '#ed64a6' : '#4299e1'}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {e.type === 'birthday' ? '🎂 생일' : `🎊 입사 ${e.years}주년`}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{e.name}</div>
              </div>
            ))}
            <button style={{ ...btnStyle('#718096'), marginTop: 8, width: '100%' }} onClick={() => setSelected(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────
// 공휴일 관리 탭
// ───────────────────────────────────────────
function HolidaysTab() {
  const [holidays, setHolidays] = useState([]);
  const [year, setYear]         = useState(new Date().getFullYear());
  const [form, setForm]         = useState({ date: '', name: '' });
  const [msg, setMsg]           = useState('');

  const load = useCallback(async () => {
    const data = await api.get(`/birthday/holidays?year=${year}`);
    setHolidays(data);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.date || !form.name) return setMsg('날짜와 이름을 입력해주세요.');
    try {
      await api.post('/birthday/holidays', form);
      setForm({ date: '', name: '' });
      setMsg('추가됐어요!');
      setTimeout(() => setMsg(''), 2000);
      await load();
    } catch (e) {
      setMsg('오류: ' + e.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/birthday/holidays/${id}`);
      await load();
    } catch (e) {
      setMsg('오류: ' + e.message);
    }
  };

  return (
    <div>
      {msg && (
        <div style={{ ...cardStyle, background: msg.startsWith('오류') ? '#fff0f0' : '#f0fff4', color: msg.startsWith('오류') ? '#e53e3e' : '#38a169', fontSize: 13, marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* 추가 폼 */}
      <div style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>공휴일 추가</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>날짜</label>
            <input style={inputStyle} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>공휴일 이름</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 어린이날" />
          </div>
          <button style={btnStyle()} onClick={add}>추가</button>
        </div>
      </div>

      {/* 공휴일 목록 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{year}년 공휴일 목록</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle('#718096')} onClick={() => setYear(y => y - 1)}>◀ {year - 1}년</button>
            <button style={btnStyle('#718096')} onClick={() => setYear(y => y + 1)}>{year + 1}년 ▶</button>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['날짜', '이름', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>등록된 공휴일 없음</td></tr>
            ) : holidays.map(h => (
              <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{new Date(h.date).toLocaleDateString('ko-KR')}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text)' }}>{h.name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <button style={{ ...btnStyle('#e53e3e'), padding: '4px 10px', fontSize: 12 }} onClick={() => remove(h.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────
// 발송 이력 탭
// ───────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/birthday/logs').then(setLogs);
  }, []);

  const eventLabel = {
    birthday:       '🎂 생일 채널',
    birthday_dm:    '🎂 생일 DM',
    anniversary:    '🎊 기념일 채널',
    anniversary_dm: '🎊 기념일 DM',
  };

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>발송 이력</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['발송 일시', '이름', '이벤트', '채널', '상태'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>발송 이력 없음</td></tr>
          ) : logs.map(l => (
            <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{new Date(l.sent_at).toLocaleString('ko-KR')}</td>
              <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{l.target_name}</td>
              <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{eventLabel[l.event_type] || l.event_type}</td>
              <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{l.channel}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ color: l.status === 'success' ? '#38a169' : '#e53e3e', fontWeight: 600 }}>
                  {l.status === 'success' ? '✅ 성공' : '❌ 실패'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────────────────────────
// 메인 페이지
// ───────────────────────────────────────────
export default function BirthdayPage() {
  const [tab, setTab] = useState(0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>🎂 생일 · 입사기념일</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>구성원의 특별한 날을 자동으로 축하해요</p>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--white)', borderRadius: 10, padding: 4, width: 'fit-content', boxShadow: 'var(--shadow)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            background: tab === i ? 'var(--primary)' : 'transparent',
            color: tab === i ? '#fff' : 'var(--text-muted)',
            border: 'none', borderRadius: 8, padding: '7px 16px',
            fontSize: 13, fontWeight: tab === i ? 600 : 400, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      {tab === 0 && <MembersTab />}
      {tab === 1 && <TemplatesTab />}
      {tab === 2 && <CalendarTab />}
      {tab === 3 && <HolidaysTab />}
      {tab === 4 && <LogsTab />}
    </div>
  );
}