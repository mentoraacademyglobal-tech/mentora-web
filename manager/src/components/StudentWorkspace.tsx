'use client';

import AccessibleDialog from './ui/AccessibleDialog';
import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  UserRound,
  GraduationCap,
  Phone,
  CreditCard,
  Award,
  ShieldAlert,
  Activity,
  Coins,
  Sparkles,
  School,
  History,
  FileText,
  PlusCircle,
  X,
} from 'lucide-react';

type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type Membership = {
  id: string;
  role: string;
  status?: string | null;
  created_at: string;
};

type Registration = {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  district: string | null;
  grade: string | null;
  medium: string | null;
  school: string | null;
  guardian_phone: string | null;
  address: string | null;
  referral: string | null;
  created_at: string;
};

type Enrolment = {
  id: string;
  class_id: string;
  class_name: string;
  status: 'active' | 'paused' | 'left';
  started_on: string;
  ended_on: string | null;
};

type Klass = {
  id: string;
  name: string;
  term: string | null;
};

type Invoice = {
  id: string;
  invoice_no: string;
  amount: number;
  payment_method: string;
  payment_proof_path: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  course_name?: string;
};

type RewardAccount = {
  balance: number;
  updated_at?: string;
} | null;

type RewardTx = {
  id: string;
  kind: 'points' | 'coins';
  delta: number;
  before_balance: number;
  after_balance: number;
  reason: string;
  created_at: string;
};

type ActivityItem = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
};

type ExamAttempt = {
  id: string;
  exam_id: string;
  exam_name: string;
  score: number | null;
  total_marks: number | null;
  started_at: string;
  submitted_at: string | null;
};

type ReportCard = {
  id: string;
  title: string;
  term: string | null;
  grade_level: string | null;
  attendance_percentage: number | null;
  overall_grade: string | null;
  average_score: number | null;
  status: string;
  published_at: string | null;
  created_at: string;
};

type StudentPayload = {
  profile: Profile;
  membership: Membership | null;
  registration: Registration | null;
  enrolments: Enrolment[];
  classes: Klass[];
  invoices: Invoice[];
  points: RewardAccount;
  coins: RewardAccount;
  reward_transactions: RewardTx[];
  activity: ActivityItem[];
  exam_attempts: ExamAttempt[];
  report_cards?: ReportCard[];
};

type TabKey =
  | 'overview'
  | 'personal'
  | 'academic'
  | 'contact'
  | 'enrollments'
  | 'payments'
  | 'learning'
  | 'rewards'
  | 'account'
  | 'activity';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

const GRADES = [
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11',
  'Grade 12', 'Grade 13', 'GCE O/L', 'GCE A/L', 'Other'
];

const MEDIUMS = ['English', 'Sinhala', 'Tamil'];

export default function StudentWorkspace({id}: {id: string}) {
  const [data, setData] = useState<StudentPayload | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Editable Profile fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Editable Registration fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [district, setDistrict] = useState('');
  const [grade, setGrade] = useState('');
  const [medium, setMedium] = useState('');
  const [school, setSchool] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [address, setAddress] = useState('');

  // Enrollment form
  const [enrollClassId, setEnrollClassId] = useState('');

  // Account status reason
  const [accountStatus, setAccountStatus] = useState<string>('active');

  // Reward adjustment modal
  const [rewardModal, setRewardModal] = useState<{ kind: 'points' | 'coins'; label: string } | null>(null);
  const [rewardDelta, setRewardDelta] = useState<string>('50');
  const [rewardReason, setRewardReason] = useState<string>('');
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardError, setRewardError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/manager/student-workspace/${encodeURIComponent(id)}`, {cache: 'no-store'});
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to load student record');

      setData(json);
      setFullName(json.profile.full_name ?? '');
      setPhone(json.profile.phone ?? '');

      if (json.registration) {
        setFirstName(json.registration.first_name ?? '');
        setLastName(json.registration.last_name ?? '');
        setDob(json.registration.date_of_birth ?? '');
        setGender(json.registration.gender ?? '');
        setDistrict(json.registration.district ?? '');
        setGrade(json.registration.grade ?? '');
        setMedium(json.registration.medium ?? '');
        setSchool(json.registration.school ?? '');
        setGuardianPhone(json.registration.guardian_phone ?? '');
        setAddress(json.registration.address ?? '');
      } else {
        // Fallback split from full name if older student with no registration record
        const parts = (json.profile.full_name ?? '').split(' ');
        setFirstName(parts[0] ?? '');
        setLastName(parts.slice(1).join(' ') ?? '');
      }

      setAccountStatus(json.membership?.status ?? 'active');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Loading failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // The loader only updates state after awaiting the network response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function act(payload: Record<string, unknown>, successText: string) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/manager/student-workspace/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Action failed');
      setMessage(successText);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleRewardAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!rewardModal) return;
    const delta = parseInt(rewardDelta, 10);
    if (isNaN(delta) || delta === 0) {
      setRewardError('Please enter a valid non-zero integer (positive to award, negative to deduct)');
      return;
    }
    if (!rewardReason.trim()) {
      setRewardError('Please provide an auditable reason for this adjustment');
      return;
    }
    setRewardSaving(true);
    setRewardError('');
    try {
      const res = await fetch(`/api/manager/student-workspace/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'adjust_reward',
          kind: rewardModal.kind,
          delta,
          reason: rewardReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Reward adjustment failed');
      setMessage(json.message || 'Reward adjusted successfully.');
      setRewardModal(null);
      setRewardReason('');
      await load();
    } catch (err) {
      setRewardError(err instanceof Error ? err.message : 'Adjustment error');
    } finally {
      setRewardSaving(false);
    }
  }

  const takenClassIds = new Set(data?.enrolments.filter(e => e.status === 'active').map(e => e.class_id) ?? []);

  const tabs: {id: TabKey; label: string; count?: number}[] = [
    {id: 'overview', label: 'Overview'},
    {id: 'personal', label: 'Personal'},
    {id: 'academic', label: 'Academic'},
    {id: 'contact', label: 'Contact'},
    {id: 'enrollments', label: 'Classes & Enrollments', count: data?.enrolments.length},
    {id: 'payments', label: 'Payments', count: data?.invoices.length},
    {id: 'learning', label: 'Learning & Exams', count: data?.exam_attempts.length},
    {id: 'rewards', label: 'Rewards'},
    {id: 'account', label: 'Account & Security'},
    {id: 'activity', label: 'Activity Logs', count: data?.activity.length},
  ];

  return (
    <section className="page-content student-workspace">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MENTORA / STUDENTS</p>
          <h1>{data?.profile.full_name || 'Student Workspace'}</h1>
          <p className="subhead">
            Student record ID: <code style={{fontSize: 11, background: '#eaf1f4', padding: '2px 6px', borderRadius: 4}}>{id}</code>
          </p>
        </div>
        <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
          <Link className="btn btn-outline" href="/students">
            <ArrowLeft size={16}/> Back to Directory
          </Link>
          <button className="btn btn-outline" onClick={() => void load()} disabled={saving || loading} title="Refresh student data">
            <RefreshCw size={15} className={loading ? 'spin' : ''}/> Refresh
          </button>
        </div>
      </div>

      {error && <p role="alert" className="error module-notice">{error}</p>}
      {message && <p role="status" className="success module-notice"><CheckCircle2 size={16}/> {message} <button onClick={() => setMessage('')}>×</button></p>}

      {loading && !data ? (
        <div className="form-section" style={{display: 'flex', alignItems: 'center', gap: 10, padding: 30}}>
          <Loader2 className="spin" size={24}/>
          <span>Loading complete student record…</span>
        </div>
      ) : data && (
        <>
          {/* Top Overview Banner Card */}
          <div className="sw-overview-card">
            <div className="sw-avatar">
              {(data.profile.full_name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="sw-overview-info">
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8}}>
                <h2>{data.profile.full_name}</h2>
                <span className={`badge ${accountStatus === 'active' ? 'active' : accountStatus === 'suspended' ? 'rejected' : 'draft'}`}>
                  {accountStatus}
                </span>
              </div>
              <p>{data.profile.email || 'Email not linked to profile'}</p>
              <div className="sw-overview-meta">
                <div className="sw-meta-item">
                  <span>Grade / Batch</span>
                  <b>{data.registration?.grade || 'Not assigned'}</b>
                </div>
                <div className="sw-meta-item">
                  <span>School</span>
                  <b>{data.registration?.school || 'Not specified'}</b>
                </div>
                <div className="sw-meta-item">
                  <span>District</span>
                  <b>{data.registration?.district || 'Not specified'}</b>
                </div>
                <div className="sw-meta-item">
                  <span>Primary Phone</span>
                  <b>{data.profile.phone || 'Not recorded'}</b>
                </div>
                <div className="sw-meta-item">
                  <span>Joined Date</span>
                  <b>{new Date(data.profile.created_at).toLocaleDateString('en-LK', {dateStyle: 'medium'})}</b>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="cw-tabs" role="group" aria-label="Student management tabs">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                aria-pressed={activeTab === t.id}
                className={`cw-tab ${activeTab === t.id ? 'cw-active' : ''}`}
                onClick={() => {
                  setActiveTab(t.id);
                  setError('');
                  setMessage('');
                }}
              >
                {t.label}
                {t.count !== undefined && <span>{t.count}</span>}
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="dashboard-columns">
              <div className="dashboard-left">
                <div className="form-section">
                  <div className="form-section-title">
                    <h3><UserRound size={18}/> Student Identity Summary</h3>
                    <p>Verified account information from the Mentora student identity registry.</p>
                  </div>
                  <div className="details-grid">
                    <div><span>Full Name</span><strong>{data.profile.full_name || '—'}</strong></div>
                    <div><span>Email (Sign-in)</span><strong>{data.profile.email || '—'}</strong></div>
                    <div><span>Primary Phone</span><strong>{data.profile.phone || '—'}</strong></div>
                    <div><span>Guardian Mobile</span><strong>{data.registration?.guardian_phone || '—'}</strong></div>
                    <div><span>Grade</span><strong>{data.registration?.grade || '—'}</strong></div>
                    <div><span>Instruction Medium</span><strong>{data.registration?.medium || '—'}</strong></div>
                    <div><span>School</span><strong>{data.registration?.school || '—'}</strong></div>
                    <div><span>District</span><strong>{data.registration?.district || '—'}</strong></div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-title">
                    <h3><BookOpen size={18}/> Active Class Enrolments</h3>
                    <p>Classes currently available to this student in their portal.</p>
                  </div>
                  {data.enrolments.filter(e => e.status === 'active').length === 0 ? (
                    <p className="empty-inline">Student is not currently enrolled in any active classes.</p>
                  ) : (
                    <div className="table-overflow">
                      <table className="data-table">
                        <thead>
                          <tr><th>Class</th><th>Enrolled Since</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {data.enrolments.filter(e => e.status === 'active').map(e => (
                            <tr key={e.id}>
                              <td><b>{e.class_name}</b></td>
                              <td>{e.started_on}</td>
                              <td><span className="badge active">active</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="dashboard-right">
                <div className="sw-balance-cards">
                  <div className="sw-balance-card">
                    <span><Award size={14}/> Reward Points</span>
                    <b>{data.points?.balance?.toLocaleString('en-LK') ?? 0}</b>
                  </div>
                  <div className="sw-balance-card">
                    <span><Coins size={14}/> Mentora Coins</span>
                    <b>{data.coins?.balance?.toLocaleString('en-LK') ?? 0}</b>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Quick Actions</h3>
                      <p>Operational shortcuts for this learner</p>
                    </div>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                    <button className="btn btn-outline" style={{justifyContent: 'flex-start'}} onClick={() => setActiveTab('enrollments')}>
                      <BookOpen size={15}/> Manage Class Enrollments
                    </button>
                    <button className="btn btn-outline" style={{justifyContent: 'flex-start'}} onClick={() => setActiveTab('personal')}>
                      <UserRound size={15}/> Edit Personal Details
                    </button>
                    <button className="btn btn-outline" style={{justifyContent: 'flex-start'}} onClick={() => setActiveTab('payments')}>
                      <CreditCard size={15}/> View Invoices & Payments
                    </button>
                    <button className="btn btn-outline" style={{justifyContent: 'flex-start'}} onClick={() => setActiveTab('account')}>
                      <ShieldAlert size={15}/> Manage Account Access
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <div className="form-section">
              <div className="form-section-title">
                <h3><UserRound size={18}/> Personal Details</h3>
                <p>Edit verified student registration details. Changes are updated in the shared Mentora database.</p>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  void act(
                    {
                      action: 'update_registration',
                      first_name: firstName,
                      last_name: lastName,
                      date_of_birth: dob || null,
                      gender: gender || null,
                      district: district || null,
                      address: address || null,
                    },
                    'Personal details updated successfully.'
                  );
                }}
              >
                <div className="form-fields-grid">
                  <div className="form-field">
                    <label htmlFor="sw-first-name">First name *</label>
                    <input
                      id="sw-first-name"
                      required
                      maxLength={80}
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="sw-last-name">Last name *</label>
                    <input
                      id="sw-last-name"
                      required
                      maxLength={80}
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="sw-dob">Date of birth</label>
                    <input
                      id="sw-dob"
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="sw-gender">Gender</label>
                    <select id="sw-gender" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">— Select gender —</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="sw-district">District</label>
                    <select id="sw-district" value={district} onChange={e => setDistrict(e.target.value)}>
                      <option value="">— Select district —</option>
                      {SRI_LANKA_DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field form-field-wide">
                    <label htmlFor="sw-address">Home address</label>
                    <textarea
                      id="sw-address"
                      rows={3}
                      maxLength={500}
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="sw-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><Loader2 size={14} className="spin"/> Saving…</> : 'Save Personal Details'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ACADEMIC DETAILS */}
          {activeTab === 'academic' && (
            <div className="form-section">
              <div className="form-section-title">
                <h3><GraduationCap size={18}/> Academic Information</h3>
                <p>Current academic level, medium of instruction and school affiliation.</p>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  void act(
                    {
                      action: 'update_registration',
                      grade: grade || null,
                      medium: medium || null,
                      school: school || null,
                    },
                    'Academic details updated successfully.'
                  );
                }}
              >
                <div className="form-fields-grid">
                  <div className="form-field">
                    <label htmlFor="sw-grade">Academic Grade / Level</label>
                    <select id="sw-grade" value={grade} onChange={e => setGrade(e.target.value)}>
                      <option value="">— Select grade —</option>
                      {GRADES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="sw-medium">Medium of Instruction</label>
                    <select id="sw-medium" value={medium} onChange={e => setMedium(e.target.value)}>
                      <option value="">— Select medium —</option>
                      {MEDIUMS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field form-field-wide">
                    <label htmlFor="sw-school">School / Institution</label>
                    <input
                      id="sw-school"
                      maxLength={150}
                      placeholder="e.g. Royal College, Colombo"
                      value={school}
                      onChange={e => setSchool(e.target.value)}
                    />
                  </div>
                </div>
                <div className="sw-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><Loader2 size={14} className="spin"/> Saving…</> : 'Save Academic Details'}
                  </button>
                </div>
              </form>

              <div style={{marginTop: 35, paddingTop: 20, borderTop: '1px solid var(--border)'}}>
                <div className="form-section-title">
                  <h3>Enrolled Classes & Batches</h3>
                  <p>All academic classes this student has joined or completed.</p>
                </div>
                <div className="table-overflow">
                  <table className="data-table">
                    <thead>
                      <tr><th>Class Name</th><th>Enrolment Status</th><th>Started On</th><th>Ended On</th></tr>
                    </thead>
                    <tbody>
                      {data.enrolments.length === 0 ? (
                        <tr><td colSpan={4}>No class enrolment history.</td></tr>
                      ) : (
                        data.enrolments.map(e => (
                          <tr key={e.id}>
                            <td><b>{e.class_name}</b></td>
                            <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                            <td>{e.started_on}</td>
                            <td>{e.ended_on || 'Current'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONTACT DETAILS */}
          {activeTab === 'contact' && (
            <div className="form-section">
              <div className="form-section-title">
                <h3><Phone size={18}/> Contact Information</h3>
                <p>Manage primary telephone, guardian mobile number and verified sign-in email.</p>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  void act(
                    {
                      action: 'update_profile',
                      full_name: fullName,
                      phone: phone || null,
                    },
                    'Contact phone updated.'
                  );
                }}
              >
                <div className="form-fields-grid">
                  <div className="form-field">
                    <label htmlFor="sw-contact-email">Sign-in Email (Authentication Identity)</label>
                    <div className="field-display" id="sw-contact-email">
                      {data.profile.email || 'No email attached'}
                    </div>
                    <small>Email is governed by Supabase Auth security rules and cannot be silently overwritten.</small>
                  </div>
                  <div className="form-field">
                    <label htmlFor="sw-contact-phone">Student Phone Number</label>
                    <input
                      id="sw-contact-phone"
                      type="tel"
                      maxLength={32}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+94 7X XXX XXXX"
                    />
                  </div>
                </div>
                <div className="sw-actions" style={{marginBottom: 30}}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Phone'}
                  </button>
                </div>
              </form>

              <div style={{paddingTop: 20, borderTop: '1px solid var(--border)'}}>
                <div className="form-section-title">
                  <h3>Parent / Guardian Contact</h3>
                  <p>Emergency and guardian communication details captured during registration.</p>
                </div>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    void act(
                      {
                        action: 'update_registration',
                        guardian_phone: guardianPhone || null,
                      },
                      'Guardian phone updated.'
                    );
                  }}
                >
                  <div className="form-fields-grid">
                    <div className="form-field">
                      <label htmlFor="sw-guardian-phone">Parent / Guardian Mobile</label>
                      <input
                        id="sw-guardian-phone"
                        type="tel"
                        maxLength={32}
                        value={guardianPhone}
                        onChange={e => setGuardianPhone(e.target.value)}
                        placeholder="+94 7X XXX XXXX"
                      />
                    </div>
                  </div>
                  <div className="sw-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save Guardian Phone'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: CLASSES & ENROLLMENTS */}
          {activeTab === 'enrollments' && (
            <div className="form-section">
              <div className="form-section-title">
                <h3><BookOpen size={18}/> Manage Class Enrolments</h3>
                <p>Enrolling a student unlocks class lessons, timetable entries and study materials in their portal.</p>
              </div>

              <form
                className="sw-enroll"
                onSubmit={e => {
                  e.preventDefault();
                  if (enrollClassId) {
                    void act({action: 'enroll', class_id: enrollClassId}, 'Student enrolled successfully.');
                    setEnrollClassId('');
                  }
                }}
              >
                <div className="form-field">
                  <label htmlFor="sw-class-select">Select a class to enroll</label>
                  <select
                    id="sw-class-select"
                    required
                    value={enrollClassId}
                    onChange={e => setEnrollClassId(e.target.value)}
                  >
                    <option value="">Choose a class from your academy…</option>
                    {data.classes
                      .filter(c => !takenClassIds.has(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.term ? ` (${c.term})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving || !enrollClassId}>
                  Enroll Student
                </button>
              </form>

              <div className="table-overflow">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Started Date</th>
                      <th>End Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.enrolments.length === 0 ? (
                      <tr><td colSpan={5}>No classes assigned yet.</td></tr>
                    ) : (
                      data.enrolments.map(e => (
                        <tr key={e.id}>
                          <td><b>{e.class_name}</b></td>
                          <td><span className={`badge ${e.status}`}>{e.status}</span></td>
                          <td>{e.started_on}</td>
                          <td>{e.ended_on || 'Active'}</td>
                          <td>
                            <div className="sw-row-actions">
                              {e.status !== 'active' && (
                                <button
                                  className="btn btn-outline btn-small"
                                  disabled={saving}
                                  onClick={() => void act({action: 'set_status', enrolment_id: e.id, status: 'active'}, 'Enrolment reactivated.')}
                                >
                                  Reactivate
                                </button>
                              )}
                              {e.status === 'active' && (
                                <button
                                  className="btn btn-outline btn-small"
                                  disabled={saving}
                                  onClick={() => void act({action: 'set_status', enrolment_id: e.id, status: 'paused'}, 'Enrolment paused.')}
                                >
                                  Pause
                                </button>
                              )}
                              {e.status !== 'left' && (
                                <button
                                  className="btn btn-outline btn-small"
                                  disabled={saving}
                                  onClick={() => {
                                    if (confirm('Remove this student from the class? Their academic records will remain preserved.')) {
                                      void act({action: 'set_status', enrolment_id: e.id, status: 'left'}, 'Student removed from class.');
                                    }
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PAYMENTS & INVOICES */}
          {activeTab === 'payments' && (
            <div className="form-section">
              <div className="form-section-title">
                <h3><CreditCard size={18}/> Invoices & Payment History</h3>
                <p>Track student invoice requests, bank slips and payment approvals.</p>
              </div>

              {data.invoices.length === 0 ? (
                <div className="empty">
                  <CreditCard size={28}/>
                  <b>No payment transactions recorded</b>
                  <span>When this student purchases course access or pays tuition, invoices will appear here.</span>
                </div>
              ) : (
                <div className="table-overflow">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Course / Scope</th>
                        <th>Amount</th>
                        <th>Payment Method</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map(inv => (
                        <tr key={inv.id}>
                          <td><b>{inv.invoice_no}</b></td>
                          <td>{inv.course_name}</td>
                          <td>Rs. {Number(inv.amount).toLocaleString('en-LK')}</td>
                          <td style={{textTransform: 'capitalize'}}>{inv.payment_method.replace('_', ' ')}</td>
                          <td><span className={`badge ${inv.status}`}>{inv.status}</span></td>
                          <td>{new Date(inv.created_at).toLocaleDateString('en-LK', {dateStyle: 'medium'})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: LEARNING & EXAMS */}
          {activeTab === 'learning' && (
            <div className="form-section">
              <div className="form-section-title">
                <h3><GraduationCap size={18}/> Assessments & Examination Attempts</h3>
                <p>Audited test submissions, scores and performance metrics.</p>
              </div>

              {data.exam_attempts.length === 0 ? (
                <div className="empty">
                  <School size={28}/>
                  <b>No exam submissions recorded</b>
                  <span>Completed tests and auto-graded assessments will be listed here.</span>
                </div>
              ) : (
                <div className="table-overflow">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Assessment</th>
                        <th>Score</th>
                        <th>Total Marks</th>
                        <th>Started At</th>
                        <th>Submitted At</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.exam_attempts.map(att => (
                        <tr key={att.id}>
                          <td><b>{att.exam_name}</b></td>
                          <td>{att.score !== null ? att.score : 'Pending'}</td>
                          <td>{att.total_marks ?? '—'}</td>
                          <td>{new Date(att.started_at).toLocaleString('en-LK', {dateStyle: 'short', timeStyle: 'short'})}</td>
                          <td>{att.submitted_at ? new Date(att.submitted_at).toLocaleString('en-LK', {dateStyle: 'short', timeStyle: 'short'}) : 'In Progress'}</td>
                          <td>
                            <span className={`badge ${att.submitted_at ? 'completed' : 'pending'}`}>
                              {att.submitted_at ? 'Completed' : 'Active Attempt'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{marginTop: 32}}>
                <div className="form-section-title">
                  <h3><FileText size={18}/> Issued Academic Report Cards</h3>
                  <p>Certified term progress reports and official performance summaries.</p>
                </div>

                {!data.report_cards || data.report_cards.length === 0 ? (
                  <div className="empty">
                    <FileText size={28}/>
                    <b>No report cards issued</b>
                    <span>You can issue and publish report cards from the Report Cards module.</span>
                  </div>
                ) : (
                  <div className="table-overflow">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Report Title</th>
                          <th>Term / Batch</th>
                          <th>Overall Grade</th>
                          <th>Average</th>
                          <th>Status</th>
                          <th>Issued Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.report_cards.map(rc => (
                          <tr key={rc.id}>
                            <td><b>{rc.title}</b></td>
                            <td>{rc.term || '—'}</td>
                            <td><span className="badge active">{rc.overall_grade || 'A'}</span></td>
                            <td>{rc.average_score !== null ? `${rc.average_score}%` : '—'}</td>
                            <td><span className={`badge ${rc.status}`}>{rc.status}</span></td>
                            <td>{rc.published_at ? new Date(rc.published_at).toLocaleDateString('en-LK') : new Date(rc.created_at).toLocaleDateString('en-LK')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: REWARDS (POINTS & COINS) */}
          {activeTab === 'rewards' && (
            <div>
              <div className="sw-balance-cards">
                <div className="sw-balance-card" style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                  <div>
                    <span><Award size={15}/> Reward Points Balance</span>
                    <b>{data.points?.balance?.toLocaleString('en-LK') ?? 0}</b>
                    <p style={{fontSize: 11, color: 'var(--muted)', margin: '8px 0 0'}}>Awarded for attendance, submissions and academic merit.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    style={{marginTop: 14, alignSelf: 'flex-start'}}
                    onClick={() => {
                      setRewardModal({kind: 'points', label: 'Reward Points'});
                      setRewardDelta('50');
                      setRewardReason('');
                      setRewardError('');
                    }}
                  >
                    <PlusCircle size={13}/> Adjust Points
                  </button>
                </div>
                <div className="sw-balance-card" style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
                  <div>
                    <span><Coins size={15}/> Mentora Coins Wallet</span>
                    <b>{data.coins?.balance?.toLocaleString('en-LK') ?? 0}</b>
                    <p style={{fontSize: 11, color: 'var(--muted)', margin: '8px 0 0'}}>Usable for store purchases and academy merchandise.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-small"
                    style={{marginTop: 14, alignSelf: 'flex-start'}}
                    onClick={() => {
                      setRewardModal({kind: 'coins', label: 'Mentora Coins'});
                      setRewardDelta('100');
                      setRewardReason('');
                      setRewardError('');
                    }}
                  >
                    <PlusCircle size={13}/> Adjust Coins
                  </button>
                </div>
              </div>

              {/* In-place Reward Adjustment Modal */}
              {rewardModal && (
                <AccessibleDialog label="Adjust student rewards" onClose={()=>{if(!saving)setRewardModal(null);}}>
                  <div className="modal" style={{maxWidth: 480}}>
                    <div className="modal-head">
                      <h2>Adjust {rewardModal.label}</h2>
                      <button aria-label="Close reward adjustment" className="icon-btn" onClick={() => setRewardModal(null)}><X size={18}/></button>
                    </div>

                    {rewardError && <div role="alert" className="error">{rewardError}</div>}

                    <form onSubmit={handleRewardAdjust} style={{display: 'flex', flexDirection: 'column', gap: 14}}>
                      <div className="form-field">
                        <label htmlFor="studentworkspace-field-1">Adjustment Amount (+ to award, - to deduct) <span className="required">*</span></label>
                        <input id="studentworkspace-field-1"
                          type="number"
                          step="1"
                          required
                          value={rewardDelta}
                          onChange={e => setRewardDelta(e.target.value)}
                          placeholder="e.g. 50 or -20"
                        />
                        <small>Enter a positive integer to credit, or negative to debit.</small>
                      </div>

                      <div className="form-field">
                        <label htmlFor="studentworkspace-field-2">Auditable Reason <span className="required">*</span></label>
                        <textarea id="studentworkspace-field-2"
                          rows={3}
                          required
                          value={rewardReason}
                          onChange={e => setRewardReason(e.target.value)}
                          placeholder="e.g. 1st place in monthly science quiz, or textbook exchange credit"
                        />
                        <small>This explanation is permanently recorded in the student&apos;s reward ledger.</small>
                      </div>

                      <div className="modal-footer">
                        <button type="button" className="btn btn-outline" onClick={() => setRewardModal(null)} disabled={rewardSaving}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={rewardSaving}>
                          {rewardSaving ? 'Recording...' : `Confirm ${rewardModal.label} Adjustment`}
                        </button>
                      </div>
                    </form>
                  </div>
                </AccessibleDialog>
              )}

              <div className="form-section">
                <div className="form-section-title">
                  <h3>Reward Transaction History</h3>
                  <p>Ledger of points and coins awarded, redeemed or adjusted.</p>
                </div>

                {data.reward_transactions.length === 0 ? (
                  <div className="empty">
                    <Sparkles size={28}/>
                    <b>No reward transactions</b>
                    <span>Points and coins adjustments will appear with before and after audit balances.</span>
                  </div>
                ) : (
                  <div className="table-overflow">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Currency</th>
                          <th>Change (Delta)</th>
                          <th>Balance Before</th>
                          <th>Balance After</th>
                          <th>Reason / Description</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.reward_transactions.map(tx => (
                          <tr key={tx.id}>
                            <td style={{textTransform: 'capitalize'}}><b>{tx.kind}</b></td>
                            <td style={{color: tx.delta > 0 ? '#0a9a72' : '#c03844', fontWeight: 700}}>
                              {tx.delta > 0 ? `+${tx.delta}` : tx.delta}
                            </td>
                            <td>{tx.before_balance}</td>
                            <td>{tx.after_balance}</td>
                            <td>{tx.reason}</td>
                            <td>{new Date(tx.created_at).toLocaleString('en-LK')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 9: ACCOUNT & SECURITY */}
          {activeTab === 'account' && (
            <div className="form-section">
              <div className="form-section-title">
                <h3><ShieldAlert size={18}/> Student Account Status & Governance</h3>
                <p>Enforce server-side suspension, archive inactive accounts, or review security access.</p>
              </div>

              <div className="sw-account-status">
                <div>
                  <span style={{fontSize: 11, color: 'var(--muted)', display: 'block'}}>Current Account Status</span>
                  <span className={`badge ${accountStatus === 'active' ? 'active' : accountStatus === 'suspended' ? 'rejected' : 'draft'}`} style={{fontSize: 13, marginTop: 4}}>
                    {accountStatus.toUpperCase()}
                  </span>
                </div>
                <p>
                  {accountStatus === 'active' && 'The student account is active. The user can sign into the Student Portal and view assigned classes.'}
                  {accountStatus === 'suspended' && 'This account is suspended. All portal and protected video playback access will be rejected.'}
                  {accountStatus === 'archived' && 'This account is archived. Historical academic and payment records remain preserved for audits.'}
                </p>
                <div className="sw-account-actions">
                  {accountStatus !== 'active' && (
                    <button
                      className="btn btn-primary btn-small"
                      disabled={saving}
                      onClick={() => {
                        if (confirm('Reactivate this student account?')) {
                          void act({action: 'set_account_status', status: 'active'}, 'Account set to active.');
                        }
                      }}
                    >
                      Activate Account
                    </button>
                  )}
                  {accountStatus !== 'suspended' && (
                    <button
                      className="btn btn-outline btn-small btn-danger"
                      disabled={saving}
                      onClick={() => {
                        if (confirm('Suspend this student account? All active sessions and video access will be stopped.')) {
                          void act({action: 'set_account_status', status: 'suspended', reason: 'Manager manual suspension'}, 'Account suspended.');
                        }
                      }}
                    >
                      Suspend Access
                    </button>
                  )}
                  {accountStatus !== 'archived' && (
                    <button
                      className="btn btn-outline btn-small"
                      disabled={saving}
                      onClick={() => {
                        if (confirm('Archive this student record?')) {
                          void act({action: 'set_account_status', status: 'archived', reason: 'Manager archival'}, 'Account archived.');
                        }
                      }}
                    >
                      Archive Account
                    </button>
                  )}
                </div>
              </div>

              <div style={{paddingTop: 20, borderTop: '1px solid var(--border)'}}>
                <div className="form-section-title">
                  <h3>Password Recovery & Authentication Protocol</h3>
                  <p>In accordance with Mentora cybersecurity guidelines, managers never view or set student passwords directly.</p>
                </div>
                <div style={{background: '#f8fafc', padding: '16px 20px', borderRadius: 12, border: '1px solid #e2e8f0'}}>
                  <p style={{margin: 0, fontSize: 12.5, color: '#334155', lineHeight: 1.6}}>
                    Students reset their own credentials through the self-service flow at <code>/forgot-password</code>.
                    If this student is having trouble receiving reset links, confirm their registered email (<code>{data.profile.email || 'None'}</code>) matches their identity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: ACTIVITY LOGS */}
          {activeTab === 'activity' && (
            <div className="form-section">
              <div className="form-section-title">
                <h3><Activity size={18}/> Student Activity Audit Trail</h3>
                <p>Auditable log of logins, course material downloads, lesson joins and test submissions.</p>
              </div>

              {data.activity.length === 0 ? (
                <div className="empty">
                  <History size={28}/>
                  <b>No recent activity logs recorded</b>
                  <span>Activity heartbeats and event logs will populate here as the student interacts with the portal.</span>
                </div>
              ) : (
                <div className="table-overflow">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Resource Type</th>
                        <th>Resource ID</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.activity.map(item => (
                        <tr key={item.id}>
                          <td><b>{item.action}</b></td>
                          <td>{item.resource_type || '—'}</td>
                          <td>
                            <code style={{fontSize: 10, background: '#f0f4f7', padding: '2px 5px', borderRadius: 4}}>
                              {item.resource_id ? item.resource_id.slice(0, 18) + '…' : '—'}
                            </code>
                          </td>
                          <td>{new Date(item.created_at).toLocaleString('en-LK')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
