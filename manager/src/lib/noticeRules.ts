/** Validation for admin-created notices. Database RLS is authoritative for readership. */
export type NoticeInput = Record<string, unknown>;
export type NoticeValidation = {ok:true}|{ok:false;error:string};
const AUDIENCES = new Set(['all','students','teachers','admins']);
const STATES = new Set(['draft','published','archived']);

export function validateNotice(input: NoticeInput): NoticeValidation {
  if (input.name !== undefined &&
    (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 200))
    return {ok:false,error:'Announcement title must be 1–200 characters.'};
  if (input.audience !== undefined && !AUDIENCES.has(String(input.audience)))
    return {ok:false,error:'Choose a valid announcement audience.'};
  if (input.status !== undefined && !STATES.has(String(input.status)))
    return {ok:false,error:'Announcement state must be draft, published or archived.'};
  if (input.class_id && (typeof input.class_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.class_id)))
    return {ok:false,error:'Invalid target class identifier.'};
  const from = input.publish_at;
  const to = input.expires_at;
  for (const [key, value] of [['publish_at',from],['expires_at',to]] as const) {
    if (value !== undefined && value !== null && value !== '' &&
       (typeof value !== 'string' || !Number.isFinite(Date.parse(value))))
      return {ok:false,error:`Invalid ${key} date.`};
  }
  if (from && to && new Date(String(to)).getTime() <= new Date(String(from)).getTime())
    return {ok:false,error:'Expiry must be after publication.'};
  return {ok:true};
}
