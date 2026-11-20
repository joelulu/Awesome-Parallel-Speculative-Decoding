// 证据等级角标。
//
// 图上有 30 条「待复核」和 20 条「导入未核验」，但它们此前和已核验条目长得完全一样，
// 读者无法判断哪条可以引用。这里把内部两个字段（status、citationStatus）折叠成
// 一个读者能看懂的等级，并且只用这一处口径，避免各页面各说各话。
import type { Method } from './types';

export type EvidenceLevel = 'root' | 'verified' | 'review' | 'imported';

export function evidenceLevel(method: Method): EvidenceLevel {
  if (method.citationStatus === 'root') return 'root';
  if (method.status === 'imported') return 'imported';
  return method.citationStatus === 'confirmed' ? 'verified' : 'review';
}

export const EVIDENCE_COPY: Record<EvidenceLevel, { label: string; hint: string }> = {
  root: { label: '起点', hint: '本专题的起始方法，作为全局参照。' },
  verified: { label: '已核验', hint: '论文身份与实验对照均已核对原文或官方页面。' },
  review: { label: '待复核', hint: '条目已整理，但论文身份或实验数字尚未二次核对，引用前请回原文确认。' },
  imported: { label: '导入未核验', hint: '来自历史批量导入，尚未按当前口径逐项核对。' },
};

export default function EvidenceBadge({ method, className = '' }: { method: Method; className?: string }) {
  const level = evidenceLevel(method);
  const copy = EVIDENCE_COPY[level];
  return <span className={`evidence-badge ${className}`} data-level={level} title={copy.hint}>
    <i aria-hidden="true"/>{copy.label}
  </span>;
}
