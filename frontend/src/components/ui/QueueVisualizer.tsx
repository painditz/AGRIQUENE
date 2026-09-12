"use client";

import React from "react";
import { Check, User, ArrowRight, Activity, Clock } from "lucide-react";
import { QueueItem } from "@/lib/api";

interface QueueVisualizerProps {
  queue: QueueItem[];
  userTokenDisplay?: string;
  servingTokenDisplay?: string;
  currentPosition?: number;
}

export function QueueVisualizer({
  queue,
  userTokenDisplay = "#128",
  servingTokenDisplay = "#114",
  currentPosition = 14,
}: QueueVisualizerProps) {
  // Synthesize visual token chain with historical completed tokens + waiting tokens
  const baseServingNum = parseInt(servingTokenDisplay.replace("#", ""), 10) || 114;
  const userNum = parseInt(userTokenDisplay.replace("#", ""), 10) || 128;

  // Recent completed tokens
  const completedTokens = [
    { num: baseServingNum - 3, display: `#${baseServingNum - 3}`, status: "COMPLETED" },
    { num: baseServingNum - 2, display: `#${baseServingNum - 2}`, status: "COMPLETED" },
    { num: baseServingNum - 1, display: `#${baseServingNum - 1}`, status: "COMPLETED" },
  ];

  // Active serving
  const servingItem = {
    num: baseServingNum,
    display: `#${baseServingNum}`,
    status: "PROCESSING",
    isServing: true,
  };

  // Build waiting queue tokens up to user token + 3 trailing tokens
  const waitingTokens = [];
  const startWait = baseServingNum + 1;
  const endWait = Math.max(userNum + 3, startWait + 16);

  for (let i = startWait; i <= endWait; i++) {
    const isUser = i === userNum;
    waitingTokens.push({
      num: i,
      display: `#${i}`,
      status: isUser ? "YOU" : "WAITING",
      isUser,
      pos: i - baseServingNum,
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-[#0B2545] uppercase tracking-wide flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#B91C1C]" /> Live Token Queue Progression Chain
          </h3>
          <p className="text-xs text-slate-500">
            Real-time visual token movement synced with mandi weighbridge counters
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full" /> Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#B91C1C] rounded-full live-pulse" /> Serving
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Your Token
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Token Chain */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="flex items-center gap-2.5 min-w-max px-1">
          {/* Completed Tokens */}
          {completedTokens.map((item) => (
            <div
              key={item.display}
              className="flex flex-col items-center bg-slate-50 border border-slate-200 text-slate-400 px-3 py-2 rounded text-xs opacity-60"
            >
              <div className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-mono font-bold line-through">{item.display}</span>
              </div>
              <span className="text-[9px] text-slate-400 uppercase mt-0.5">Done</span>
            </div>
          ))}

          {/* Current Serving Token */}
          <div className="flex flex-col items-center bg-rose-50 border-2 border-[#B91C1C] text-[#B91C1C] px-4 py-2 rounded shadow-md relative">
            <span className="absolute -top-2.5 bg-[#B91C1C] text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full tracking-wider animate-pulse">
              SERVING NOW
            </span>
            <span className="text-sm font-black font-mono tracking-tight mt-1">
              {servingItem.display}
            </span>
            <span className="text-[10px] font-bold text-rose-700 mt-0.5">Counter #1</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />

          {/* Waiting Chain */}
          {waitingTokens.map((item) => {
            if (item.isUser) {
              return (
                <div
                  key={item.display}
                  className="flex flex-col items-center bg-amber-50 border-2 border-amber-500 text-amber-950 px-4 py-2 rounded shadow-md ring-2 ring-amber-200 relative animate-pulse"
                >
                  <span className="absolute -top-2.5 bg-amber-600 text-white text-[9px] font-black uppercase px-2 py-0.2 rounded-full tracking-wider">
                    YOU (POS #{currentPosition})
                  </span>
                  <span className="text-base font-black font-mono tracking-tight text-[#0B2545] mt-1">
                    {item.display}
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 mt-0.5">
                    Your Token
                  </span>
                </div>
              );
            }

            return (
              <div
                key={item.display}
                className="flex flex-col items-center bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded text-xs hover:border-[#0B2545] transition"
              >
                <span className="font-mono font-bold text-slate-800">{item.display}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Pos #{item.pos}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Summary Pill */}
      <div className="mt-2 bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-wrap items-center justify-between text-xs text-slate-700">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0B2545]">
            Currently Serving: <span className="text-[#B91C1C] font-mono">{servingTokenDisplay}</span>
          </span>
          <span>•</span>
          <span>
            Your Token: <span className="font-bold font-mono text-amber-700">{userTokenDisplay}</span>
          </span>
        </div>
        <div className="font-semibold text-slate-600">
          <span className="text-[#0B2545] font-bold">{currentPosition}</span> farmers ahead in queue
        </div>
      </div>
    </div>
  );
}
