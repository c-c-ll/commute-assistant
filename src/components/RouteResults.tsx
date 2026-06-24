import { useState, useEffect } from 'react';
import type { TransitPlan, TransitStep } from '../types';
import { formatDuration, formatDistance, formatTime, formatRelativeTime, computeNextDepartureMinutes, getQueryTimestamp } from '../utils/amap';
import Timetable from './Timetable';

interface RouteResultsProps {
  plans: TransitPlan[];
}

export default function RouteResults({ plans }: RouteResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (plans.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">
          共 {plans.length} 个方案
        </h2>
        <span className="text-xs text-slate-400">按耗时从短到长排序</span>
      </div>

      <div className="flex flex-col gap-3">
        {plans.map((plan, index) => (
          <RouteCard
            key={plan.id}
            plan={plan}
            rank={index + 1}
            expanded={expandedId === plan.id}
            onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface RouteCardProps {
  plan: TransitPlan;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}

function computeCumulativeTimes(steps: TransitStep[]): string[] {
  const times: string[] = [];
  let elapsed = 0;
  for (const step of steps) {
    times.push(formatTime(elapsed));
    elapsed += step.duration || 0;
  }
  return times;
}

type DetailTab = 'steps' | 'timetable';

function RouteCard({ plan, rank, expanded, onToggle }: RouteCardProps) {
  const isBest = rank === 1;
  const arrivalTimes = computeCumulativeTimes(plan.steps);
  const [detailTab, setDetailTab] = useState<DetailTab>('steps');
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const queryTs = getQueryTimestamp();

  useEffect(function() {
    if (!expanded) return;
    const timer = setInterval(function() { setNow(Math.floor(Date.now() / 1000)); }, 30000);
    return function() { clearInterval(timer); };
  }, [expanded]);

  // Find first transit step
  const firstTransit = plan.steps.find(function(s) { return s.stopList && s.stopList.length > 0 && s.lineName; });
  const nextMins = firstTransit ? computeNextDepartureMinutes(firstTransit.startTime || '', firstTransit.endTime || '') : null;

  // How much time has elapsed since query
  const elapsedSinceQuery = now - queryTs;

  return (
    <div
      className={`bg-white rounded-2xl border transition-all cursor-pointer ${
        isBest
          ? 'border-blue-200 shadow-sm shadow-blue-100/50'
          : 'border-slate-200 hover:border-slate-300'
      } ${expanded ? 'ring-2 ring-blue-100' : ''}`}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isBest && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-md">推荐</span>
            )}
            <span className="text-xs text-slate-400">方案{rank}</span>
          </div>

          <div className="flex items-center gap-1">
            {plan.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">{tag}</span>
            ))}
          </div>
        </div>

        {/* Main stats */}
        <div className="mt-3 flex items-end gap-6">
          <div>
            <div className={`text-2xl font-bold ${isBest ? 'text-blue-600' : 'text-slate-800'}`}>
              {formatDuration(plan.totalDuration)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">总耗时</div>
          </div>

          <div className="flex items-center gap-4 pb-0.5">
            <div>
              <span className="text-sm font-semibold text-slate-700">
                {plan.cost > 0 ? '¥' + plan.cost : '免费'}
              </span>
              <div className="text-xs text-slate-400">票价</div>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-700">
                {formatDistance(plan.walkDistance)}
              </span>
              <div className="text-xs text-slate-400">步行</div>
            </div>

            <div>
              <span className="text-sm font-semibold text-slate-700">
                {plan.transferCount === 0 ? '直达' : plan.transferCount + '次换乘'}
              </span>
              <div className="text-xs text-slate-400">换乘</div>
            </div>
          </div>
        </div>

        {/* Route summary */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {plan.steps.filter(function(s) { return s.type === 'bus' || s.type === 'subway'; }).map(function(step, i) {
            return (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: step.lineColor || '#64748b' }}
                >
                  {step.lineName || step.instruction}
                </span>
              </div>
            );
          })}
        </div>

        {/* Departure / arrival */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 bg-slate-50 rounded-md font-mono text-slate-600">
            {'出发 ' + formatTime(elapsedSinceQuery)}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="px-2 py-0.5 bg-blue-50 rounded-md font-mono text-blue-600">
            {'到达 ' + formatTime(plan.totalDuration)}
          </span>
          {nextMins !== null && (
            <>
              <span className="text-slate-300">·</span>
              <span className={'font-medium ' + (nextMins <= 5 ? 'text-red-500' : 'text-emerald-600')}>
                下一班约{nextMins}分钟后发车
              </span>
            </>
          )}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100" onClick={function(e) { e.stopPropagation(); }}>
          <div className="pt-3 flex items-center gap-1 border-b border-slate-100 pb-3">
            <button
              onClick={function() { setDetailTab('steps'); }}
              className={'px-3 py-1.5 text-xs rounded-md transition-colors ' + (
                detailTab === 'steps' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              详细步骤
            </button>
            <button
              onClick={function() { setDetailTab('timetable'); }}
              className={'px-3 py-1.5 text-xs rounded-md transition-colors ' + (
                detailTab === 'timetable' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              时刻表
            </button>
          </div>

          {detailTab === 'steps' && (
            <div className="pt-3">
              <div className="relative">
                {plan.steps.map(function(step, i) {
                  return (
                    <div key={i} className="flex gap-3 pb-3 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div
                          className={'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ' + (
                            step.type === 'walk' ? 'bg-slate-100' : step.type === 'subway' ? 'bg-blue-100' : step.type === 'bus' ? 'bg-green-100' : 'bg-amber-100'
                          )}
                        >
                          {step.type === 'walk' && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                              <path d="M13 4h-2l-1 6h4l-1-6z" /><path d="M12 10v4m-2 6l2-6 2 6" />
                            </svg>
                          )}
                          {step.type === 'subway' && <div className="w-2.5 h-2.5 rounded-sm bg-blue-600" />}
                          {step.type === 'bus' && <div className="w-2.5 h-2.5 rounded-sm bg-green-600" />}
                          {step.type === 'transfer' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                        </div>
                        {i < plan.steps.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-baseline gap-2">
                          <p className="text-sm text-slate-700 leading-relaxed">{step.instruction}</p>
                          <span className="text-xs text-slate-400 font-mono flex-shrink-0">{arrivalTimes[i]}</span>
                        </div>
                        {step.walkSteps && step.walkSteps.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {step.walkSteps.map(function(ws, j) {
                              return (
                                <p key={j} className="text-xs text-slate-400 flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                                  {ws.road ? '沿' + ws.road + '步行' + ws.distance + '米' + (ws.action || '') : '步行' + ws.distance + '米' + (ws.action || '')}
                                </p>
                              );
                            })}
                          </div>
                        )}
                        {step.from && step.to && !step.walkSteps && (
                          <div className="mt-1">
                            <p className="text-xs text-slate-400">
                              {step.from + ' -> ' + step.to}{step.stationCount ? ' · ' + step.stationCount + '站' : ''}{step.duration ? ' · ' + formatDuration(step.duration) : ''}
                            </p>
                          </div>
                        )}
                        {step.viaStops && step.viaStops.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {step.from && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded font-medium">{step.from}</span>}
                            {step.viaStops.map(function(name, j) { return <span key={j} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-xs rounded">{name}</span>; })}
                            {step.to && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded font-medium">{step.to}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {detailTab === 'timetable' && <Timetable plan={plan} />}
        </div>
      )}

      <div className="px-4 pb-2 flex justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className={'transition-transform' + (expanded ? ' rotate-180' : '')}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}