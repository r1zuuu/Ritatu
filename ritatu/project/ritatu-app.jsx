
// ─── RITATU — All Screens + App Root ────────────────────────
// Depends on window globals from ritatu-ui.jsx

const { useState, useEffect, useRef, useMemo } = React;

function computeTotals(meals) {
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  Object.values(meals).forEach(items =>
    items.forEach(f => { kcal += f.calories; protein += f.protein; carbs += f.carbs; fat += f.fat; })
  );
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

// ═══════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════
function LoginScreen({ visible, onLogin }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: RC.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'space-between', padding: '40px 28px 28px',
      opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 0.4s ease', zIndex: visible ? 2 : 0,
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
        {/* Logo mark */}
        <div style={{
          width: 76, height: 76, borderRadius: 26,
          background: `linear-gradient(145deg, ${RC.orangeB}, ${RC.orangeA})`,
          border: `1.5px solid ${RC.orangeB}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
        }}>
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <path d="M19 5 C12 5 7 11 7 18 C7 25 12 31 19 33 C26 31 31 25 31 18 C31 11 26 5 19 5Z"
              stroke={RC.orange} strokeWidth="2" fill="none"/>
            <path d="M19 11 L19 27 M13 17 L25 17" stroke={RC.orange} strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="19" cy="18" r="4" fill={RC.orange} opacity="0.25"/>
          </svg>
        </div>
        <div style={{ color: RC.orange, fontSize: 30, fontWeight: 800, fontFamily: RF, letterSpacing: 1 }}>RITATU</div>
        <div style={{ color: RC.gray, fontSize: 14, fontFamily: RF }}>twój dziennik żywieniowy</div>


      </div>

      {/* Actions */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onLogin} style={{
          height: 54, borderRadius: 14, background: '#ffffff', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          fontFamily: RF, fontSize: 15, fontWeight: 700, color: '#1a1a2a',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)', transition: 'transform 0.15s',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M19.6 10.2c0-.7-.1-1.3-.2-1.9H10v3.6h5.4a4.6 4.6 0 01-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.3 1-2.6 0-4.7-1.7-5.5-4H1.2v2.6A10 10 0 0010 20z" fill="#34A853"/>
            <path d="M4.5 12a5.9 5.9 0 010-4V5.4H1.2A10 10 0 000 10c0 1.6.4 3.1 1.2 4.4L4.5 12z" fill="#FBBC04"/>
            <path d="M10 4c1.5 0 2.8.5 3.7 1.5l2.8-2.8C14.8 1 12.6 0 10 0A10 10 0 001.2 5.6L4.5 8C5.3 5.7 7.5 4 10 4z" fill="#EA4335"/>
          </svg>
          Kontynuuj z Google
        </button>
        <p style={{ color: RC.gray, fontSize: 11, fontFamily: RF, textAlign: 'center', lineHeight: 1.6 }}>
          Rejestrując się, akceptujesz <span style={{ color: RC.grayM }}>Warunki korzystania</span>
          {' '}i <span style={{ color: RC.grayM }}>Politykę prywatności</span>
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ONBOARDING SCREEN
// ═══════════════════════════════════════════════════════════
function OnboardingScreen({ visible, onDone }) {
  const [step, setStep] = useState(0);
  const [vals, setVals] = useState({ weight: 83.0, height: 178, age: 27, goal: 'lose' });
  const steps = [
    { field: 'weight', title: 'Ile ważysz?', sub: 'Podaj swoją aktualną wagę', unit: 'kg', min: 30, max: 250, step: 0.5, icon: '⚖️' },
    { field: 'height', title: 'Jaki masz wzrost?', sub: 'Potrzebujemy tego do obliczenia Twojego BMI', unit: 'cm', min: 130, max: 230, step: 1, icon: '📏' },
    { field: 'age',    title: 'Ile masz lat?', sub: 'Wiek wpływa na Twoje zapotrzebowanie', unit: 'lat', min: 10, max: 100, step: 1, icon: '🎂' },
    { field: 'goal',   title: 'Jaki jest Twój cel?', sub: 'Dopasujemy Twój plan na tej podstawie', icon: '🎯' },
  ];
  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const isGoal = cur.field === 'goal';
  const goals = [
    { id: 'lose',     label: 'Schudnę',       sub: 'Deficyt kaloryczny',  icon: '📉' },
    { id: 'maintain', label: 'Utrzymam wagę', sub: 'Bilans kaloryczny',   icon: '⚖️' },
    { id: 'gain',     label: 'Przytyję',       sub: 'Nadwyżka kaloryczna', icon: '💪' },
  ];
  const adj = (delta) => setVals(v => ({
    ...v, [cur.field]: Math.min(cur.max, Math.max(cur.min, parseFloat((v[cur.field] + delta).toFixed(1))))
  }));

  return (
    <div style={{
      position: 'absolute', inset: 0, background: RC.bg,
      opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 0.4s ease', zIndex: visible ? 2 : 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Progress header */}
      <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        {step > 0
          ? <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: RC.grayM, padding: 4, display: 'flex' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 19L8 12l7-7"/></svg>
            </button>
          : <div style={{ width: 30 }} />
        }
        <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'center' }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height: 5, borderRadius: 3, background: i <= step ? RC.orange : RC.border,
              width: i === step ? 22 : 6, transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
        <div style={{ width: 30, textAlign: 'right' }}>
          <span style={{ color: RC.gray, fontSize: 11, fontFamily: RF }}>{step + 1}/{steps.length}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 24px 0', overflow: 'hidden' }}>
        <div style={{ fontSize: 42, marginBottom: 14, lineHeight: 1 }}>{cur.icon}</div>
        <div style={{ color: RC.white, fontSize: 26, fontWeight: 800, fontFamily: RF, marginBottom: 6, lineHeight: 1.2 }}>{cur.title}</div>
        <div style={{ color: RC.gray, fontSize: 14, fontFamily: RF, marginBottom: 36 }}>{cur.sub}</div>

        {!isGoal ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 72, fontWeight: 800, color: RC.white, fontFamily: RF, letterSpacing: -2, lineHeight: 1 }}>
                {vals[cur.field]}
              </span>
              <span style={{ fontSize: 22, color: RC.gray, fontWeight: 500, fontFamily: RF, marginLeft: 8 }}>{cur.unit}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <button onClick={() => adj(-cur.step)} style={{
                width: 60, height: 60, borderRadius: 18, background: RC.card,
                border: `1px solid ${RC.border}`, color: RC.white, fontSize: 28,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: RF, fontWeight: 300,
              }}>−</button>
              <div style={{ width: 1, height: 60, background: RC.border }} />
              <button onClick={() => adj(cur.step)} style={{
                width: 60, height: 60, borderRadius: 18, background: RC.orange,
                border: 'none', color: RC.white, fontSize: 28,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>+</button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            {goals.map(g => (
              <button key={g.id} onClick={() => setVals(v => ({ ...v, goal: g.id }))} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                borderRadius: 18, border: `1.5px solid ${vals.goal === g.id ? RC.orange : RC.border}`,
                background: vals.goal === g.id ? RC.orangeA : RC.card,
                cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left',
              }}>
                <span style={{ fontSize: 26 }}>{g.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: RC.white, fontSize: 15, fontWeight: 700, fontFamily: RF }}>{g.label}</div>
                  <div style={{ color: RC.gray, fontSize: 12, fontFamily: RF, marginTop: 2 }}>{g.sub}</div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${vals.goal === g.id ? RC.orange : RC.border}`,
                  background: vals.goal === g.id ? RC.orange : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {vals.goal === g.id && <div style={{ width: 7, height: 7, borderRadius: '50%', background: RC.white }} />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 24px 24px', flexShrink: 0 }}>
        <RPrimaryButton onClick={() => isLast ? onDone(vals) : setStep(s => s + 1)} style={{ width: '100%' }}>
          {isLast ? '🚀  Zaczynamy!' : 'Dalej'}
        </RPrimaryButton>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// WEIGHT CHART (SVG)
// ═══════════════════════════════════════════════════════════
function WeightChart({ data }) {
  const W = 340, H = 120, P = { t: 14, b: 26, l: 28, r: 12 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const ws = data.map(d => d.w);
  const wmin = Math.min(...ws) - 0.6, wmax = Math.max(...ws) + 0.6;
  const range = wmax - wmin;
  const tx = (i) => P.l + (i / (data.length - 1)) * iW;
  const ty = (w) => P.t + iH - ((w - wmin) / range) * iH;
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${tx(i).toFixed(1)} ${ty(d.w).toFixed(1)}`).join(' ');
  const area = `${line} L ${tx(data.length - 1).toFixed(1)} ${(P.t + iH).toFixed(1)} L ${P.l} ${(P.t + iH).toFixed(1)} Z`;
  const last = data[data.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={RC.orange} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={RC.orange} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.33, 0.66, 1].map((f, i) => (
        <line key={i} x1={P.l} y1={P.t + iH * f} x2={W - P.r} y2={P.t + iH * f}
          stroke={RC.border} strokeWidth="1"/>
      ))}
      <path d={area} fill="url(#wg)"/>
      <path d={line} fill="none" stroke={RC.orange} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d, i) => (
        <circle key={i} cx={tx(i)} cy={ty(d.w)} r={i === data.length - 1 ? 5 : 3}
          fill={i === data.length - 1 ? RC.orange : RC.surface}
          stroke={RC.orange} strokeWidth="2"/>
      ))}
      {data.filter((_, i) => i === 0 || i === data.length - 1 || (i % 2 === 0)).map((d, _, arr) => {
        const orig = data.indexOf(d);
        return (
          <text key={orig} x={tx(orig)} y={H - 4} textAnchor="middle"
            fill={RC.gray} fontSize="9" fontFamily={RF}>{d.date}</text>
        );
      })}
      <text x={tx(data.length - 1) - 6} y={ty(last.w) - 10}
        textAnchor="end" fill={RC.orange} fontSize="11" fontWeight="700" fontFamily={RF}>
        {last.w} kg
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// DIARY VIEW
// ═══════════════════════════════════════════════════════════
function DiaryView({ visible, meals, setMeals, variant, onAddFood }) {
  const [dateOff, setDateOff] = useState(0);
  const totals = computeTotals(meals);
  const GOAL = { kcal: 2200, protein: 150, carbs: 270, fat: 73 };
  const remaining = GOAL.kcal - totals.kcal;
  const pctKcal = Math.min((totals.kcal / GOAL.kcal) * 100, 100);
  const DATES = ['22 maj', '23 maj', 'Dziś'];
  const dateLabel = DATES[Math.max(0, Math.min(2, 2 + dateOff))];
  const MEAL_DOT = { 'Śniadanie': RC.carbs, 'Obiad': RC.orange, 'Kolacja': RC.fat, 'Przekąska': RC.green };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: RC.bg,
      opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 0.35s ease', display: 'flex', flexDirection: 'column',
    }}>
      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 4px', flexShrink: 0 }}>
        <button onClick={() => setDateOff(d => Math.max(-2, d - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dateOff === -2 ? RC.border : RC.gray, padding: 6, display: 'flex' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 19L8 12l7-7"/></svg>
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: RC.white, fontSize: 16, fontWeight: 700, fontFamily: RF }}>{dateLabel}</div>
          <div style={{ color: RC.gray, fontSize: 10, fontFamily: RF }}>24 maja 2026</div>
        </div>
        <button onClick={() => setDateOff(d => Math.min(0, d + 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: dateOff === 0 ? RC.border : RC.gray, padding: 6, display: 'flex' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 14px 14px' }}>

        {/* ── Variant A: Compact summary ── */}
        {variant === 'A' && (
          <div style={{ background: RC.card, borderRadius: 20, padding: '14px 16px', border: `1px solid ${RC.border}`, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ color: RC.gray, fontSize: 11, fontFamily: RF, marginBottom: 3 }}>Spożyte</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: RC.orange, fontFamily: RF, lineHeight: 1 }}>{totals.kcal}</span>
                  <span style={{ color: RC.gray, fontSize: 13, fontFamily: RF }}>kcal</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: RC.gray, fontSize: 11, fontFamily: RF, marginBottom: 3 }}>Pozostało</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: remaining >= 0 ? RC.white : RC.red, fontFamily: RF, lineHeight: 1 }}>{Math.abs(remaining)}</span>
                  <span style={{ color: RC.gray, fontSize: 12, fontFamily: RF }}>{remaining < 0 ? 'kcal za dużo' : 'kcal'}</span>
                </div>
              </div>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: RC.border, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ width: `${pctKcal}%`, height: '100%', background: pctKcal > 95 ? RC.red : RC.orange, borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
            <RMacroBar label="Białko" current={totals.protein} goal={GOAL.protein} color={RC.protein} />
            <RMacroBar label="Węglowodany" current={totals.carbs} goal={GOAL.carbs} color={RC.carbs} />
            <div style={{ marginBottom: 0 }}>
              <RMacroBar label="Tłuszcze" current={totals.fat} goal={GOAL.fat} color={RC.fat} />
            </div>
          </div>
        )}

        {/* ── Variant B: Bold summary ── */}
        {variant === 'B' && (
          <div style={{ background: RC.card, borderRadius: 20, padding: '18px 18px 16px', border: `1px solid ${RC.border}`, marginBottom: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: RC.gray, fontSize: 12, fontFamily: RF, marginBottom: 4 }}>Kalorie</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: RC.white, fontFamily: RF, lineHeight: 1, letterSpacing: -2 }}>{totals.kcal}</span>
                <div style={{ paddingBottom: 6 }}>
                  <div style={{ color: RC.gray, fontSize: 12, fontFamily: RF }}>z {GOAL.kcal} kcal</div>
                  <div style={{ color: remaining >= 0 ? RC.green : RC.red, fontSize: 13, fontWeight: 700, fontFamily: RF }}>
                    {remaining >= 0 ? `−${remaining} pozostało` : `+${Math.abs(remaining)} za dużo`}
                  </div>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: RC.border, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ width: `${pctKcal}%`, height: '100%', background: `linear-gradient(90deg, ${RC.orange}, #FFB340)`, borderRadius: 3, transition: 'width 0.5s ease' }} />
              </div>
            </div>
            <RMacroBar label="Białko" current={totals.protein} goal={GOAL.protein} color={RC.protein} bold />
            <RMacroBar label="Węglowodany" current={totals.carbs} goal={GOAL.carbs} color={RC.carbs} bold />
            <div style={{ marginBottom: 0 }}>
              <RMacroBar label="Tłuszcze" current={totals.fat} goal={GOAL.fat} color={RC.fat} bold />
            </div>
          </div>
        )}

        {/* Meal sections — timeline */}
        <div style={{ paddingLeft: 4 }}>
          {Object.entries(meals).map(([mealName, foods], idx, arr) => {
            const mealKcal = foods.reduce((s, f) => s + f.calories, 0);
            const dot = MEAL_DOT[mealName];
            const nextDot = idx < arr.length - 1 ? MEAL_DOT[arr[idx + 1][0]] : null;
            const isLast = idx === arr.length - 1;
            return (
              <div key={mealName} style={{ display: 'flex', gap: 14 }}>
                {/* Spine */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
                  <div style={{
                    width: 13, height: 13, borderRadius: '50%', background: dot, marginTop: 5, flexShrink: 0,
                    boxShadow: `0 0 10px ${dot}88`,
                  }} />
                  {!isLast && (
                    <div style={{
                      flex: 1, width: 2, minHeight: 28, marginTop: 5,
                      background: `linear-gradient(to bottom, ${dot}55, ${nextDot}33)`,
                      borderRadius: 1,
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: isLast ? 6 : 22 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: RC.white, fontSize: 14, fontWeight: 700, fontFamily: RF }}>{mealName}</span>
                      {mealKcal > 0 && (
                        <span style={{
                          background: dot + '22', color: dot,
                          fontSize: 11, fontWeight: 700, fontFamily: RF,
                          padding: '2px 8px', borderRadius: 20,
                        }}>{mealKcal} kcal</span>
                      )}
                    </div>
                    <button onClick={() => onAddFood(mealName)} style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: RC.orangeA, border: `1px solid ${RC.orangeB}`,
                      color: RC.orange, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, padding: 0, lineHeight: 1,
                    }}>+</button>
                  </div>

                  {/* Food items */}
                  {foods.length > 0 && (
                    <div style={{ background: RC.card, borderRadius: 14, border: `1px solid ${RC.border}`, overflow: 'hidden' }}>
                      {foods.map(food => (
                        <RFoodItem key={food.id} {...food}
                          onRemove={() => setMeals(prev => ({ ...prev, [mealName]: prev[mealName].filter(f => f.id !== food.id) }))}
                        />
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {foods.length === 0 && (
                    <div onClick={() => onAddFood(mealName)} style={{
                      padding: '9px 13px', color: RC.gray, fontSize: 12, fontFamily: RF,
                      background: RC.card, borderRadius: 12,
                      border: `1.5px dashed ${RC.border}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                      transition: 'border-color 0.2s',
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Dodaj produkt
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADD FOOD SHEET
// ═══════════════════════════════════════════════════════════
function AddFoodSheet({ visible, meal, onClose, onSelectFood, customProducts = [], onOpenCreateCustom }) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [showBarcode, setShowBarcode] = useState(false);
  const inputRef = useRef(null);
  const tabs = ['search', 'recent', 'favorites', 'custom'];
  const tabLabels = { search: 'Szukaj', recent: 'Ostatnie', favorites: 'Ulubione', custom: 'Własne' };

  useEffect(() => { if (visible && inputRef.current) setTimeout(() => inputRef.current?.focus(), 400); }, [visible]);

  const filtered = query.length >= 1
    ? FOOD_DB.filter(f => f.name.toLowerCase().includes(query.toLowerCase()))
    : FOOD_DB;

  const recentFoods = FOOD_DB.slice(0, 4);
  const listData = activeTab === 'search' ? filtered
                 : activeTab === 'recent' ? recentFoods
                 : activeTab === 'custom' ? customProducts
                 : [];

  return (
    <RSheet visible={visible} onClose={onClose} title={`Dodaj do: ${meal}`} height="92%">
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 12, flexShrink: 0 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RC.gray} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj produktu..."
            style={{
              width: '100%', height: 44, borderRadius: 12, background: RC.card,
              border: `1px solid ${RC.border}`, color: RC.white, fontFamily: RF, fontSize: 14,
              padding: '0 44px 0 38px', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button onClick={() => setShowBarcode(v => !v)} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: showBarcode ? RC.orangeA : 'none', border: 'none', cursor: 'pointer',
            color: showBarcode ? RC.orange : RC.gray, padding: 6, borderRadius: 8, display: 'flex',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
              <path d="M7 8v8M12 8v8M17 8v8"/>
            </svg>
          </button>
        </div>

        {/* Barcode placeholder */}
        {showBarcode && (
          <div style={{ background: RC.card, borderRadius: 16, height: 140, marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: `1px dashed ${RC.orange}`, flexShrink: 0 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke={RC.orange} strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 14V8h6M34 8h6v6M8 34v6h6M34 42h6v-6"/>
              <path d="M14 14v20M20 14v20M26 14v20M32 14v20"/>
            </svg>
            <span style={{ color: RC.orange, fontSize: 12, fontFamily: RF }}>Skieruj aparat na kod kreskowy</span>
            <span style={{ color: RC.gray, fontSize: 10, fontFamily: 'monospace', opacity: 0.5 }}>[camera viewfinder]</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              flex: 1, height: 32, borderRadius: 8,
              background: activeTab === t ? RC.orange : RC.card,
              border: `1px solid ${activeTab === t ? RC.orange : RC.border}`,
              color: activeTab === t ? RC.white : RC.gray,
              fontFamily: RF, fontSize: 11, fontWeight: activeTab === t ? 700 : 400, cursor: 'pointer',
            }}>{tabLabels[t]}</button>
          ))}
        </div>

        {/* Food list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Create custom button — only on "Własne" tab */}
          {activeTab === 'custom' && (
            <button onClick={onOpenCreateCustom} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px',
              background: RC.orangeA, border: `1.5px dashed ${RC.orangeB}`,
              borderRadius: 14, cursor: 'pointer', marginBottom: 10, width: '100%',
              color: RC.orange, fontFamily: RF, fontSize: 13, fontWeight: 700,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: RC.orangeB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={RC.orange} strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              Stwórz własny produkt
            </button>
          )}

          <div style={{ borderRadius: 14, background: RC.card, border: `1px solid ${RC.border}`, overflow: 'hidden', flex: 1 }}>
          {listData.length > 0 ? listData.map(food => (
            <div key={food.id} onClick={() => onSelectFood(food)} style={{
              display: 'flex', alignItems: 'center', padding: '12px 14px',
              borderBottom: `1px solid ${RC.border}`, cursor: 'pointer', gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: RC.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: food.custom ? RC.orange : RC.fat, opacity: 0.5 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: RC.white, fontSize: 13, fontWeight: 600, fontFamily: RF, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{food.name}</div>
                <div style={{ color: RC.gray, fontSize: 11, fontFamily: RF, marginTop: 1 }}>{food.detail} · {food.calories} kcal</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RC.gray} strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </div>
          )) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, gap: 8 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={RC.gray} strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span style={{ color: RC.gray, fontSize: 13, fontFamily: RF }}>
                {activeTab === 'favorites' ? 'Brak ulubionych' : activeTab === 'custom' ? 'Brak własnych produktów' : 'Brak wyników'}
              </span>
            </div>
          )}
          </div>
        </div>
      </div>
    </RSheet>
  );
}

// ═══════════════════════════════════════════════════════════
// CREATE CUSTOM PRODUCT SHEET
// ═══════════════════════════════════════════════════════════
function CreateCustomSheet({ visible, onClose, onSave }) {
  const emptyForm = { name: '', calories: '', protein: '', carbs: '', fat: '' };
  const [form, setForm] = useState(emptyForm);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0 && form.calories !== '';

  const handleSave = () => {
    onSave({
      id: Date.now(),
      name: form.name.trim(),
      detail: '1 porcja',
      calories: parseFloat(form.calories) || 0,
      protein:  parseFloat(form.protein)  || 0,
      carbs:    parseFloat(form.carbs)    || 0,
      fat:      parseFloat(form.fat)      || 0,
      per100: false,
      custom: true,
    });
    setForm(emptyForm);
  };

  const macros = [
    { key: 'protein', label: 'Białko',     color: RC.protein },
    { key: 'carbs',   label: 'Węglowodany', color: RC.carbs   },
    { key: 'fat',     label: 'Tłuszcze',   color: RC.fat     },
  ];

  const fieldStyle = {
    width: '100%', height: 48, borderRadius: 12,
    background: RC.card, border: `1px solid ${RC.border}`,
    color: RC.white, fontFamily: RF, fontSize: 14,
    padding: '0 14px', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <RSheet visible={visible} onClose={onClose} title="Nowy produkt" height="88%" zBase={28}>
      <div style={{ padding: '0 20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Name */}
        <div>
          <label style={{ color: RC.grayM, fontSize: 12, fontFamily: RF, display: 'block', marginBottom: 7 }}>
            Nazwa produktu <span style={{ color: RC.orange }}>*</span>
          </label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="np. Koktajl proteinowy własny"
            style={fieldStyle}
          />
        </div>

        {/* Calories — hero input */}
        <div style={{ background: RC.card, borderRadius: 18, padding: '16px', border: `1px solid ${RC.border}` }}>
          <div style={{ color: RC.gray, fontSize: 11, fontFamily: RF, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Wartość energetyczna
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="number" inputMode="decimal"
              value={form.calories}
              onChange={e => set('calories', e.target.value)}
              placeholder="0"
              style={{
                flex: 1, height: 58, borderRadius: 14,
                background: RC.surface, border: `1px solid ${RC.border}`,
                color: RC.orange, fontFamily: RF, fontSize: 36, fontWeight: 800,
                textAlign: 'center', outline: 'none', padding: 0,
              }}
            />
            <span style={{ color: RC.gray, fontSize: 16, fontFamily: RF, fontWeight: 600 }}>kcal</span>
          </div>
        </div>

        {/* Macros grid */}
        <div>
          <div style={{ color: RC.gray, fontSize: 11, fontFamily: RF, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Makroskładniki (na porcję)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {macros.map(m => (
              <div key={m.key} style={{
                background: RC.card, borderRadius: 16, padding: '14px 10px',
                border: `1px solid ${RC.border}`, textAlign: 'center',
              }}>
                <div style={{ width: 24, height: 3, background: m.color, borderRadius: 2, margin: '0 auto 10px' }} />
                <input
                  type="number" inputMode="decimal"
                  value={form[m.key]}
                  onChange={e => set(m.key, e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%', height: 40, borderRadius: 10,
                    background: RC.surface, border: `1px solid ${RC.border}`,
                    color: RC.white, fontFamily: RF, fontSize: 20, fontWeight: 700,
                    textAlign: 'center', outline: 'none', padding: 0,
                  }}
                />
                <div style={{ color: RC.grayM, fontSize: 10, fontFamily: RF, marginTop: 7 }}>
                  {m.label} (g)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview badge */}
        {valid && (
          <div style={{
            background: RC.orangeA, border: `1px solid ${RC.orangeB}`,
            borderRadius: 12, padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: RC.white, fontSize: 13, fontWeight: 600, fontFamily: RF }}>{form.name}</span>
            <span style={{ color: RC.orange, fontSize: 13, fontWeight: 700, fontFamily: RF }}>
              {form.calories} kcal
            </span>
          </div>
        )}

        <RPrimaryButton onClick={handleSave} disabled={!valid} style={{ width: '100%' }}>
          Zapisz produkt
        </RPrimaryButton>
      </div>
    </RSheet>
  );
}

// ═══════════════════════════════════════════════════════════
// FOOD DETAIL SHEET
// ═══════════════════════════════════════════════════════════
function FoodDetailSheet({ visible, food, meal, onClose, onAdd }) {
  const [amount, setAmount] = useState(100);
  useEffect(() => { if (food) setAmount(food.per100 ? 100 : 1); }, [food]);
  if (!food) return null;
  const mult = food.per100 ? amount / 100 : 1;
  const calc = (v) => Math.round(v * mult * 10) / 10;
  const kcal = Math.round(food.calories * mult);
  const MACROS = [
    { label: 'Białko', val: calc(food.protein), color: RC.protein, unit: 'g' },
    { label: 'Węgle', val: calc(food.carbs),   color: RC.carbs,   unit: 'g' },
    { label: 'Tłuszcze', val: calc(food.fat),  color: RC.fat,     unit: 'g' },
  ];
  return (
    <RSheet visible={visible} onClose={onClose} height="72%" zBase={22}>
      <div style={{ padding: '0 20px 24px' }}>
        {/* Product header */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: RC.card, border: `1px solid ${RC.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: RC.orange, opacity: 0.4 }} />
          </div>
          <div>
            <div style={{ color: RC.white, fontSize: 16, fontWeight: 700, fontFamily: RF, lineHeight: 1.3 }}>{food.name}</div>
            <div style={{ color: RC.gray, fontSize: 12, fontFamily: RF, marginTop: 3 }}>Dodajesz do: <span style={{ color: RC.orange }}>{meal}</span></div>
          </div>
        </div>

        {/* Calories big */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52, fontWeight: 800, color: RC.orange, fontFamily: RF, lineHeight: 1 }}>{kcal}</div>
          <div style={{ color: RC.gray, fontSize: 13, fontFamily: RF }}>kcal</div>
        </div>

        {/* Macro pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {MACROS.map(m => (
            <div key={m.label} style={{ flex: 1, background: RC.card, borderRadius: 12, padding: '10px 8px', border: `1px solid ${RC.border}`, textAlign: 'center' }}>
              <div style={{ width: 20, height: 3, borderRadius: 2, background: m.color, margin: '0 auto 6px' }} />
              <div style={{ color: RC.white, fontSize: 14, fontWeight: 700, fontFamily: RF }}>{m.val}{m.unit}</div>
              <div style={{ color: RC.gray, fontSize: 10, fontFamily: RF, marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Amount control */}
        <div style={{ background: RC.card, borderRadius: 14, padding: '14px 16px', border: `1px solid ${RC.border}`, marginBottom: 20 }}>
          <div style={{ color: RC.grayM, fontSize: 12, fontFamily: RF, marginBottom: 8 }}>
            {food.per100 ? 'Ilość (gramy)' : 'Liczba porcji'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setAmount(a => Math.max(food.per100 ? 10 : 1, a - (food.per100 ? 10 : 1)))} style={{
              width: 36, height: 36, borderRadius: 10, background: RC.surface, border: `1px solid ${RC.border}`,
              color: RC.white, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>−</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: RC.white, fontFamily: RF }}>{amount}</span>
              <span style={{ color: RC.gray, fontSize: 13, fontFamily: RF, marginLeft: 5 }}>{food.per100 ? 'g' : 'szt'}</span>
            </div>
            <button onClick={() => setAmount(a => a + (food.per100 ? 10 : 1))} style={{
              width: 36, height: 36, borderRadius: 10, background: RC.orange, border: 'none',
              color: RC.white, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>
        </div>

        <RPrimaryButton onClick={() => onAdd(food, amount)} style={{ width: '100%' }}>
          Dodaj do {meal}
        </RPrimaryButton>
      </div>
    </RSheet>
  );
}

// ═══════════════════════════════════════════════════════════
// MEASUREMENTS VIEW
// ═══════════════════════════════════════════════════════════
function MeasurementsView({ visible, variant, weights, setWeights }) {
  const [showAddW, setShowAddW] = useState(false);
  const [newW, setNewW] = useState(81.9);
  const current = weights[weights.length - 1];
  const start = weights[0];
  const delta = (current.w - start.w).toFixed(1);
  const photos = [
    { label: 'Przód', date: '01.05' },
    { label: 'Bok',   date: '01.05' },
    { label: 'Przód', date: '24.05' },
    { label: 'Bok',   date: '24.05' },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, background: RC.bg,
      opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 0.35s ease', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 14px' }}>
        {/* Page title */}
        <div style={{ color: RC.white, fontSize: 22, fontWeight: 800, fontFamily: RF, marginBottom: 14, marginTop: 4 }}>Pomiary</div>

        {/* Weight card */}
        <div style={{ background: RC.card, borderRadius: 20, padding: '16px', border: `1px solid ${RC.border}`, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: variant === 'B' ? 16 : 10 }}>
            <div>
              <div style={{ color: RC.gray, fontSize: 12, fontFamily: RF, marginBottom: 4 }}>Aktualna waga</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: variant === 'B' ? 52 : 40, fontWeight: 800, color: RC.white, fontFamily: RF, lineHeight: 1 }}>{current.w}</span>
                <span style={{ color: RC.gray, fontSize: 16, fontFamily: RF }}>kg</span>
              </div>
              <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: RF, color: Number(delta) < 0 ? RC.green : RC.red }}>
                  {Number(delta) < 0 ? '▼' : '▲'} {Math.abs(delta)} kg
                </span>
                <span style={{ color: RC.gray, fontSize: 11, fontFamily: RF }}>od początku</span>
              </div>
            </div>
            <button onClick={() => setShowAddW(true)} style={{
              background: RC.orange, border: 'none', borderRadius: 12, height: 36, padding: '0 14px',
              color: RC.white, fontFamily: RF, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Dodaj
            </button>
          </div>
          {/* Chart */}
          <div style={{ marginLeft: -4, overflowX: 'hidden' }}>
            <WeightChart data={weights} />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'Cel', val: '79.0 kg', color: RC.orange },
            { label: 'Różnica', val: `${delta} kg`, color: Number(delta) < 0 ? RC.green : RC.red },
            { label: 'Pomiarów', val: `${weights.length}`, color: RC.fat },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: RC.card, borderRadius: 14, padding: '12px 12px', border: `1px solid ${RC.border}` }}>
              <div style={{ color: RC.gray, fontSize: 10, fontFamily: RF, marginBottom: 5 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 16, fontWeight: 700, fontFamily: RF }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Progress photos */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: RC.white, fontSize: 15, fontWeight: 700, fontFamily: RF }}>Zdjęcia postępu</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: RC.orange, fontSize: 12, fontFamily: RF, fontWeight: 600, padding: 0 }}>
              + Dodaj
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ aspectRatio: '3/4', borderRadius: 14, background: RC.card, border: `1px dashed ${RC.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={RC.gray} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span style={{ color: RC.gray, fontSize: 11, fontFamily: RF }}>{p.label}</span>
                <span style={{ color: RC.border, fontSize: 10, fontFamily: RF }}>{p.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add weight sheet */}
      <RSheet visible={showAddW} onClose={() => setShowAddW(false)} title="Dodaj pomiar" height="42%" zBase={14}>
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: RC.white, fontFamily: RF }}>{newW}</span>
            <span style={{ color: RC.gray, fontSize: 20, fontFamily: RF, marginLeft: 8 }}>kg</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={() => setNewW(v => Math.max(30, parseFloat((v - 0.1).toFixed(1))))} style={{ flex: 1, height: 52, borderRadius: 14, background: RC.card, border: `1px solid ${RC.border}`, color: RC.white, fontSize: 24, cursor: 'pointer' }}>−</button>
            <button onClick={() => setNewW(v => parseFloat((v + 0.1).toFixed(1)))} style={{ flex: 1, height: 52, borderRadius: 14, background: RC.orange, border: 'none', color: RC.white, fontSize: 24, cursor: 'pointer' }}>+</button>
          </div>
          <RPrimaryButton onClick={() => { setWeights(w => [...w, { date: '24.05', w: newW }]); setShowAddW(false); }} style={{ width: '100%' }}>
            Zapisz pomiar
          </RPrimaryButton>
        </div>
      </RSheet>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP (diary + measurements + nav)
// ═══════════════════════════════════════════════════════════
function MainApp({ visible, meals, setMeals, variant, weights, setWeights, onAddFood }) {
  const [tab, setTab] = useState('diary');
  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 0.4s ease', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <DiaryView visible={tab === 'diary'} meals={meals} setMeals={setMeals} variant={variant} onAddFood={onAddFood} />
        <MeasurementsView visible={tab === 'measurements'} variant={variant} weights={weights} setWeights={setWeights} />
      </div>
      <RBottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "variant": "B",
  "accentColor": "#FF6524"
}/*EDITMODE-END*/;

function RitatuApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('login');
  const [meals, setMeals] = useState(JSON.parse(JSON.stringify(MOCK_MEALS_INIT)));
  const [weights, setWeights] = useState([...WEIGHT_HISTORY_INIT]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [addFoodMeal, setAddFoodMeal] = useState('');
  const [showFoodDetail, setShowFoodDetail] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [customProducts, setCustomProducts] = useState([]);
  const [showCreateCustom, setShowCreateCustom] = useState(false);

  const handleAddFood = (mealName) => { setAddFoodMeal(mealName); setShowAddFood(true); };
  const handleSelectFood = (food) => { setSelectedFood(food); setShowFoodDetail(true); };
  const handleConfirmAdd = (food, amount) => {
    const mult = food.per100 ? amount / 100 : 1;
    setMeals(prev => ({
      ...prev,
      [addFoodMeal]: [...prev[addFoodMeal], {
        id: Date.now(),
        name: food.name, amount, unit: food.per100 ? 'g' : ' szt',
        calories: Math.round(food.calories * mult),
        protein: Math.round(food.protein * mult * 10) / 10,
        carbs: Math.round(food.carbs * mult * 10) / 10,
        fat: Math.round(food.fat * mult * 10) / 10,
      }],
    }));
    setShowFoodDetail(false);
    setShowAddFood(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#07070A', fontFamily: RF }}>
      <AndroidDevice dark width={393} height={852}>
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: RC.bg }}>
          <LoginScreen visible={screen === 'login'} onLogin={() => setScreen('onboarding')} />
          <OnboardingScreen visible={screen === 'onboarding'} onDone={() => setScreen('main')} />
          <MainApp
            visible={screen === 'main'}
            meals={meals} setMeals={setMeals}
            variant={t.variant}
            weights={weights} setWeights={setWeights}
            onAddFood={handleAddFood}
          />
          {/* Sheets at root level — z-index above everything */}
          <AddFoodSheet
            visible={showAddFood} meal={addFoodMeal}
            onClose={() => setShowAddFood(false)}
            onSelectFood={handleSelectFood}
            customProducts={customProducts}
            onOpenCreateCustom={() => setShowCreateCustom(true)}
          />
          <FoodDetailSheet
            visible={showFoodDetail} food={selectedFood} meal={addFoodMeal}
            onClose={() => setShowFoodDetail(false)}
            onAdd={handleConfirmAdd}
          />
          <CreateCustomSheet
            visible={showCreateCustom}
            onClose={() => setShowCreateCustom(false)}
            onSave={(product) => {
              setCustomProducts(prev => [product, ...prev]);
              setShowCreateCustom(false);
            }}
          />
        </div>
      </AndroidDevice>

      <TweaksPanel>
        <TweakSection label="Wariant layoutu" />
        <TweakRadio label="Wersja" value={t.variant}
          options={['A', 'B']}
          onChange={v => setTweak('variant', v)} />
        <TweakSection label="Kolor akcentu" />
        <TweakColor label="Akcent" value={t.accentColor}
          options={['#FF6524', '#FF3B30', '#FF9F0A', '#30D158']}
          onChange={v => setTweak('accentColor', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<RitatuApp />);
