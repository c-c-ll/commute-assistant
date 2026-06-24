var API_BASE = "https://nsfrkquwczuceztrmzhl.supabase.co/functions/v1/amap-proxy/api";

interface AmapTransitResponse {
  status: string; count: string; info: string;
  route?: { origin: string; destination: string; distance: string; taxi_cost: string; transits: AmapTransit[]; };
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
  station_start_time?: string; station_end_time?: string;
}

interface AmapWalkStep {
  instruction: string; orientation: string; road: string | string[]; distance: string; action: string | string[];
}

export interface InputTip {
  id: string; name: string; district: string; location: string; address: string; typecode: string;
}

let queryTimestamp: number = 0;
export function getQueryTimestamp(): number { return queryTimestamp; }

function getPortalName(portal: AmapPortal | AmapPortal[] | undefined): string {
  if (!portal) return '';
  if (Array.isArray(portal)) return portal.length > 0 ? portal[0].name : '';
  return portal.name || '';
}

function extractWalkRoad(step: AmapWalkStep): string {
  const road = step.road;
  if (typeof road === 'string') return road;
  if (Array.isArray(road) && road.length > 0) return road[0];
  return '';
}

function extractAction(step: AmapWalkStep): string {
  const action = step.action;
  if (typeof action === 'string') return action;
  if (Array.isArray(action) && action.length > 0) return action[0];
  return '';
}

function pickTime(val: string | string[] | undefined): string {
  if (!val) return '';
  if (Array.isArray(val)) return val.length > 0 ? val[0] : '';
  return val;
}

function formatTimeStr(time: string): string {
  if (!time || time.length !== 4) return time || '';
  return time.slice(0, 2) + ':' + time.slice(2);
}

function parseSteps(transit: AmapTransit): TransitStep[] {
  const steps: TransitStep[] = [];
  const segments = transit.segments;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const hasTransit = segment.bus && segment.bus.buslines.length > 0;
    const walkDist = segment.walking ? parseInt(segment.walking.distance) : 0;

    if (segment.walking && walkDist > 0) {
      const walkDuration = parseInt(segment.walking.duration);
      const walkSteps = segment.walking.steps;
      const subSteps: WalkStep[] = walkSteps.map(function(s) { return {
        road: extractWalkRoad(s), distance: parseInt(s.distance) || 0, action: extractAction(s),
      }; });

      const isInitialWalk = i === 0;
      const isFinalWalk = i === segments.length - 1 && !hasTransit;
      let walkInstruction: string;
      if (isInitialWalk) walkInstruction = '步行' + walkDist + '米至公交站';
      else if (isFinalWalk) walkInstruction = '步行' + walkDist + '米到达目的地';
      else {
        const nextSeg = segments[i + 1];
        const nextLine = nextSeg && nextSeg.bus && nextSeg.bus.buslines ? nextSeg.bus.buslines[0] : null;
        if (nextLine) walkInstruction = '步行' + walkDist + '米换乘' + nextLine.name;
        else walkInstruction = '步行' + walkDist + '米（约' + Math.ceil(walkDuration / 60) + '分钟）';
      }
      steps.push({ instruction: walkInstruction, type: 'walk', distance: walkDist, duration: walkDuration, walkSteps: subSteps });
    }

    if (hasTransit && segment.bus && segment.bus.buslines) {
      const line = segment.bus.buslines[0];
      const isSubway = line.type.includes('地铁');
      const stationCount = parseInt(line.via_num) + 1;
      const fromStation = line.departure_stop ? line.departure_stop.name : '';
      const toStation = line.arrival_stop ? line.arrival_stop.name : '';
      const viaNames: string[] = line.via_stops ? line.via_stops.map(function(s: { name: string }) { return s.name; }) : [];

      const stopList: TimetableStop[] = [{ name: fromStation, isDeparture: true, isArrival: false }];
      for (const via of viaNames) { stopList.push({ name: via, isDeparture: false, isArrival: false }); }
      if (toStation && toStation !== fromStation) stopList.push({ name: toStation, isDeparture: false, isArrival: true });

      const displayName = line.name.replace(/\(.*?\)/g, '').replace('地铁', '').replace('号线', '号线');
      const entranceName = getPortalName(segment.entrance);
      if (entranceName) steps.push({ instruction: '从' + entranceName + '进站', type: 'transfer' });

      steps.push({
        instruction: '乘坐' + displayName + '（' + fromStation + '->' + toStation + '，' + stationCount + '站）',
        type: isSubway ? 'subway' : 'bus',
        lineName: displayName,
        lineColor: line.color || (isSubway ? '#2563eb' : '#10b981'),
        lineType: line.type, stationCount,
        duration: parseInt(line.duration), distance: parseInt(line.distance),
        from: fromStation, to: toStation, viaStops: viaNames,
        startTime: pickTime(line.start_time), endTime: pickTime(line.end_time),
        stopList: stopList,
      });

      const exitName = getPortalName(segment.exit);
      if (exitName) steps.push({ instruction: '从' + exitName + '出站', type: 'transfer' });
    }
  }
  return steps;
}

function countTransfers(transit: AmapTransit): number {
  let count = 0;
  for (const segment of transit.segments) { if (segment.bus && segment.bus.buslines.length > 0) count++; }
  return Math.max(0, count - 1);
}

export function parseTransitResponse(data: AmapTransitResponse): TransitPlan[] {
  if (!data.route || !data.route.transits) return [];
  const plans: TransitPlan[] = data.route.transits.map(function(transit, index) {
    const steps = parseSteps(transit);
    const tags: string[] = [];
    if (steps.some(function(s) { return s.type === 'subway'; })) tags.push('地铁');
    const tf = countTransfers(transit);
    if (tf === 0) tags.push('直达');
    const cost = parseFloat(transit.cost) || 0;
    if (cost === 0) tags.push('免费');
    return {
      id: 'plan-' + index,
      totalDuration: parseInt(transit.duration),
      totalDistance: parseInt(transit.distance),
      walkDistance: parseInt(transit.walking_distance),
      cost, transferCount: tf, tags, steps, isRecommended: index === 0,
    };
  });
  plans.sort(function(a, b) { return a.totalDuration - b.totalDuration; });
  plans.forEach(function(p, i) { p.isRecommended = i === 0; });
  return plans;
}

export async function fetchInputTips(keywords: string, city: string = '北京'): Promise<InputTip[]> {
  if (!keywords || keywords.trim().length === 0) return [];
  const response = await fetch(API_BASE + '/inputtips?' + new URLSearchParams({ keywords, city }));
  if (!response.ok) return [];
  const data = await response.json();
  if (data.status !== '1' || !data.tips) return [];
  return data.tips.filter(function(t: InputTip) { return t.location && t.location.indexOf(',') > -1; }).slice(0, 6);
}

export async function fetchTransitPlans(origin: string, destination: string, city: string = '北京'): Promise<TransitPlan[]> {
  queryTimestamp = Math.floor(Date.now() / 1000);
  const response = await fetch(API_BASE + '/transit?' + new URLSearchParams({ origin, destination, city, time: queryTimestamp.toString() }));
  if (!response.ok) {
    const errData = await response.json().catch(function() { return { error: '请求失败' }; });
    throw new Error(errData.error || '请求失败 (' + response.status + ')');
  }
  const data: AmapTransitResponse = await response.json();
  if (data.status !== '1') throw new Error(data.info || '高德地图API请求失败');
  return parseTransitResponse(data);
}

export async function fetchGeocode(address: string, city: string = '北京'): Promise<string> {
  const response = await fetch(API_BASE + '/geocode?' + new URLSearchParams({ address, city }));
  if (!response.ok) throw new Error('地理编码请求失败');
  const data = await response.json();
  if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) throw new Error(data.info || '未找到该地址的坐标');
  return data.geocodes[0].location;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return seconds + '秒';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes + '分钟';
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes > 0 ? hours + '小时' + remainMinutes + '分钟' : hours + '小时';
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return meters + '米';
  return (meters / 1000).toFixed(1) + '公里';
}

export function formatTime(seconds: number): string {
  const d = new Date();
  d.setSeconds(d.getSeconds() + seconds);
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

export function formatRelativeTime(secondsFromNow: number): string {
  if (secondsFromNow < 0) return '已过';
  if (secondsFromNow < 60) return secondsFromNow + '秒后';
  const minutes = Math.round(secondsFromNow / 60);
  if (minutes < 60) return minutes + '分钟后';
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes > 0 ? hours + '小时' + remainMinutes + '分钟后' : hours + '小时后';
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || timeStr.length < 4) return -1;
  const h = parseInt(timeStr.slice(0, 2)), m = parseInt(timeStr.slice(2, 4));
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

export function computeNextDepartureMinutes(startTimeStr: string, endTimeStr: string): number | null {
  if (!startTimeStr) return null;
  const startMinutes = parseTimeToMinutes(startTimeStr);
  if (startMinutes < 0) return null;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = endTimeStr ? parseTimeToMinutes(endTimeStr) : 24 * 60;
  if (endTimeStr && nowMinutes >= endMinutes) return null;
  if (nowMinutes < startMinutes) return startMinutes - nowMinutes;
  const headway = 10;
  const cyclesToNext = Math.ceil((nowMinutes - startMinutes) / headway);
  const nextDeparture = startMinutes + cyclesToNext * headway;
  if (endTimeStr && nextDeparture >= endMinutes) return null;
  return Math.max(0, nextDeparture - nowMinutes);
}

export { formatTimeStr };
