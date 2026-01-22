// Alias route for CRON path defined in vercel.json
// We cannot re-export route segment config (dynamic/maxDuration),
// so we mirror the same config literals here.
export { GET } from "../refresh-menus/route";
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
