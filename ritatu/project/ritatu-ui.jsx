
// ─── RITATU — Design Tokens + Shared Components + Mock Data ───

const RC = {
  bg:      '#0A0A0E',
  surface: '#13131A',
  card:    '#1C1C28',
  cardHov: '#232334',
  border:  'rgba(255,255,255,0.07)',
  borderM: 'rgba(255,255,255,0.12)',
  orange:  '#FF6524',
  orangeA: 'rgba(255,101,36,0.14)',
  orangeB: 'rgba(255,101,36,0.30)',
  white:   '#EEEEF3',
  gray:    '#6A6A80',
  grayM:   '#A2A2BA',
  protein: '#FF6524',
  carbs:   '#F7A929',
  fat:     '#8A7EFA',
  green:   '#38C97C',
  red:     '#FF4F6B',
};
const RF = "'Space Grotesk', -apple-system, sans-serif";

// ─── Macro progress bar ─────────────────────────────────────
function RMacroBar({ label, current, goal, color, unit = 'g', bold }) {
  const pct = Math.min(goal > 0 ? (current / goal) * 100 : 0, 100);
  return (
    <div style={{ marginBottom: bold ? 12 : 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: RC.grayM, fontSize: bold ? 13 : 12, fontFamily: RF }}>{label}</span>
        <span style={{ color: RC.white, fontSize: bold ? 13 : 12, fontWeight: 600, fontFamily: RF }}>
          {current}<span style={{ color: RC.gray, fontWeight: 400 }}>/{goal}{unit}</span>
        </span>
      </div>
      <div style={{ height: bold ? 6 : 4, borderRadius: 3, background: RC.border, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ─── Primary / ghost button ─────────────────────────────────
function RPrimaryButton({ children, onClick, style, variant = 'primary', disabled, small }) {
  const [active, setActive] = React.useState(false);
  const bg = variant === 'primary'
    ? (disabled ? RC.gray : active ? '#E55218' : RC.orange)
    : variant === 'ghost' ? 'transparent'
    : RC.orangeA;
  const col = variant === 'ghost' ? RC.orange : RC.white;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      onMouseLeave={() => setActive(false)}
      style={{
        height: small ? 40 : 52, borderRadius: small ? 10 : 14,
        border: variant === 'ghost' ? `1.5px solid ${RC.orange}` : 'none',
        background: bg, color: col, fontFamily: RF,
        fontSize: small ? 13 : 15, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
        transform: active ? 'scale(0.97)' : 'scale(1)',
        transition: 'all 0.15s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        ...style,
      }}>{children}</button>
  );
}

// ─── Bottom navigation ──────────────────────────────────────
function RBottomNav({ tab, setTab }) {
  const tabs = [
    {
      id: 'diary', label: 'Dziennik',
      svg: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round">
          <rect x="4" y="3" width="16" height="18" rx="3"/>
          <path d="M8 8h8M8 12h8M8 16h5"/>
        </svg>
      ),
    },
    {
      id: 'measurements', label: 'Pomiary',
      svg: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17.5L9 11.5 12.5 14.5 17 8.5 21 5.5"/>
          <path d="M4 21h16"/>
        </svg>
      ),
    },
  ];
  return (
    <div style={{ height: 64, background: RC.surface, borderTop: `1px solid ${RC.border}`, display: 'flex', flexShrink: 0 }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            color: active ? RC.orange : RC.gray, transition: 'color 0.2s',
          }}>
            {t.svg(active)}
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, fontFamily: RF }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Slide-up sheet ─────────────────────────────────────────
function RSheet({ visible, onClose, children, height = '90%', title, zBase = 10 }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
        zIndex: zBase,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height,
        background: RC.surface,
        borderRadius: '22px 22px 0 0',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        zIndex: zBase + 1,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: `1px solid ${RC.border}`,
        borderBottom: 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: RC.borderM }} />
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 14px', flexShrink: 0 }}>
            <span style={{ color: RC.white, fontSize: 18, fontWeight: 700, fontFamily: RF }}>{title}</span>
            <button onClick={onClose} style={{ background: RC.card, border: 'none', cursor: 'pointer', color: RC.grayM, padding: 6, borderRadius: 8, display: 'flex' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </>
  );
}

// ─── Food item row ──────────────────────────────────────────
function RFoodItem({ name, amount, unit, calories, onRemove, onTap }) {
  return (
    <div onClick={onTap} style={{
      display: 'flex', alignItems: 'center', padding: '10px 16px',
      borderBottom: `1px solid ${RC.border}`, gap: 12,
      cursor: onTap ? 'pointer' : 'default',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: RC.white, fontSize: 13, fontWeight: 500, fontFamily: RF }}>{name}</div>
        <div style={{ color: RC.gray, fontSize: 11, fontFamily: RF, marginTop: 2 }}>{amount}{unit}</div>
      </div>
      <span style={{ color: RC.grayM, fontSize: 13, fontWeight: 600, fontFamily: RF }}>{calories} kcal</span>
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: RC.gray, padding: '2px 4px', opacity: 0.7, display: 'flex',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      )}
    </div>
  );
}

// ─── Mock data ──────────────────────────────────────────────
const MOCK_MEALS_INIT = {
  'Śniadanie': [
    { id: 1, name: 'Płatki owsiane', amount: 80, unit: 'g', calories: 308, protein: 10.7, carbs: 51.0, fat: 6.1 },
    { id: 2, name: 'Banan', amount: 1, unit: ' szt', calories: 89, protein: 1.1, carbs: 23.0, fat: 0.3 },
    { id: 3, name: 'Kawa z mlekiem', amount: 200, unit: 'ml', calories: 47, protein: 2.5, carbs: 4.2, fat: 1.8 },
  ],
  'Obiad': [],
  'Kolacja': [],
  'Przekąska': [
    { id: 4, name: 'Jabłko', amount: 1, unit: ' szt', calories: 72, protein: 0.4, carbs: 19.0, fat: 0.2 },
  ],
};

const FOOD_DB = [
  { id: 10, name: 'Kurczak, pierś', detail: '100 g', calories: 165, protein: 31.0, carbs: 0,    fat: 3.6,  per100: true  },
  { id: 11, name: 'Ryż biały, gotowany', detail: '100 g', calories: 130, protein: 2.7,  carbs: 28.0, fat: 0.3,  per100: true  },
  { id: 12, name: 'Brokuł',              detail: '100 g', calories: 34,  protein: 2.8,  carbs: 6.6,  fat: 0.4,  per100: true  },
  { id: 13, name: 'Jajko kurze',         detail: '1 szt', calories: 77,  protein: 6.5,  carbs: 0.6,  fat: 5.3,  per100: false },
  { id: 14, name: 'Twaróg chudy',        detail: '100 g', calories: 98,  protein: 17.4, carbs: 3.1,  fat: 1.0,  per100: true  },
  { id: 15, name: 'Ziemniaki, gotowane', detail: '100 g', calories: 87,  protein: 1.9,  carbs: 20.0, fat: 0.1,  per100: true  },
  { id: 16, name: 'Łosoś, filet',        detail: '100 g', calories: 208, protein: 20.4, carbs: 0,    fat: 13.6, per100: true  },
  { id: 17, name: 'Jogurt naturalny',    detail: '100 g', calories: 61,  protein: 3.5,  carbs: 4.7,  fat: 3.3,  per100: true  },
  { id: 18, name: 'Chleb żytni',         detail: '1 kromka (40g)', calories: 88, protein: 3.1, carbs: 17.2, fat: 0.8, per100: false },
  { id: 19, name: 'Migdały',             detail: '100 g', calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9, per100: true  },
];

const WEIGHT_HISTORY_INIT = [
  { date: '01.05', w: 84.2 }, { date: '05.05', w: 83.8 }, { date: '08.05', w: 83.5 },
  { date: '12.05', w: 83.1 }, { date: '15.05', w: 82.8 }, { date: '19.05', w: 82.5 },
  { date: '22.05', w: 82.1 }, { date: '24.05', w: 81.9 },
];

Object.assign(window, {
  RC, RF,
  RMacroBar, RPrimaryButton, RBottomNav, RSheet, RFoodItem,
  MOCK_MEALS_INIT, FOOD_DB, WEIGHT_HISTORY_INIT,
});
