"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/lib/hooks/use-toast";
import {
  Upload,
  RefreshCw,
  Play,
  Square,
  Database,
  Download,
} from "lucide-react";

export default function RaceLiveAdminPage() {
  const [hours, setHours] = useState("12");
  const [loading, setLoading] = useState(false);
  const [jsonData, setJsonData] = useState("");
  const { toast } = useToast();

  const generateAndUploadMockData = async () => {
    setLoading(true);
    try {
      // Generate mock data
      const generateRes = await fetch(`/api/race/mock-data?hours=${hours}`);
      if (!generateRes.ok) throw new Error("Failed to generate mock data");

      const mockData = await generateRes.json();

      // Upload to database
      const uploadRes = await fetch("/api/race/mock-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockData),
      });

      if (!uploadRes.ok) throw new Error("Failed to upload mock data");

      const result = await uploadRes.json();

      toast({
        title: "Mock data uploaded",
        description: `${result.runnersInserted} runners, ${result.lapsInserted} laps for ${hours} hours`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to upload mock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadJsonData = async () => {
    setLoading(true);
    try {
      const data = JSON.parse(jsonData);

      const res = await fetch("/api/race/mock-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to upload JSON data");

      const result = await res.json();

      toast({
        title: "JSON data uploaded",
        description: `${result.runnersInserted} runners, ${result.lapsInserted} laps`,
      });

      setJsonData("");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to upload JSON data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRaceState = async (
    state: "not_started" | "live" | "finished"
  ) => {
    setLoading(true);
    try {
      const res = await fetch("/api/race/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceState: state }),
      });

      if (!res.ok) throw new Error("Failed to update race state");

      toast({
        title: "Race state updated",
        description: `Race is now: ${state}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update race state",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Live Race Administration</h1>

      <Tabs defaultValue="mock-data" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mock-data">Mock Data</TabsTrigger>
          <TabsTrigger value="json-upload">JSON Upload</TabsTrigger>
          <TabsTrigger value="race-control">Race Control</TabsTrigger>
          <TabsTrigger value="data-fetcher">Data Fetcher</TabsTrigger>
        </TabsList>

        <TabsContent value="mock-data">
          <Card>
            <CardHeader>
              <CardTitle>Generate Mock Data</CardTitle>
              <CardDescription>
                Generate realistic mock race data for development and testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Elapsed Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="12"
                />
                <p className="text-sm text-muted-foreground">
                  Generate data for 0.5 to 24 hours of racing
                </p>
              </div>

              <Button
                onClick={generateAndUploadMockData}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Generate & Upload Mock Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json-upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload JSON Data</CardTitle>
              <CardDescription>
                Upload race data from a JSON file or URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="json-data">JSON Data</Label>
                <textarea
                  id="json-data"
                  className="w-full min-h-[300px] p-3 border rounded-md font-mono text-sm"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder={`{
  "laps": [...],
  "leaderboard": [...]
}`}
                />
                <p className="text-sm text-muted-foreground">
                  Paste JSON with &quot;laps&quot; and &quot;leaderboard&quot;
                  arrays
                </p>
              </div>

              <Button
                onClick={uploadJsonData}
                disabled={loading || !jsonData}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload JSON Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="race-control">
          <Card>
            <CardHeader>
              <CardTitle>Race State Control</CardTitle>
              <CardDescription>
                Control the current race state and course settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Race State</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => updateRaceState("not_started")}
                    disabled={loading}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Not Started
                  </Button>

                  <Button
                    variant="default"
                    onClick={() => updateRaceState("live")}
                    disabled={loading}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Race (Live)
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => updateRaceState("finished")}
                    disabled={loading}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Finish Race
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Course Settings</h3>
                <div className="space-y-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor="course-distance">Lap Distance (km)</Label>
                      <Input
                        id="course-distance"
                        type="number"
                        step="0.001"
                        placeholder="0.821"
                        defaultValue="0.821"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget;
                            const value = parseFloat(input.value);
                            if (!isNaN(value) && value > 0) {
                              setLoading(true);
                              fetch("/api/race/config", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  courseDistanceKm: value,
                                }),
                              })
                                .then(() => {
                                  toast({
                                    title: "Course distance updated",
                                    description: `Set to ${value} km`,
                                  });
                                })
                                .catch(() => {
                                  toast({
                                    title: "Error",
                                    description:
                                      "Failed to update course distance",
                                    variant: "destructive",
                                  });
                                })
                                .finally(() => setLoading(false));
                            }
                          }
                        }}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById(
                          "course-distance"
                        ) as HTMLInputElement;
                        const value = parseFloat(input.value);
                        if (!isNaN(value) && value > 0) {
                          setLoading(true);
                          fetch("/api/race/config", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ courseDistanceKm: value }),
                          })
                            .then(() => {
                              toast({
                                title: "Course distance updated",
                                description: `Set to ${value} km`,
                              });
                            })
                            .catch(() => {
                              toast({
                                title: "Error",
                                description: "Failed to update course distance",
                                variant: "destructive",
                              });
                            })
                            .finally(() => setLoading(false));
                        }
                      }}
                      disabled={loading}
                    >
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This distance is used for calculating total distance from
                    lap counts. Currently set to 0.821 km (official Albi
                    course).
                  </p>
                </div>
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor="crew-spot-offset">
                        Crew Spot Offset (meters)
                      </Label>
                      <Input
                        id="crew-spot-offset"
                        type="number"
                        step="10"
                        placeholder="0"
                        defaultValue="0"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget;
                            const value = parseInt(input.value);
                            if (!isNaN(value)) {
                              setLoading(true);
                              fetch("/api/race/config", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  crewSpotOffsetMeters: value,
                                }),
                              })
                                .then(() => {
                                  toast({
                                    title: "Crew spot offset updated",
                                    description: `Set to ${
                                      value > 0 ? "+" : ""
                                    }${value}m`,
                                  });
                                })
                                .catch(() => {
                                  toast({
                                    title: "Error",
                                    description:
                                      "Failed to update crew spot offset",
                                    variant: "destructive",
                                  });
                                })
                                .finally(() => setLoading(false));
                            }
                          }
                        }}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById(
                          "crew-spot-offset"
                        ) as HTMLInputElement;
                        const value = parseInt(input.value);
                        if (!isNaN(value)) {
                          setLoading(true);
                          fetch("/api/race/config", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              crewSpotOffsetMeters: value,
                            }),
                          })
                            .then(() => {
                              toast({
                                title: "Crew spot offset updated",
                                description: `Set to ${
                                  value > 0 ? "+" : ""
                                }${value}m`,
                              });
                            })
                            .catch(() => {
                              toast({
                                title: "Error",
                                description:
                                  "Failed to update crew spot offset",
                                variant: "destructive",
                              });
                            })
                            .finally(() => setLoading(false));
                        }
                      }}
                      disabled={loading}
                    >
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Offset in meters for crew spot from timing mat. Positive =
                    after timing mat, Negative = before timing mat. Used for
                    crew countdown predictions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-fetcher">
          <Card>
            <CardHeader>
              <CardTitle>Race Data Fetcher</CardTitle>
              <CardDescription>
                Manually trigger the race data scraper or configure automatic
                fetching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  The data fetcher runs automatically every 60 seconds during
                  the race via Vercel Cron. You can also trigger a manual fetch
                  here.
                </p>

                <Button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/cron/fetch-race-data", {
                        headers: {
                          Authorization: `Bearer ${
                            process.env.NEXT_PUBLIC_CRON_SECRET || "dev-secret"
                          }`,
                        },
                      });
                      const data = await res.json();

                      if (res.ok) {
                        toast({
                          title: "Data fetched successfully",
                          description: `${data.lapsUpdated || 0} laps, ${
                            data.runnersUpdated || 0
                          } runners updated`,
                        });
                      } else {
                        throw new Error(data.error || "Failed to fetch data");
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description:
                          error instanceof Error
                            ? error.message
                            : "Failed to fetch data",
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Manual Fetch Now
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-2">Configuration</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  To configure the data source, set the following environment
                  variables:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">
                      RACE_DATA_SOURCE_URL
                    </code>{" "}
                    - Base URL for race data
                  </li>
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">
                      CRON_SECRET
                    </code>{" "}
                    - Secret for Vercel Cron authentication
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
