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
  userTokenDisplay = "",
  servingTokenDisplay = "",
  currentPosition = 0,
}: QueueVisualizerProps) {
  // Base numbers
  const baseServingNum = servingTokenDisplay ? parseInt(servingTokenDisplay.replace("#", ""), 10) : null;

  // Completed tokens: strictly from real completed items in queue from database
  const completedTokens = queue
    ?.filter((q) => q.status === "COMPLETED")
    ?.slice(-2)
    ?.map((q) => ({ num: q.token_number, display: q.token_display, status: "COMPLETED" })) || [];

  // Active serving
  const isUserServing = Boolean(userTokenDisplay && servingTokenDisplay && servingTokenDisplay === userTokenDisplay);
  const servingItem = servingTokenDisplay
    ? {
        display: servingTokenDisplay,
        status: "PROCESSING",
        isServing: true,
        isUser: isUserServing,
      }
    : null;

  // Build waiting queue tokens from real queue items
  const waitingTokens: Array<{ num: number; display: string; status: string; isUser: boolean; pos: number }> = [];
  const waitingFromQueue = queue?.filter((q) => q.status === "WAITING" || q.status === "ARRIVED") || [];

  if (waitingFromQueue.length > 0) {
    waitingFromQueue.forEach((q) => {
      const isUser = Boolean(userTokenDisplay && q.token_display === userTokenDisplay);
      waitingTokens.push({
        num: q.token_number,
        display: q.token_display,
        status: isUser ? "YOU" : q.status,
        isUser,
        pos: q.position,
      });
    });
  } else if (userTokenDisplay && !isUserServing) {
    // If user has a token but queue items aren't loaded yet
    waitingTokens.push({
      num: 0,
      display: userTokenDisplay,
      status: "YOU",
      isUser: true,
      pos: currentPosition || 1,
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
          {servingItem && (
            <>
              <div className={`flex flex-col items-center px-4 py-2 rounded shadow-md relative ${
                servingItem.isUser
                  ? "bg-amber-50 border-2 border-amber-500 text-amber-950 ring-2 ring-amber-300 animate-pulse"
                  : "bg-rose-50 border-2 border-[#B91C1C] text-[#B91C1C]"
              }`}>
                <span className={`absolute -top-2.5 text-white text-[9px] font-black uppercase px-2 py-0.2 rounded-full tracking-wider animate-pulse ${
                  servingItem.isUser ? "bg-amber-600" : "bg-[#B91C1C]"
                }`}>
                  {servingItem.isUser ? "YOU ARE SERVING NOW!" : "SERVING NOW"}
                </span>
                <span className="text-sm font-black font-mono tracking-tight mt-1">
                  {servingItem.display}
                </span>
                <span className={`text-[10px] font-bold mt-0.5 ${servingItem.isUser ? "text-amber-800" : "text-rose-700"}`}>Counter #1</span>
              </div>

              <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </>
          )}

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
