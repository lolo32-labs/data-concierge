"use client";

import { useEffect, useState } from "react";

interface Metric {
  label: string;
  value: number | null;
  previousValue: number | null;
  format: string;
}

interface DashboardSidebarProps {
  clientId: string;
  clientName: string;
}

function formatValue(value: number | null, format: string): string {
  if (value === null) return "—";
  if (format === "currency") return `$${value.toLocaleString()}`;
  if (format === "percentage") return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

function isMonthComplete(): boolean {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() >= lastDay - 2; // Consider complete if within last 2 days
}

function getTrend(current: number | null, previous: number | null): { label: string; color: string } {
  if (current === null || previous === null || previous === 0) return { label: "", color: "text-gray-500" };
  if (!isMonthComplete()) return { label: "Month in progress", color: "text-gray-500" };
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return { label: `↑ ${pct.toFixed(0)}% vs last period`, color: "text-green-400" };
  if (pct < 0) return { label: `↓ ${Math.abs(pct).toFixed(0)}% vs last period`, color: "text-red-400" };
  return { label: "→ flat vs last period", color: "text-gray-500" };
}

export default function DashboardSidebar({ clientId, clientName }: DashboardSidebarProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/${clientId}/metrics`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data.metrics || []);
        setUpdatedAt(data.updatedAt || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  const metricColors = ["bg-green-950 text-green-400", "bg-red-950 text-red-400", "bg-blue-950 text-blue-400", "bg-yellow-950 text-yellow-400"];

  return (
    <aside className="w-72 border-r border-gray-800 p-4 flex flex-col gap-3 overflow-y-auto bg-gray-950">
      <p className="text-[10px] uppercase tracking-widest text-gray-500">
        Overview — {clientName}
      </p>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-800 rounded-lg" />
          ))}
        </div>
      ) : (
        metrics.map((metric, i) => {
          const trend = getTrend(metric.value, metric.previousValue);
          return (
            <div key={metric.label} className={`p-4 rounded-lg ${metricColors[i % metricColors.length]}`}>
              <p className="text-[10px] uppercase text-gray-400">{metric.label}</p>
              <p className="text-2xl font-bold mt-1">{formatValue(metric.value, metric.format)}</p>
              {trend.label && <p className={`text-xs mt-1 ${trend.color}`}>{trend.label}</p>}
            </div>
          );
        })
      )}

      <div className="mt-auto pt-3 border-t border-gray-800">
        <p className="text-[10px] text-gray-600">
          {updatedAt ? `Last updated: ${new Date(updatedAt).toLocaleDateString()}` : ""}
        </p>
      </div>
    </aside>
  );
}
