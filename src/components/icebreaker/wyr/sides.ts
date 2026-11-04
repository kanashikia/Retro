import { IceBreakerSubmission } from '../../../types';

export type Side = 'a' | 'b';

export const SIDE_COLORS = { a: '#ec4899', b: '#6366f1' } as const;

export const splitOf = (votes: Record<string, IceBreakerSubmission> = {}) => {
  const all = Object.values(votes);
  const a = all.filter(v => v.text === 'a').length;
  const b = all.filter(v => v.text === 'b').length;
  return { a, b, total: a + b };
};
