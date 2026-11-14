'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  DollarSign,
  CreditCard,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  Video,
} from 'lucide-react';

type SettingsData = {
  academy_name?: string;
  legal_name?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  currency_code?: string;
  currency_symbol?: string;
  timezone?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_no?: string;
  bank_account_name?: string;
  bank_instructions?: string;
  bank_details_verified?: boolean;
  watermark_enabled?: boolean;
  watermark_interval_seconds?: number;
  support_phone?: string;
};

export default function SettingsWorkspace() {
  const [activeTab, setActiveTab] = useState<'branding' | 'localization' | 'payments' | 'security'>('branding');
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/manager/settings');
        const json = await res.json();
        if (res.ok && json.settings) {
          setSettings(json.settings);
        } else {
          setNotice({ type: 'error', message: json.error || 'Failed to load settings' });
        }
      } catch (err) {
        setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Failed to load settings' });
      } finally {
        setLoading(false);
      }
    }
    void fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/manager/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (res.ok) {
        setNotice({ type: 'success', message: 'Academy settings updated successfully.' });
        if (json.settings) setSettings(json.settings);
      } else {
        setNotice({ type: 'error', message: json.error || 'Failed to save settings' });
      }
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--mint, #19e69a)' }} />
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem' }}>
      <div className="page-heading" style={{ marginBottom: '2rem' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--mint, #19e69a)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.05em' }}>
            MENTORA / SYSTEM ADMINISTRATION
          </p>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0' }}>Academy Settings & Configuration</h1>
          <p className="subhead" style={{ color: '#8899a6', fontSize: '0.95rem' }}>
            Configure institutional branding, localized currency, bank payment instructions, and playback DRM parameters.
          </p>
        </div>
      </div>

      {notice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            background: notice.type === 'success' ? 'rgba(25, 230, 154, 0.12)' : 'rgba(255, 75, 75, 0.12)',
            border: `1px solid ${notice.type === 'success' ? 'rgba(25, 230, 154, 0.4)' : 'rgba(255, 75, 75, 0.4)'}`,
            color: notice.type === 'success' ? '#19e69a' : '#ff6b6b',
          }}
        >
          {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{notice.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'branding' ? '2px solid #19e69a' : '2px solid transparent',
            color: activeTab === 'branding' ? '#19e69a' : '#8899a6',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Building2 size={16} /> Branding & Contact
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('localization')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'localization' ? '2px solid #19e69a' : '2px solid transparent',
            color: activeTab === 'localization' ? '#19e69a' : '#8899a6',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <DollarSign size={16} /> Currency & Region
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'payments' ? '2px solid #19e69a' : '2px solid transparent',
            color: activeTab === 'payments' ? '#19e69a' : '#8899a6',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <CreditCard size={16} /> Bank Deposit Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'security' ? '2px solid #19e69a' : '2px solid transparent',
            color: activeTab === 'security' ? '#19e69a' : '#8899a6',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Shield size={16} /> Watermark & Security
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSave}>
        {activeTab === 'branding' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-1">Academy Display Name *</label>
              <input id="settingsworkspace-field-1"
                type="text"
                required
                value={settings.academy_name || ''}
                onChange={(e) => updateField('academy_name', e.target.value)}
                placeholder="Mentora Academy"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-2">Official Legal Entity Name</label>
              <input id="settingsworkspace-field-2"
                type="text"
                value={settings.legal_name || ''}
                onChange={(e) => updateField('legal_name', e.target.value)}
                placeholder="Mentora Education (Pvt) Ltd"
              />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="settingsworkspace-field-3">Institutional Tagline</label>
              <input id="settingsworkspace-field-3"
                type="text"
                value={settings.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Excellence in Advanced Level & Higher Secondary Education"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-4"><Phone size={14} style={{ display: 'inline', marginRight: 4 }} /> Primary Contact Telephone</label>
              <input id="settingsworkspace-field-4"
                type="text"
                value={settings.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+94 11 234 5678"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-5"><Mail size={14} style={{ display: 'inline', marginRight: 4 }} /> Official Support Email</label>
              <input id="settingsworkspace-field-5"
                type="email"
                value={settings.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="support@mentora.lk"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-6"><Globe size={14} style={{ display: 'inline', marginRight: 4 }} /> Academy Website URL</label>
              <input id="settingsworkspace-field-6"
                type="url"
                value={settings.website || ''}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://mentora.lk"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-7"><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} /> Physical Campus Address</label>
              <input id="settingsworkspace-field-7"
                type="text"
                value={settings.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Colombo, Sri Lanka"
              />
            </div>
          </div>
        )}

        {activeTab === 'localization' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-8">Currency Code *</label>
              <select id="settingsworkspace-field-8"
                value={settings.currency_code || 'LKR'}
                onChange={(e) => updateField('currency_code', e.target.value)}
              >
                <option value="LKR">LKR (Sri Lankan Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="AUD">AUD (Australian Dollar)</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-9">Currency Display Symbol *</label>
              <input id="settingsworkspace-field-9"
                type="text"
                required
                value={settings.currency_symbol || 'Rs.'}
                onChange={(e) => updateField('currency_symbol', e.target.value)}
                placeholder="Rs."
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-10"><Clock size={14} style={{ display: 'inline', marginRight: 4 }} /> Academic Timezone *</label>
              <select id="settingsworkspace-field-10"
                value={settings.timezone || 'Asia/Colombo'}
                onChange={(e) => updateField('timezone', e.target.value)}
              >
                <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
                <option value="UTC">UTC (GMT+0:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
                <option value="Europe/London">Europe/London (GMT+1:00 / GMT+0:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8:00)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <label style={{display: 'flex', gap: 10, marginBottom: 16}}>
                <input type="checkbox" checked={settings.bank_details_verified === true} onChange={e => updateField('bank_details_verified', e.target.checked)} />
                I have checked these bank details and authorize students to use them for payments.
              </label>
            <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#8899a6' }}>
                These bank account credentials and deposit instructions are rendered in the Student Checkout Modal whenever students choose bank transfer.
              </p>
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-11">Bank Name *</label>
              <input id="settingsworkspace-field-11"
                type="text"
                required
                value={settings.bank_name || ''}
                onChange={(e) => updateField('bank_name', e.target.value)}
                placeholder="Commercial Bank of Ceylon"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-12">Branch Name *</label>
              <input id="settingsworkspace-field-12"
                type="text"
                required
                value={settings.bank_branch || ''}
                onChange={(e) => updateField('bank_branch', e.target.value)}
                placeholder="Kollupitiya Branch"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-13">Account Number *</label>
              <input id="settingsworkspace-field-13"
                type="text"
                required
                value={settings.bank_account_no || ''}
                onChange={(e) => updateField('bank_account_no', e.target.value)}
                placeholder="8001234567"
              />
            </div>
            <div className="form-field">
              <label htmlFor="settingsworkspace-field-14">Beneficiary / Account Name *</label>
              <input id="settingsworkspace-field-14"
                type="text"
                required
                value={settings.bank_account_name || ''}
                onChange={(e) => updateField('bank_account_name', e.target.value)}
                placeholder="Mentora Academy (Pvt) Ltd"
              />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="settingsworkspace-field-15">Special Deposit Instructions for Students</label>
              <textarea id="settingsworkspace-field-15"
                rows={3}
                value={settings.bank_instructions || ''}
                onChange={(e) => updateField('bank_instructions', e.target.value)}
                placeholder="Please enter your Student Index number or Order ID as the deposit reference and attach the photo/PDF of your deposit slip."
              />
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Video size={17} style={{ color: '#19e69a' }} /> Dynamic Session Watermark
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#8899a6' }}>
                    Renders an unclosable, drifting watermark containing authoritative student identity and live timestamps across video playback.
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.watermark_enabled ?? true}
                    onChange={(e) => updateField('watermark_enabled', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#19e69a' }}
                  />
                  <span style={{ fontWeight: 600 }}>Enabled</span>
                </label>
              </div>

              <div className="form-field" style={{ maxWidth: '300px' }}>
                <label htmlFor="settingsworkspace-field-16">Watermark Coordinate Drift Interval (Seconds)</label>
                <input id="settingsworkspace-field-16"
                  type="number"
                  min={5}
                  max={60}
                  value={settings.watermark_interval_seconds ?? 14}
                  onChange={(e) => updateField('watermark_interval_seconds', Number(e.target.value))}
                />
                <small style={{ color: '#8899a6' }}>Recommended: 14s. Repositions across 6 responsive coordinates to deter screen recording.</small>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#19e69a',
              color: '#062a35',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving Changes…' : 'Save Academy Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
