"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Server,
  Clock,
} from "lucide-react";

interface MonitoringStatus {
  raceState: string;
  lastDataFetch: string | null;
  secondsSinceFetch: number;
  simulationMode: boolean;
  runnerCount: number;
  onTrackCount: number;
  onBreakCount: number;
  dataSource: string | null;
}

interface CronTestResult {
  success: boolean;
  error?: string;
  runnersUpdated?: number;
  lapsInserted?: number;
  timestamp?: string;
  message?: string;
  raceState?: string;
}

export default function MonitoringPage() {
  const [status, setStatus] = useState<MonitoringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingCron, setTestingCron] = useState(false);
  const [cronResult, setCronResult] = useState<CronTestResult | null>(null);
  const [cronSecret, setCronSecret] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/monitoring");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  };

  const testCron = async () => {
    if (!cronSecret) {
      alert("Please enter CRON_SECRET");
      return;
    }

    setTestingCron(true);
    setCronResult(null);

    try {
      const res = await fetch("/api/cron/fetch-race-data", {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });

      const data = await res.json();
      setCronResult(data);
    } catch (err) {
      setCronResult({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setTestingCron(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-destructive">
          <p>Failed to load monitoring data</p>
        </div>
      </div>
    );
  }

  const getHealthStatus = () => {
    if (status.raceState !== "live") {
      return { label: "Not Live", color: "bg-gray-500", icon: Clock };
    }
    if (status.secondsSinceFetch < 90) {
      return { label: "Healthy", color: "bg-green-500", icon: CheckCircle };
    }
    if (status.secondsSinceFetch < 300) {
      return { label: "Warning", color: "bg-yellow-500", icon: AlertTriangle };
    }
    return { label: "Critical", color: "bg-red-500", icon: XCircle };
  };

  const health = getHealthStatus();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Race Day Monitoring</h1>
            <p className="text-muted-foreground">
              Real-time scraping and data health status
            </p>
          </div>
          <Button onClick={fetchStatus} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Overall Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${health.color}`}>
                <health.icon className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">{health.label}</div>
                <div className="text-sm text-muted-foreground">
                  Last fetch: {status.secondsSinceFetch}s ago
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cron Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Cron Job Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Race State:</span>
                <Badge
                  variant={status.raceState === "live" ? "default" : "secondary"}
                >
                  {status.raceState}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Last Fetch:</span>
                <span className="text-sm font-mono">
                  {status.lastDataFetch
                    ? new Date(status.lastDataFetch).toLocaleString()
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Time Since Fetch:</span>
                <span
                  className={`text-sm font-bold ${
                    status.secondsSinceFetch < 90
                      ? "text-green-600"
                      : status.secondsSinceFetch < 300
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {status.secondsSinceFetch}s
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Data Source:</span>
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {status.dataSource || "Not configured"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Simulation Mode:</span>
                <Badge variant={status.simulationMode ? "destructive" : "outline"}>
                  {status.simulationMode ? "ON" : "OFF"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Runners:</span>
                <span className="text-lg font-bold">{status.runnerCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">On Track:</span>
                <span className="text-lg font-bold text-green-600">
                  {status.onTrackCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">On Break:</span>
                <span className="text-lg font-bold text-orange-600">
                  {status.onBreakCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manual Cron Test */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Cron Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                CRON_SECRET (from environment variables)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={cronSecret}
                  onChange={(e) => setCronSecret(e.target.value)}
                  placeholder="Enter CRON_SECRET"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button
                  onClick={testCron}
                  disabled={testingCron || !cronSecret}
                >
                  {testingCron ? "Testing..." : "Test Cron"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Get this from Vercel Dashboard → Settings → Environment Variables
              </p>
            </div>

            {cronResult && (
              <div
                className={`p-4 rounded-lg ${
                  cronResult.success
                    ? "bg-green-50 dark:bg-green-950"
                    : "bg-red-50 dark:bg-red-950"
                }`}
              >
                <div className="font-semibold mb-2">
                  {cronResult.success ? "✅ Success" : "❌ Error"}
                </div>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(cronResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Polling Intervals Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Current Polling Intervals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Cron (External → DB):</span>
                  <span className="text-sm font-mono">60s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Map Positions:</span>
                  <span className="text-sm font-mono">2s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Countdown:</span>
                  <span className="text-sm font-mono">5s</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Leaderboard:</span>
                  <span className="text-sm font-mono">10s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Weather:</span>
                  <span className="text-sm font-mono">30min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Config/State:</span>
                  <span className="text-sm font-mono">10s</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button variant="outline" asChild>
                <a href="/api/race/config" target="_blank">
                  View Config
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/api/race/leaderboard" target="_blank">
                  View Leaderboard
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/live/map" target="_blank">
                  Open Live Map
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/admin/chat" target="_blank">
                  Admin Chat
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Health Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Health Status Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>
                  <strong>Healthy:</strong> Last fetch {"<"} 90 seconds ago
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span>
                  <strong>Warning:</strong> Last fetch 90-300 seconds ago
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>
                  <strong>Critical:</strong> Last fetch {">"} 300 seconds ago
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-500"></div>
                <span>
                  <strong>Not Live:</strong> Race state is not &quot;live&quot; (cron not running)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
