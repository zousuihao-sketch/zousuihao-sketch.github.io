// Adapted from the user's ElasticSlider. Original preserved in model-source/user-elastic-slider.jsx.
// Original spring equations, rubber stretching, stepping and pointer/keyboard behavior are retained.
const TAU=Math.PI*2;
const DARK_INK='rgba(18,15,23,.86)',LIGHT_INK='rgba(255,255,255,.94)';
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const rubber=(distance,limit)=>limit>0?2*(1/(1+Math.exp(-distance/limit))-.5)*limit:0;
const prefersReduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let probe=null;
const readColor = text => {
  const match = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(text);
  if (match)
    return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
  if (typeof document === 'undefined') return null;
  if (!probe) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    probe = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!probe) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000000';
  probe.fillStyle = text;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
};


export function mountElasticSlider(root,opts={}){
 let {value=0,defaultValue=0,startingValue=0,maxValue=1,isStepped=false,stepSize=1,
 orientation='horizontal',fillFrom,thickness=4,activeThickness=9,radius,restOpacity=.85,
 growOnHover=true,maxStretch=25,bounce=.5,jumpToClick=true,wheel=false,disabled=false,
 fillContentColor='auto',formatValue}=opts;
 const cleanups=[],events=new AbortController();let alive=true;
 const useRef=current=>({current}),useState=initial=>[initial,()=>{}];
 const useEffect=fn=>{const cleanup=fn();if(typeof cleanup==='function')cleanups.push(cleanup);};
 const useIsoLayoutEffect=useEffect;
 const onChange=next=>{updateLabel(next);opts.onChange?.(next);};
 const onChangeEnd=next=>opts.onChangeEnd?.(next);
 root.classList.add('elastic-slider');root.dataset.engine='user-elastic-slider';
 root.innerHTML='<div class="elastic-slider__body"><div class="elastic-slider__hit" role="slider" tabindex="0"><div class="elastic-slider__track"><div class="elastic-slider__range"></div></div><span class="elastic-slider__thumb" aria-hidden="true"></span><span class="elastic-slider__bubble" aria-hidden="true"></span></div></div>';
  const rootRef = { current: root };
  const hitRef = { current: root.querySelector('.elastic-slider__hit') };
  const bodyRef = { current: root.querySelector('.elastic-slider__body') };
  const trackRef = { current: root.querySelector('.elastic-slider__track') };
  const rangeRef = { current: root.querySelector('.elastic-slider__range') };
  const thumbRef = { current: root.querySelector('.elastic-slider__thumb') };
  const bubbleRef = { current: root.querySelector('.elastic-slider__bubble') };
  const startIconRef = useRef(null);
  const endIconRef = useRef(null);
  const motion = useRef({
    p: 0,
    vp: 0,
    target: 0,
    s: 0,
    vs: 0,
    side: 1,
    held: false,
    a: 0,
    va: 0,
    goal: 0,
    length: 0,
    dragging: false,
    hovered: false,
    focused: false,
    raf: 0,
    last: 0,
    ready: false
  });
  const drag = useRef(null);

  const lo = Math.min(startingValue, maxValue);
  const hi = Math.max(startingValue, maxValue);
  const span = hi - lo || 1;
  const step = isStepped && stepSize > 0 ? stepSize : 0;
  const vertical = orientation === 'vertical';
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const current = clamp(controlled ? value : inner, lo, hi);
  const currentRef = useRef(current);

  const settings = {
    lo,
    hi,
    span,
    step,
    vertical,
    origin: clamp(((fillFrom ?? lo) - lo) / span, 0, 1),
    thickness: Math.max(1, thickness),
    activeThickness: Math.max(1, activeThickness),
    radius,
    restOpacity: clamp(restOpacity, 0, 1),
    growOnHover,
    maxStretch: Math.max(0, maxStretch),
    bounce: clamp(bounce, 0, 0.95),
    jumpToClick,
    controlled,
    onChange,
    onChangeEnd
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const snap = raw => {
    const s = settingsRef.current;
    let next = clamp(raw, s.lo, s.hi);
    if (s.step) next = clamp(s.lo + Math.round((next - s.lo) / s.step) * s.step, s.lo, s.hi);
    return Number(next.toFixed(10));
  };

  const paint = () => {
    const m = motion.current;
    const s = settingsRef.current;
    const track = trackRef.current;
    const range = rangeRef.current;
    if (!track || !range) return;
    const thick = s.thickness + (s.activeThickness - s.thickness) * m.a;
    track.style.width = s.vertical ? `${thick.toFixed(2)}px` : '';
    track.style.height = s.vertical ? '' : `${thick.toFixed(2)}px`;
    track.style.setProperty('--elastic-slider-reveal', clamp((thick - 14) / 10, 0, 1).toFixed(3));
    const length = Math.max(1, m.length);
    const along = 1 + m.s / length;
    const across = 1 - 0.22 * clamp(m.s / Math.max(1, s.maxStretch), -1, 1);
    const atEnd = m.side > 0;
    track.style.transformOrigin = s.vertical ? (atEnd ? '50% 100%' : '50% 0%') : atEnd ? '0% 50%' : '100% 50%';
    const scaleX = s.vertical ? across : along;
    const scaleY = s.vertical ? along : across;
    track.style.transform = `scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
    track.style.setProperty(
      '--elastic-slider-unscale',
      `scale(${(1 / scaleX).toFixed(4)}, ${(1 / scaleY).toFixed(4)})`
    );
    const p = clamp(m.p, 0, 1);
    const from = (Math.min(s.origin, p) * 100).toFixed(3);
    const to = ((1 - Math.max(s.origin, p)) * 100).toFixed(3);
    const round = (s.radius ?? thick / 2).toFixed(2);
    range.style.clipPath = s.vertical
      ? `inset(${to}% 0 ${from}% 0 round ${round}px)`
      : `inset(0 ${to}% 0 ${from}% round ${round}px)`;
    const position = atEnd ? p * length * along : length - (1 - p) * length * along;
    const shift = s.vertical
      ? `translate3d(0, ${(-position).toFixed(2)}px, 0)`
      : `translate3d(${position.toFixed(2)}px, 0, 0)`;
    if (thumbRef.current) thumbRef.current.style.transform = `${shift} scale(${(1 + 0.12 * m.a).toFixed(3)})`;
    if (bubbleRef.current) {
      const center = s.vertical ? 'translate(0, 50%)' : 'translate(-50%, 0)';
      bubbleRef.current.style.transform = `${shift} ${center} scale(${(0.7 + 0.3 * m.a).toFixed(3)})`;
      bubbleRef.current.style.opacity = clamp(m.a * 1.4 - 0.2, 0, 1).toFixed(3);
    }
    const startShift = atEnd ? 0 : m.s;
    const endShift = atEnd ? m.s : 0;
    const iconScale = (1 + 0.08 * m.a).toFixed(3);
    if (startIconRef.current) {
      startIconRef.current.style.transform = s.vertical
        ? `translate3d(0, ${startShift.toFixed(2)}px, 0) scale(${iconScale})`
        : `translate3d(${(-startShift).toFixed(2)}px, 0, 0) scale(${iconScale})`;
    }
    if (endIconRef.current) {
      endIconRef.current.style.transform = s.vertical
        ? `translate3d(0, ${(-endShift).toFixed(2)}px, 0) scale(${iconScale})`
        : `translate3d(${endShift.toFixed(2)}px, 0, 0) scale(${iconScale})`;
    }
    if (bodyRef.current) {
      bodyRef.current.style.opacity = s.restOpacity < 1 ? (s.restOpacity + (1 - s.restOpacity) * m.a).toFixed(3) : '';
    }
  };

  const frame = now => {
    const m = motion.current;
    m.raf = 0;
    const s = settingsRef.current;
    const elapsed = clamp((now - m.last) / 1000, 0, 1 / 20);
    m.last = now;
    if (prefersReduced()) {
      m.p = m.target;
      m.vp = 0;
      if (!m.held) {
        m.s = 0;
        m.vs = 0;
      }
      m.a = m.goal;
      m.va = 0;
    } else {
      const steps = Math.max(1, Math.ceil(elapsed / (1 / 240)));
      const dt = elapsed / steps;
      const fillOmega = TAU / (m.dragging ? 0.09 : 0.3);
      const fillZeta = m.dragging ? 1 : 0.86;
      const stretchOmega = TAU / 0.42;
      const stretchZeta = 1 - 0.9 * s.bounce;
      const activeOmega = TAU / 0.32;
      for (let i = 0; i < steps; i++) {
        m.vp += (-fillOmega * fillOmega * (m.p - m.target) - 2 * fillZeta * fillOmega * m.vp) * dt;
        m.p += m.vp * dt;
        if (!m.held) {
          m.vs += (-stretchOmega * stretchOmega * m.s - 2 * stretchZeta * stretchOmega * m.vs) * dt;
          m.s += m.vs * dt;
        }
        m.va += (-activeOmega * activeOmega * (m.a - m.goal) - 2 * 0.9 * activeOmega * m.va) * dt;
        m.a += m.va * dt;
      }
    }
    const settled =
      Math.abs(m.p - m.target) < 0.0004 &&
      Math.abs(m.vp) < 0.002 &&
      (m.held || (Math.abs(m.s) < 0.05 && Math.abs(m.vs) < 0.5)) &&
      Math.abs(m.a - m.goal) < 0.002 &&
      Math.abs(m.va) < 0.005;
    if (settled) {
      m.p = m.target;
      m.vp = 0;
      m.a = m.goal;
      m.va = 0;
      if (!m.held) {
        m.s = 0;
        m.vs = 0;
      }
    }
    paint();
    if (!settled || m.dragging) m.raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    const m = motion.current;
    if (m.raf || typeof window === 'undefined') return;
    m.last = performance.now();
    m.raf = requestAnimationFrame(frame);
  };

  const autoInk = () => {
    const root = rootRef.current;
    const range = rangeRef.current;
    if (!root || !range || fillContentColor !== 'auto') return;
    const color = readColor(getComputedStyle(range).backgroundColor);
    const ink =
      !color || color[3] < 0.5
        ? 'var(--elastic-slider-content)'
        : (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]) / 255 > 0.55
          ? DARK_INK
          : LIGHT_INK;
    root.style.setProperty('--elastic-slider-fill-content', ink);
  };

  const refreshGoal = () => {
    const m = motion.current;
    m.goal = (m.hovered && settingsRef.current.growOnHover) || m.dragging || m.focused ? 1 : 0;
    kick();
  };

  const pulse = side => {
    const icon = (side > 0 ? endIconRef : startIconRef).current?.firstElementChild;
    if (!icon || prefersReduced()) return;
    icon.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], {
      duration: 280,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    });
  };

  const bump = side => {
    const m = motion.current;
    const s = settingsRef.current;
    if (!s.maxStretch || m.held || Math.abs(m.vs) > 40 || Math.abs(m.s) > 2) return;
    m.side = side;
    m.vs = s.maxStretch * 5.5;
    pulse(side);
    kick();
  };

  const commit = next => {
    const s = settingsRef.current;
    motion.current.target = (next - s.lo) / s.span;
    kick();
    if (next === currentRef.current) return;
    currentRef.current = next;
    if (!s.controlled) setInner(next);
    s.onChange?.(next);
  };

  const snapRef = useRef(snap);
  snapRef.current = snap;
  const bumpRef = useRef(bump);
  bumpRef.current = bump;
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const goalRef = useRef(refreshGoal);
  goalRef.current = refreshGoal;

  useIsoLayoutEffect(() => {
    const m = motion.current;
    currentRef.current = current;
    const fraction = (current - lo) / span;
    if (!m.dragging) m.target = fraction;
    if (!m.ready) {
      m.ready = true;
      m.p = fraction;
      paint();
      return;
    }
    kick();
  }, [current, lo, span]);

  useIsoLayoutEffect(() => {
    const hit = hitRef.current;
    if (!hit) return undefined;
    const measure = () => {
      motion.current.length = settingsRef.current.vertical ? hit.clientHeight : hit.clientWidth;
      paint();
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(hit);
    return () => observer.disconnect();
  }, [vertical]);

  useIsoLayoutEffect(() => {
    autoInk();
    paint();
  });

  useEffect(() => {
    goalRef.current();
  }, [growOnHover]);

  useEffect(() => {
    const hit = hitRef.current;
    if (!hit || !wheel || disabled) return undefined;
    let timer = 0;
    const onWheel = event => {
      event.preventDefault();
      const s = settingsRef.current;
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? -event.deltaY : event.deltaX;
      if (!delta) return;
      const amount = s.step ? Math.sign(delta) * s.step : (delta * s.span) / 800;
      const next = snapRef.current(currentRef.current + amount);
      if (next === currentRef.current) {
        bumpRef.current(Math.sign(delta));
        return;
      }
      commitRef.current(next);
      clearTimeout(timer);
      timer = setTimeout(() => settingsRef.current.onChangeEnd?.(currentRef.current), 200);
    };
    hit.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      clearTimeout(timer);
      hit.removeEventListener('wheel', onWheel);
    };
  }, [wheel, disabled]);

  useEffect(() => {
    const m = motion.current;
    return () => cancelAnimationFrame(m.raf);
  }, []);

  const along = event => {
    const rect = hitRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return settingsRef.current.vertical ? rect.bottom - event.clientY : event.clientX - rect.left;
  };

  const follow = event => {
    const d = drag.current;
    if (!d) return;
    const m = motion.current;
    const s = settingsRef.current;
    const length = Math.max(1, m.length);
    const position = along(event);
    const fraction = d.from === null ? position / length : d.from + (position - d.origin) / length;
    const over = fraction < 0 ? -fraction * length : fraction > 1 ? (fraction - 1) * length : 0;
    if (over > 0 && s.maxStretch > 0) {
      const side = fraction < 0 ? -1 : 1;
      if (!m.held || m.side !== side) pulse(side);
      m.held = true;
      m.side = side;
      m.s = rubber(over, s.maxStretch);
      m.vs = 0;
    } else if (m.held) {
      m.held = false;
    }
    commit(snap(s.lo + clamp(fraction, 0, 1) * s.span));
  };

  const onPointerDown = event => {
    const hit = hitRef.current;
    if (disabled || drag.current || event.button !== 0 || !hit) return;
    hit.setPointerCapture(event.pointerId);
    const m = motion.current;
    const s = settingsRef.current;
    drag.current = {
      id: event.pointerId,
      origin: along(event),
      from: s.jumpToClick ? null : m.target
    };
    m.dragging = true;
    hit.setAttribute('data-dragging', '');
    refreshGoal();
    if (s.jumpToClick) commit(snap(s.lo + clamp(along(event) / Math.max(1, m.length), 0, 1) * s.span));
  };

  const onPointerMove = event => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    follow(event);
  };

  const release = () => {
    if (!drag.current) return;
    const m = motion.current;
    drag.current = null;
    m.dragging = false;
    m.held = false;
    hitRef.current?.removeAttribute('data-dragging');
    refreshGoal();
    settingsRef.current.onChangeEnd?.(currentRef.current);
  };

  const onKeyDown = event => {
    if (disabled) return;
    const s = settingsRef.current;
    const unit = s.step || s.span / 100;
    const large = Math.max(unit, s.span / 10);
    const now = currentRef.current;
    const keys = {
      ArrowRight: now + unit,
      ArrowUp: now + unit,
      ArrowLeft: now - unit,
      ArrowDown: now - unit,
      PageUp: now + large,
      PageDown: now - large,
      Home: s.lo,
      End: s.hi
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const wanted = keys[event.key];
    const next = snap(wanted);
    if (next === now) {
      if (wanted !== now) bump(wanted > now ? 1 : -1);
      return;
    }
    commit(next);
    s.onChangeEnd?.(next);
  };


 const hit=hitRef.current;
 function updateLabel(next){
  const text=formatValue?formatValue(next):String(Math.round(next*100));
  hitRef.current.setAttribute('aria-valuenow',String(next));hitRef.current.setAttribute('aria-valuetext',text);
  if(bubbleRef.current)bubbleRef.current.textContent=text;
 }
 hit.setAttribute('aria-label',opts.ariaLabel||'滑条');hit.setAttribute('aria-valuemin',String(lo));hit.setAttribute('aria-valuemax',String(hi));
 hit.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
 function listen(el,name,fn,options={}){el.addEventListener(name,fn,{...options,signal:events.signal});}
 listen(hit,'pointerdown',e=>{if(disabled||drag.current)return;e.preventDefault();hit.focus({preventScroll:true});onPointerDown(e);});
 listen(hit,'pointermove',onPointerMove);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(hit,event,e=>{if(drag.current?.id===e.pointerId)release();});
 listen(hit,'keydown',onKeyDown);
 listen(root,'pointerenter',()=>{motion.current.hovered=true;refreshGoal();});
 listen(root,'pointerleave',()=>{motion.current.hovered=false;refreshGoal();});
 listen(hit,'focus',()=>{motion.current.focused=hit.matches(':focus-visible');refreshGoal();});
 listen(hit,'blur',()=>{motion.current.focused=false;refreshGoal();});
 const api={
  setValue(next){if(!alive||motion.current.dragging)return;next=snap(next);currentRef.current=next;motion.current.target=(next-lo)/span;updateLabel(next);kick();},
  setDisabled(next){disabled=Boolean(next);hit.tabIndex=disabled?-1:0;hit.setAttribute('aria-disabled',String(disabled));root.toggleAttribute('data-disabled',disabled);},
  getState(){return {engine:'user-elastic-slider',value:currentRef.current,stretch:motion.current.s,dragging:motion.current.dragging};},
  dispose(){alive=false;events.abort();for(const cleanup of cleanups)cleanup();cancelAnimationFrame(motion.current.raf);if(drag.current&&hit.hasPointerCapture(drag.current.id))hit.releasePointerCapture(drag.current.id);drag.current=null;delete root.elasticSlider;}
 };
 root.elasticSlider=api;updateLabel(current);api.setDisabled(disabled);return api;
}
