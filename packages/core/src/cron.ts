import { CronExpressionParser } from 'cron-parser';
export const CRON_RULES =
  '五欄 Unix Cron；日與星期同時受限時採 OR。依 cron-parser 5.10.2 預覽；夏令時間跳時可能延後執行，重複時段的固定鐘點只列一次。實際排程器規則可能不同，請以部署平台確認。';
export function previewCron(expression: string, zone: string, displayZone: string, start: string) {
  const parts = expression.trim().split(/\s+/);
  if (expression.length > 200 || parts.length !== 5 || parts.some((p) => !/^[\d*,/-]+$/.test(p)))
    throw new Error(
      '只支援五欄數字 Unix Cron：分 時 日 月 星期。可用 * , - /；不支援秒、Quartz、AWS、?、L、W、# 或別名。',
    );
  for (const z of [zone, displayZone]) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: z }).format();
    } catch {
      throw new Error(`無效 IANA 時區：${z}`);
    }
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?Z$/.test(start) ||
    !Number.isFinite(Date.parse(start))
  )
    throw new Error('起算時間請用 UTC ISO 格式，例如 2026-01-01T00:00:00Z。');
  const date = new Date(start);
  if (date.getUTCFullYear() < 1970 || date.getUTCFullYear() > 2100)
    throw new Error('起算年份限 1970–2100。');
  // Reject dates Date.parse would silently normalize (for example February 30).
  if (date.toISOString().slice(0, 16) !== start.slice(0, 16)) throw new Error('起算日期不存在。');
  const cron = CronExpressionParser.parse(parts.join(' '), { currentDate: date, tz: zone });
  const fields = cron.fields;
  const names = ['分鐘', '小時', '日', '月', '星期（0／7 為日）'];
  const values = [
    fields.minute.values,
    fields.hour.values,
    fields.dayOfMonth.values,
    fields.month.values,
    fields.dayOfWeek.values,
  ];
  const describe = names.map((name, i) => `${name}：${parts[i]} → ${values[i]?.join(', ')}`);
  const format = (d: Date, z: string) =>
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: z,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    }).format(d);
  const times = Array.from({ length: 10 }, () => {
    const d = cron.next().toDate();
    return { utc: d.toISOString(), schedule: format(d, zone), local: format(d, displayZone) };
  });
  return {
    expression: parts.join(' '),
    zone,
    displayZone,
    start: date.toISOString(),
    rules: CRON_RULES,
    describe,
    times,
  };
}
