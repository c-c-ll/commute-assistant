import { useState, useEffect } from 'react';
import type { TransitPlan } from '../types';
import { formatTime, formatTimeStr, formatRelativeTime, computeNextDepartureMinutes, getQueryTimestamp } from '../utils/amap';

interface TimetableProps {
  plan: TransitPlan;
}

export default function Timetable({ plan }: TimetableProps) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const queryTs = getQueryTimestamp();

  useEffect(function() {
    const timer = setInterval(function() { setNow(Math.floor(Date.now() / 1000)); }, 30000);
    return function() { clearInterval(timer); };
  }, []);

  const transitEntries: Array<{ step: typeof plan.steps[0]; globalIdx: number }> = [];
  plan.steps.forEach(function(step, idx) {
    if (step.stopList && step.stopList.length > 0 && step.lineName) {
      transitEntries.push({ step: step, globalIdx: idx });
    }
  });

  // Compute cumulative elapsed seconds up to a specific step+stop from departure
  function computeCumulative(globalStepIndex: number, stopIndex: number): number {
    let elapsed = 0;
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (i < globalStepIndex) {
        elapsed += step.duration || 0;
      } else if (i === globalStepIndex) {
        if (step.stopList && step.stopList.length > 1) {
          const perStop = (step.duration || 0) / (step.stopList.length - 1);
          elapsed += perStop * stopIndex;
        }
        break;
      }
    }
    return Math.round(elapsed);
  }

  // How many seconds ago the query was made
  const elapsedSinceQuery = now - queryTs;

  // Compute cumulative seconds from NOW for the first transit stop
  function computeSecondsFromNow(globalStepIndex: number, stopIndex: number): number {
    // Pre-first-transit walk
    let preWalk = 0;
    for (let i = 0; i < globalStepIndex; i++) {
      const s = plan.steps[i];
      if (s.type === 'walk') preWalk += s.duration || 0;
    }
    const transitOffset = computeCumulative(globalStepIndex, stopIndex) - computeCumulative(globalStepIndex, 0);
    const totalFromDeparture = preWalk + transitOffset;
    return totalFromDeparture - elapsedSinceQuery;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium text-slate-500">时刻表与实时推算</h4>
        <span className="text-xs text-slate-400">
          基于 {new Date(queryTs * 1000).getHours().toString().padStart(2, '0') + ':' + new Date(queryTs * 1000).getMinutes().toString().padStart(2, '0')} 查询
        </span>
      </div>

      {/* Status for first transit line */}
      {transitEntries.length > 0 && (function() {
        const firstStep = transitEntries[0].step;
        const mins = computeNextDepartureMinutes(firstStep.startTime || '', firstStep.endTime || '');
        return mins !== null ? (
          <div className="mb-4 px-3 py-2 rounded-lg flex items-center justify-between" style={{ backgroundColor: mins <= 5 ? '#fef2f2' : '#f0fdf4' }}>
            <div className="flex items-center gap-2">
              <div className={'w-2 h-2 rounded-full ' + (mins <= 5 ? 'bg-red-500 animate-pulse' : 'bg-green-500')} />
              <span className="text-xs font-medium" style={{ color: mins <= 5 ? '#dc2626' : '#16a34a' }}>
                {firstStep.lineName} 预计{mins}分钟后发车
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {firstStep.startTime ? '首班 ' + formatTimeStr(firstStep.startTime) : ''}
              {firstStep.endTime ? ' / 末班 ' + formatTimeStr(firstStep.endTime) : ''}
            </span>
          </div>
        ) : null;
      })()}

      <div className="space-y-4">
        {transitEntries.map(function(entry, sIdx) {
          const step = entry.step;
          const isSubway = step.type === 'subway';
          const color = step.lineColor || (isSubway ? '#2563eb' : '#10b981');
          const stops = step.stopList || [];

          const mins = computeNextDepartureMinutes(step.startTime || '', step.endTime || '');

          return (
            <div key={sIdx} className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <div className="px-3 py-2.5 flex items-center justify-between" style={{ backgroundColor: color + '10' }}>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: color }}
                  >
                    {step.lineName}
                  </span>
                  <span className="text-xs text-slate-500">
                    {step.lineType || (isSubway ? '地铁线路' : '公交线路')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {step.startTime ? <span>首 {formatTimeStr(step.startTime)}</span> : null}
                  {step.endTime ? <span>末 {formatTimeStr(step.endTime)}</span> : null}
                  {mins !== null ? (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '20', color: color }}>
                      约{mins}分钟一班
                    </span>
                  ) : null}
                  <span className="text-slate-500 font-medium">{stops.length}站</span>
                </div>
              </div>

              <div className="px-3 py-1.5">
                {stops.map(function(stop, stIdx) {
                  const isFirst = stIdx === 0;
                  const isLast = stIdx === stops.length - 1;
                  const secondsFromNow = computeSecondsFromNow(entry.globalIdx, stIdx);
                  const arrivalTime = formatTime(computeCumulative(entry.globalIdx, stIdx) - elapsedSinceQuery);

                  return (
                    <div key={stIdx} className="flex items-center gap-3 py-1.5 relative">
                      <div className="flex flex-col items-center flex-shrink-0">
                        {isFirst || isLast ? (
                          <div
                            className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                            style={{ backgroundColor: isFirst ? color : '#fff', borderColor: color }}
                          />
                        ) : (
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color + '40' }} />
                        )}
                        {!isLast && (
                          <div className="w-0.5 flex-1 min-h-[16px]" style={{ backgroundColor: color + '20' }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <div className="min-w-0">
                          <span className={'text-sm truncate ' + (isFirst || isLast ? 'font-medium text-slate-800' : 'text-slate-600')}>
                            {stop.name}
                            {isFirst ? <span className="ml-1.5 text-xs text-slate-400 font-normal">上车</span> : null}
                            {isLast ? <span className="ml-1.5 text-xs text-slate-400 font-normal">下车</span> : null}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-slate-400 font-mono">
                            {arrivalTime}
                          </span>
                          <span className={'text-xs font-medium ' + (secondsFromNow < 0 ? 'text-slate-300' : secondsFromNow < 300 ? 'text-orange-600' : 'text-emerald-600')}>
                            {formatRelativeTime(Math.max(0, secondsFromNow))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">全程预计</span>
          <span className="font-mono font-medium text-slate-700">
            {formatTime(elapsedSinceQuery)} — {formatTime(plan.totalDuration)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{plan.transferCount}次换乘</span>
          <span>步行{(plan.walkDistance / 1000).toFixed(1)}公里</span>
        </div>
      </div>
    </div>
  );
}