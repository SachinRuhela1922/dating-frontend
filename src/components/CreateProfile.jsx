import { useEffect, useRef, useState } from 'react';
import { writeCache } from '../cache.js';
import s from './create-profile.module.css';

const LANGUAGES = ['Hindi', 'English', 'Punjabi', 'Gujarati', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Urdu'];
const INTERESTS = ['Travel', 'Music', 'Movies', 'Fitness', 'Cooking', 'Gaming', 'Reading', 'Photography', 'Dancing', 'Art', 'Foodie', 'Tech'];
const LOOKING_FOR = [
  { value: 'one-day', title: 'Ek din ka saath', text: 'Casual meet, no pressure.' },
  { value: 'long-term', title: 'Long relationship', text: 'Kuch lamba aur serious.' },
];
const PACES = [
  { value: 'reserved', title: 'Reserved', text: 'Pehle achhe se jaan-na, phir date plan karna.' },
  { value: 'moderate', title: 'Moderate', text: 'Gradual connection aur planned dates.' },
  { value: 'open', title: 'Open', text: 'Spontaneous plans aur naye experiences ke liye comfortable.' },
];
const CHAT = [
  { value: 'normal', label: 'Normal – simple, respectful baat' },
  { value: 'open', label: 'Open – friendly aur thodi personal baat' },
  { value: 'anything', label: 'Kuch bhi – bilkul open conversation' },
];
const EMPTY = {
  name: '', dob: '', gender: '', location: '', languages: [], interests: [],
  lookingFor: '', bio: '', datingPace: '', chatComfort: '',
};

export default function CreateProfile({ onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState(Array.from({ length: 4 }, () => ({ file: null, preview: '', caption: '' })));
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const inputs = useRef([]);

  // Fetch existing profile (edit mode)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile/me', { credentials: 'include' });
        const { profile } = await res.json();
        if (profile) {
          setIsEdit(true);
          setForm({
            name: profile.name, dob: profile.dob.slice(0, 10), gender: profile.gender, location: profile.location,
            languages: profile.languages, interests: profile.interests, lookingFor: profile.lookingFor,
            bio: profile.bio, datingPace: profile.datingPace, chatComfort: profile.chatComfort,
          });
          setPhotos(profile.photos.map(p => ({ file: null, preview: p.url, caption: p.caption })));
        }
      } catch { setError('Profile load nahi ho paya. Page refresh karo.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k, v, max) => setForm(f => {
    const has = f[k].includes(v);
    if (!has && f[k].length >= max) return f;
    return { ...f, [k]: has ? f[k].filter(x => x !== v) : [...f[k], v] };
  });

  const pickPhoto = (i, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Sirf JPG, PNG ya WebP photo choose karo.');
    if (file.size > 5 * 1024 * 1024) return setError('Har photo 5MB se chhoti honi chahiye.');
    setError('');
    setPhotos(p => p.map((x, j) => (j === i ? { ...x, file, preview: URL.createObjectURL(file) } : x)));
  };
  const setCaption = (i, caption) => setPhotos(p => p.map((x, j) => (j === i ? { ...x, caption } : x)));

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (photos.some(p => !p.preview)) return setError('Pure 4 photos upload karo.');
    if (!form.languages.length || !form.interests.length) return setError('Kam se kam ek language aur ek interest choose karo.');

    const body = new FormData();
    ['name', 'dob', 'gender', 'location', 'lookingFor', 'bio', 'datingPace', 'chatComfort'].forEach(k => body.append(k, form[k]));
    body.append('languages', JSON.stringify(form.languages));
    body.append('interests', JSON.stringify(form.interests));
    body.append('captions', JSON.stringify(photos.map(p => p.caption)));
    photos.forEach((p, i) => p.file && body.append(`photo${i}`, p.file));

    setSaving(true);
    try {
      const res = await fetch(isEdit ? '/api/profile/me' : '/api/profile', {
        method: isEdit ? 'PUT' : 'POST', body, credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kuch galat ho gaya.');
      setIsEdit(true); setDone(true);
      writeCache('profile', { profile: data.profile ?? null }); writeCache('dash:hasProfile', true); writeCache('browse', null);
      onSaved?.(data.profile);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <p className={s.status}>Loading…</p>;

  return (
    <form className={s.page} onSubmit={submit}>
      <h1 className={s.title}>{isEdit ? 'Profile edit karo' : 'Apna profile banao'}</h1>
      <p className={s.sub}>Jitna sach, utna achha match.</p>

      <section className={s.card}>
        <h2>Basic details</h2>
        <label className={s.field}>Naam
          <input value={form.name} maxLength={50} required onChange={e => set('name', e.target.value)} />
        </label>
        <div className={s.row}>
          <label className={s.field}>Date of birth
            <input type="date" value={form.dob} required max={new Date().toISOString().slice(0, 10)} onChange={e => set('dob', e.target.value)} />
          </label>
          <label className={s.field}>Gender
            <select value={form.gender} required onChange={e => set('gender', e.target.value)}>
              <option value="" disabled>Choose</option>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </label>
        </div>
        <label className={s.field}>Location
          <input value={form.location} maxLength={80} required placeholder="Shehar, state" onChange={e => set('location', e.target.value)} />
        </label>
      </section>

      <section className={s.card}>
        <h2>Languages <small>(max 5)</small></h2>
        <div className={s.chips}>
          {LANGUAGES.map(l => (
            <button type="button" key={l} className={`${s.chip} ${form.languages.includes(l) ? s.on : ''}`} aria-pressed={form.languages.includes(l)} onClick={() => toggle('languages', l, 5)}>{l}</button>
          ))}
        </div>
        <h2>Interests <small>(max 10)</small></h2>
        <div className={s.chips}>
          {INTERESTS.map(i => (
            <button type="button" key={i} className={`${s.chip} ${form.interests.includes(i) ? s.on : ''}`} aria-pressed={form.interests.includes(i)} onClick={() => toggle('interests', i, 10)}>{i}</button>
          ))}
        </div>
      </section>

      <section className={s.card}>
        <h2>Kya dhundh rahe ho?</h2>
        <div className={s.options}>
          {LOOKING_FOR.map(o => (
            <label key={o.value} className={`${s.option} ${form.lookingFor === o.value ? s.on : ''}`}>
              <input type="radio" name="lookingFor" value={o.value} checked={form.lookingFor === o.value} required onChange={() => set('lookingFor', o.value)} />
              <strong>{o.title}</strong><span>{o.text}</span>
            </label>
          ))}
        </div>
        <label className={s.field}>Bio <small>({form.bio.length}/300)</small>
          <textarea rows={4} maxLength={300} value={form.bio} placeholder="Apne baare mein kuch likho…" onChange={e => set('bio', e.target.value)} />
        </label>
      </section>

      <section className={s.card}>
        <h2>Dating pace / comfort level</h2>
        <div className={s.options}>
          {PACES.map(o => (
            <label key={o.value} className={`${s.option} ${form.datingPace === o.value ? s.on : ''}`}>
              <input type="radio" name="datingPace" value={o.value} checked={form.datingPace === o.value} required onChange={() => set('datingPace', o.value)} />
              <strong>{o.title}</strong><span>{o.text}</span>
            </label>
          ))}
        </div>
        <label className={s.field}>Chat comfort
          <select value={form.chatComfort} required onChange={e => set('chatComfort', e.target.value)}>
            <option value="" disabled>Chat mein kitne open ho?</option>
            {CHAT.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
      </section>

      <section className={s.card}>
        <h2>Photos <small>(4 zaroori, har photo ke saath ek line)</small></h2>
        <div className={s.photos}>
          {photos.map((p, i) => (
            <div key={i} className={s.photo}>
              <button type="button" className={s.slot} onClick={() => inputs.current[i].click()} aria-label={`Photo ${i + 1} choose karo`}>
                {p.preview ? <img src={p.preview} alt={`Photo ${i + 1}`} /> : <span>+ Photo {i + 1}</span>}
              </button>
              <input ref={el => (inputs.current[i] = el)} type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={e => { pickPhoto(i, e.target.files[0]); e.target.value = ''; }} />
              <input className={s.caption} value={p.caption} maxLength={100} placeholder="Is photo ke baare mein likho"
                onChange={e => setCaption(i, e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      {error && <p className={s.error} role="alert">{error}</p>}
      {done && <p className={s.ok} role="status">Profile save ho gaya.</p>}
      <button className={s.submit} disabled={saving}>{saving ? 'Save ho raha hai…' : isEdit ? 'Changes save karo' : 'Profile banao'}</button>
    </form>
  );
}