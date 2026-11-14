'use client';
import {optimizeUpload} from '@/lib/optimizeUpload';

import AccessibleDialog from '@/components/ui/AccessibleDialog';
import {useState, useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {formatLkr} from '@/components/ui/StudentUI';

type OrderButtonProps = {
  productId: string;
  productName: string;
  price: number;
  category: 'tutes' | 'merchandise' | 'videos' | 'classes' | 'recordings';
  label?: string;
  contact?: {full_name?: string | null; phone?: string | null; address?: string | null} | null;
  buttonClassName?: string;
};

export default function OrderButton({
  productId,
  productName,
  price,
  category,
  label,
  buttonClassName,
  contact,
}: OrderButtonProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'bank_deposit' | 'cash'>('bank_deposit');
  const [recipientName, setRecipientName] = useState(contact?.full_name ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<{code:string; amount:number} | null>(null);
  const [quoting, setQuoting] = useState(false);
  const code = coupon.trim().toUpperCase();
  const matchingQuote = quote?.code === code ? quote : null;
  const amount = matchingQuote?.amount ?? price;
  const slipRequired = method === 'bank_deposit' && !(category === 'tutes' && amount === 0);
  async function applyCoupon() {
    setQuoting(true);
    setError('');
    setQuote(null);
    try {
      const response = await fetch('/api/student/purchases/quote', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({item:productId,code}),
      });
      const data = await response.json();
      if (!response.ok || typeof data.amount !== 'number') throw new Error(data.error || 'Unable to check coupon.');
      setQuote({code, amount:data.amount});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check coupon.');
    } finally {
      setQuoting(false);
    }
  }
  const [shippingAddress, setShippingAddress] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [originalSlip, setOriginalSlip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ref: string; message: string} | null>(null);
  const [bankInfo, setBankInfo] = useState<{bank_name?: string; bank_branch?: string; bank_account_no?: string; bank_account_name?: string; bank_instructions?: string} | null>(null);
  const [bankError, setBankError] = useState('');
  const receipt = useRef<{file: File; path: string} | null>(null);
  const orderRequest = useRef<{signature: string; id: string} | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      void fetch('/api/student/settings')
        .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Bank details unavailable.'); return data; })
        .then(d => {setBankInfo(d); setBankError('');})
        .catch(e => {setBankInfo(null); setBankError(e instanceof Error ? e.message : 'Bank details unavailable.');});
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (category === 'tutes' && code && !matchingQuote) throw new Error('Apply the coupon to confirm the total.');
      if (slipRequired && (!bankInfo?.bank_account_no || !slipFile)) throw new Error('Verified bank details and a payment receipt are required.');
      let slipPath: string | null = null;

      // 1. If bank slip uploaded, upload it first
      if (slipRequired && slipFile) {
        if (receipt.current?.file === slipFile) slipPath = receipt.current.path;
        else {
        const fd = new FormData();
        fd.set('file', originalSlip ? slipFile : await optimizeUpload(slipFile, true));
        const slipRes = await fetch('/api/student/purchases/proof', {
          method: 'POST',
          body: fd,
        });
        const slipJson = await slipRes.json();
        if (!slipRes.ok || !slipJson.path) throw new Error(slipJson.error || 'Receipt upload failed. Please retry.');
        slipPath = slipJson.path;
        receipt.current = {file: slipFile, path: slipJson.path};
        }
      }

      // 2. Submit purchase request
      const typeKey =
        category === 'tutes'
          ? 'tute'
          : category === 'merchandise'
          ? 'merchandise'
          : category === 'classes'
          ? 'class'
          : category === 'recordings'
          ? 'recording'
          : 'video';

      const body: Record<string, unknown> = {
        type: typeKey,
        payment_method: method,
        payment_proof_path: slipPath,
      };

      if (typeKey === 'class') body.class_id = productId;
      else if (typeKey === 'recording') body.recording_id = productId;
      else if (typeKey === 'video') body.video_id = productId;
      else if (typeKey === 'tute') {
        body.tute_id = productId;
        body.delivery_method = 'courier';
        body.recipient_name = recipientName.trim();
        body.phone = phone.trim();
        body.shipping_address = shippingAddress.trim();
        body.coupon_code = code;
        body.expected_amount = amount;
      } else if (typeKey === 'merchandise') {
        body.product_id = productId;
        body.quantity = 1;
        body.shipping_address = shippingAddress || undefined;
      }

      const signature = JSON.stringify(body);
      if (orderRequest.current?.signature !== signature) orderRequest.current = {signature, id: crypto.randomUUID()};
      body.request_id = orderRequest.current.id;
      const res = await fetch('/api/student/purchases', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to place order');

      setSuccess({
        ref: json.reference,
        message: json.message || 'Order placed successfully.',
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order submission failed');
    } finally {
      setLoading(false);
    }
  }

  const defaultLabel =
    label ||
    (category === 'videos'
      ? 'Get Access'
      : category === 'tutes'
      ? 'Order Tute'
      : category === 'merchandise'
      ? 'Buy Product'
      : category === 'classes'
      ? 'Enroll & Pay'
      : 'Unlock Recording');

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setCoupon('');
          setQuote(null);
          setRecipientName(contact?.full_name ?? '');
          setPhone(contact?.phone ?? '');
          setShippingAddress(contact?.address ?? '');
          setError('');
          setSuccess(null);
          setBankInfo(null);
          setBankError('');
          setSlipFile(null);
          setOriginalSlip(false);
          receipt.current = null;
          orderRequest.current = null;
        }}
        className={buttonClassName || 'student-action student-action-primary text-xs'}
      >
        {defaultLabel}
      </button>

      {open && (
        <AccessibleDialog label="Place an order" onClose={()=>{if(!loading)setOpen(false);}}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
            {success ? (
              <div className="space-y-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint/20 text-2xl text-[#0b9e77]">
                  ✓
                </span>
                <h3 className="text-lg font-extrabold text-ink">Order Submitted</h3>
                <p className="text-xs text-slate-text">{success.message}</p>
                <div className="rounded-xl border border-line bg-page p-3">
                  <p className="text-[11px] text-slate-text">Order Reference</p>
                  <p className="font-mono text-base font-extrabold text-ink">{success.ref}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push('/purchases');
                    }}
                    className="student-action student-action-primary flex-1"
                  >
                    View in My Purchases →
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="student-action border border-line bg-page text-ink"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-ink">{productName}</h3>
                    <p className="text-xs text-slate-text">Review and confirm your order request</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-lg font-bold text-slate-text hover:text-ink"
                  >
                    ×
                  </button>
                </div>

                {error && (
                  <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-line bg-page p-3">
                  <span className="text-xs text-slate-text">Price:</span>
                  <strong className="text-base font-extrabold text-ink">{formatLkr(price)}</strong>
                </div>

                {category === 'tutes' && (
                  <fieldset className="space-y-2" disabled={loading || quoting}>
                    <label className="block">Coupon code (optional)<input className="block w-full rounded border p-2" maxLength={40} value={coupon} onChange={e=>{setCoupon(e.target.value);setQuote(null);}} /></label>
                    {code && <button type="button" className="student-action border" onClick={applyCoupon}>{quoting ? 'Checking…' : 'Apply coupon'}</button>}
                    <p aria-live="polite">{code && !matchingQuote ? 'Apply the code to see your total.' : `Amount due: ${formatLkr(amount)}`}</p>
                  </fieldset>
                )}
                {!(category === 'tutes' && amount === 0) && <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink" htmlFor="orderbutton-field-1">Payment Method</label>
                  <select id="orderbutton-field-1"
                    value={method}
                    onChange={e => setMethod(e.target.value as 'bank_deposit' | 'cash')}
                    className="w-full rounded-xl border border-line bg-page p-2.5 text-xs text-ink"
                  >
                    <option value="bank_deposit">Bank Deposit / Transfer</option>
                    <option value="cash">Cash Payment at Academy</option>
                  </select>
                </div>}

                {slipRequired && (
                  <div className="space-y-1.5 rounded-xl border border-[#b7dbe4] bg-[#e7f4f8] p-3 text-xs text-[#28596a]">
                    <p className="font-bold">Academy Bank Transfer Details:</p>
                    {!bankInfo && <p role="alert">{bankError || 'Loading verified bank details…'}</p>}
                    <p className="font-semibold text-ink">
                      {bankInfo?.bank_name} {bankInfo?.bank_branch ? `(${bankInfo.bank_branch})` : ''}
                    </p>
                    {bankInfo?.bank_account_no && <p>
                      Account: <strong>{bankInfo.bank_account_no}</strong> — {bankInfo.bank_account_name}
                    </p>}
                    {bankInfo?.bank_instructions && (
                      <p className="mt-1 rounded bg-white/60 p-1.5 text-[11px] text-[#28596a]">
                        ℹ {bankInfo.bank_instructions}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-slate-text">
                      Please attach your deposit slip photo or bank transfer receipt below:
                    </p>
                    <input
                      aria-label="Payment receipt"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      disabled={!bankInfo}
                      onChange={e => {setSlipFile(e.target.files?.[0] ?? null);receipt.current=null;}}
                      className="mt-1 w-full text-xs"
                    />
                    <label className="mt-2 flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={originalSlip} disabled={loading} onChange={e=>{setOriginalSlip(e.target.checked);receipt.current=null;}} />
                      Upload original image without compression
                    </label>
                    <p className="mt-1 text-xs">Images are optimized at full resolution. PDFs stay unchanged.</p>
                  </div>
                )}

                {category === 'tutes' && (
                  <fieldset className="space-y-2" disabled={loading}>
                    <legend className="font-bold">Courier delivery</legend>
                    <label className="block">Recipient name<input className="block w-full rounded border p-2" autoComplete="shipping name" required maxLength={100} value={recipientName} onChange={e=>setRecipientName(e.target.value)} /></label>
                    <label className="block">Contact phone<input className="block w-full rounded border p-2" autoComplete="shipping tel" type="tel" required maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} /></label>
                  </fieldset>
                )}

                {(category === 'merchandise' || category === 'tutes') && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink" htmlFor="orderbutton-field-3">Courier Delivery Address</label>
                    <textarea id="orderbutton-field-3"
                      required maxLength={500} autoComplete="shipping street-address"
                      rows={2}
                      value={shippingAddress}
                      onChange={e => setShippingAddress(e.target.value)}
                      placeholder="House number, street, town and postal code"
                      className="w-full rounded-xl border border-line bg-page p-2.5 text-xs text-ink"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                    className="student-action border border-line bg-page text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || quoting || Boolean(code && !matchingQuote) || (slipRequired && (!bankInfo?.bank_account_no || !slipFile))}
                    className="student-action student-action-primary flex-1"
                  >
                    {loading ? 'Submitting…' : `Confirm Order (${formatLkr(amount)})`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </AccessibleDialog>
      )}
    </>
  );
}
