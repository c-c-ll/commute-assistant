import type { TransitPlan, TransitStep, WalkStep, TimetableStop } from "../types";

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE)
  || "https://nsfrkquwczuceztrmzhl.supabase.co/functions/v1/amap-proxy/api";

interface AmapTransitResponse {
  status: string; count: string; info: string;
  route: { origin: string; destination: string; distance: string; taxi_cost: string; transits: AmapTransit[]; } | undefined;
}

interface AmapTransit {
  cost: string; duration: string; nightflag: string; walking_distance: string; distance: string; missed: string;
  segments: AmapSegment[];
}

interface AmapPortal { name: string; location: string; }

interface AmapSegment {
  walking: { origin: string; destination: string; distance: string; duration: string; steps: AmapWalkStep[]; };
  bus?: { buslines: AmapBusLine[]; };
  entrance?: AmapPortal | AmapPortal[];
  exit?: AmapPortal | AmapPortal[];
}

interface AmapBusLine {
  name: string; type: string; cost: string; duration: string; distance: string;
  via_num: string; via_stops: Array<{ name: string; location: string }>;
  departure_stop: { name: string; location: string; id?: string };
  arrival_stop: { name: string; location: string; id?: string };
  color?: string;
  start_time?: string | string[]; end_time?: string | string[];
}

interface AmapWalkStep {
  instruction: string; orientation: string; road: string | string[]; distance: string; action: string | string[];
}

export interface InputTip {
  id: string; name: string; district: string; location: string; address: string; typecode: string;
}

let queryTimestamp = 0;
export function getQueryTimestamp(): number { return queryTimestamp; }

function getPortalName(portal: AmapPortal | AmapPortal[] | undefined): string {
  if (!portal) return "";
  if (Array.isArray(portal)) return portal.length > 0 ? portal[0].name : "";
  return portal.name || "";
}

function extractWalkRoad(step: AmapWalkStep): string {
  var road = step.road;
  if (typeof road === "string") return road;
  if (Array.isArray(road) && road.length > 0) return road[0];
  return "";
}

function extractAction(step: AmapWalkStep): string {
  var action = step.action;
  if (typeof action === "string") return action;
  if (Array.isArray(action) && action.length > 0) return action[0];
  return "";
}

function pickTime(val: string | string[] | undefined): string {
  if (!val) return "";
  if (Array.isArray(val)) return val.length > 0 ? val[0] : "";
  return val;
}

export function formatTimeStr(time: string): string {
  if (!time || time.length !== 4) return time || "";
  return time.slice(0, 2) + ":" + time.slice(2);
}

function parseSteps(transit: AmapTransit): TransitStep[] {
  var steps: TransitStep[] = [];
  var segments = transit.segments;
  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    var hasTransit = seg.bus && seg.bus.buslines.length > 0;
    var wd = seg.walking ? parseInt(seg.walking.distance) : 0;
    if (seg.walking && wd > 0) {
      var wdur = parseInt(seg.walking.duration);
      var wss = seg.walking.steps;
      var sub: WalkStep[] = wss.map(function(s) { return { road: extractWalkRoad(s), distance: parseInt(s.distance) || 0, action: extractAction(s) }; });
      var isFirst = i === 0;
      var isLast = i === segments.length - 1 && !hasTransit;
      var msg = "";
      if (isFirst) msg = "步行" + wd + "米至公交站";
      else if (isLast) msg = "步行" + wd + "米到达目的地";
      else { var ns = segments[i+1]; var nl = ns && ns.bus && ns.bus.buslines ? ns.bus.buslines[0] : null; msg = nl ? "步行" + wd + "米换乘" + nl.name : "步行" + wd + "米（约" + Math.ceil(wdur/60) + "分钟）"; }
      steps.push({ instruction: msg, type: "walk", distance: wd, duration: wdur, walkSteps: sub });
    }
    if (hasTransit && seg.bus && seg.bus.buslines) {
      var line = seg.bus.buslines[0];
      var isSub = line.type.includes("地铁");
      var sc = parseInt(line.via_num) + 1;
      var from = line.departure_stop ? line.departure_stop.name : "";
      var to = line.arrival_stop ? line.arrival_stop.name : "";
      var vn: string[] = line.via_stops ? line.via_stops.map(function(s) { return s.name; }) : [];
      var sl: TimetableStop[] = [{ name: from, isDeparture: true, isArrival: false }];
      for (var j = 0; j < vn.length; j++) sl.push({ name: vn[j], isDeparture: false, isArrival: false });
      if (to && to !== from) sl.push({ name: to, isDeparture: false, isArrival: true });
      var dn = line.name.replace(/\(.*?\)/g, "").replace("地铁", "").replace("号线", "号线");
      var en = getPortalName(seg.entrance);
      if (en) steps.push({ instruction: "从" + en + "进站", type: "transfer" });
      steps.push({ instruction: "乘坐" + dn + "（" + from + "->" + to + "，" + sc + "站）", type: isSub ? "subway" : "bus", lineName: dn, lineColor: line.color || (isSub ? "#2563eb" : "#10b981"), lineType: line.type, stationCount: sc, duration: parseInt(line.duration), distance: parseInt(line.distance), from: from, to: to, viaStops: vn, startTime: pickTime(line.start_time), endTime: pickTime(line.end_time), stopList: sl });
      var ex = getPortalName(seg.exit);
      if (ex) steps.push({ instruction: "从" + ex + "出站", type: "transfer" });
    }
  }
  return steps;
}

function countTransfers(transit: AmapTransit): number {
  var c = 0;
  for (var i = 0; i < transit.segments.length; i++) if (transit.segments[i].bus && transit.segments[i].bus!.buslines.length > 0) c++;
  return Math.max(0, c - 1);
}

export function parseTransitResponse(data: AmapTransitResponse): TransitPlan[] {
  if (!data.route || !data.route.transits) return [];
  var plans: TransitPlan[] = data.route.transits.map(function(t, idx) {
    var st = parseSteps(t);
    var tags: string[] = [];
    if (st.some(function(s) { return s.type === "subway"; })) tags.push("地铁");
    var tf = countTransfers(t);
    if (tf === 0) tags.push("直达");
    var cst = parseFloat(t.cost) || 0;
    if (cst === 0) tags.push("免费");
    return { id: "plan-" + idx, totalDuration: parseInt(t.duration), totalDistance: parseInt(t.distance), walkDistance: parseInt(t.walking_distance), cost: cst, transferCount: tf, tags: tags, steps: st, isRecommended: idx === 0 };
  });
  plans.sort(function(a, b) { return a.totalDuration - b.totalDuration; });
  plans.forEach(function(p, i) { p.isRecommended = i === 0; });
  return plans;
}

function qs(obj: Record<string, string>): string {
  return Object.keys(obj).map(function(k) { return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]); }).join("&");
}

export async function fetchInputTips(keywords: string, city?: string): Promise<InputTip[]> {
  if (!keywords || keywords.trim().length === 0) return [];
  var c = city || "北京";
  var r = await fetch(API_BASE + "/inputtips?" + qs({ keywords: keywords, city: c }));
  if (!r.ok) return [];
  var d = await r.json();
  if (d.status !== "1" || !d.tips) return [];
  return d.tips.filter(function(t: InputTip) { return t.location && t.location.indexOf(",") > -1; }).slice(0, 6);
}

export async function fetchTransitPlans(origin: string, destination: string, city?: string): Promise<TransitPlan[]> {
  queryTimestamp = Math.floor(Date.now() / 1000);
  var c = city || "北京";
  var r = await fetch(API_BASE + "/transit?" + qs({ origin: origin, destination: destination, city: c, time: String(queryTimestamp) }));
  if (!r.ok) { var e = await r.json().catch(function() { return { error: "请求失败" }; }); throw new Error(e.error || "请求失败 (" + r.status + ")"); }
  var d = await r.json();
  if (d.status !== "1") throw new Error(d.info || "API请求失败");
  return parseTransitResponse(d);
}

export async function fetchGeocode(address: string, city?: string): Promise<string> {
  var c = city || "北京";
  var r = await fetch(API_BASE + "/geocode?" + qs({ address: address, city: c }));
  if (!r.ok) throw new Error("地理编码请求失败");
  var d = await r.json();
  if (d.status !== "1" || !d.geocodes || d.geocodes.length === 0) throw new Error(d.info || "未找到坐标");
  return d.geocodes[0].location;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return seconds + "秒";
  var m = Math.round(seconds / 60);
  if (m < 60) return m + "分钟";
  var h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? h + "小时" + r + "分钟" : h + "小时";
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return meters + "米";
  return (meters / 1000).toFixed(1) + "公里";
}

export function formatTime(seconds: number): string {
  var d = new Date();
  d.setSeconds(d.getSeconds() + seconds);
  return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
}

export function formatRelativeTime(s: number): string {
  if (s < 0) return "已过";
  if (s < 60) return s + "秒后";
  var m = Math.round(s / 60);
  if (m < 60) return m + "分钟后";
  var h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? h + "小时" + r + "分钟后" : h + "小时后";
}

export function parseTimeToMinutes(t: string): number {
  if (!t || t.length < 4) return -1;
  var h = parseInt(t.slice(0, 2)), m = parseInt(t.slice(2, 4));
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

export function computeNextDepartureMinutes(st: string, et: string): number | null {
  if (!st) return null;
  var sm = parseTimeToMinutes(st);
  if (sm < 0) return null;
  var n = new Date(), nm = n.getHours() * 60 + n.getMinutes();
  var em = et ? parseTimeToMinutes(et) : 24 * 60;
  if (et && nm >= em) return null;
  if (nm < sm) return sm - nm;
  var nd = sm + Math.ceil((nm - sm) / 10) * 10;
  if (et && nd >= em) return null;
  return Math.max(0, nd - nm);
}
