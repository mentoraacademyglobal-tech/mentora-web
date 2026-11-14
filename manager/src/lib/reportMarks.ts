import {z} from 'zod';
const subject = z.object({
 subject:z.string().trim().min(1).max(200),
 marks:z.number().finite().min(0),
 max_marks:z.number().finite().positive().optional(),
 grade:z.string().max(30).optional(),
 remarks:z.string().max(1000).optional(),
}).refine(row=>row.marks <= (row.max_marks ?? 100), 'Marks cannot exceed maximum marks');
export function parseSubjectMarks(value: unknown) {
 const decoded = typeof value === 'string' ? JSON.parse(value || '[]') : value;
 return z.array(subject).max(100).parse(decoded);
}
