"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/hooks/use-toast";
import {
  Upload,
  RefreshCw,
  Play,
  Square,
  Database,
  Download,
  MapPin,
} from "lucide-react";

const TimingMatLocationPicker = dynamic(
  () =>
    import("@/components/admin/TimingMatLocationPicker").then((mod) => ({
      default: mod.TimingMatLocationPicker,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-muted/20 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export default function RaceLiveAdminPage() {
  const [hours, setHours] = useState("12");
  const [loading, setLoading] = useState(false);
  const [jsonData, setJsonData] = useState("");
  const [courseDistance, setCourseDistance] = useState("0.821");
  const [crewSpotOffset, setCrewSpotOffset] = useState("0");
  const [timingMatLat, setTimingMatLat] = useState("");
  const [timingMatLon, setTimingMatLon] = useState("");
  const [breakThreshold, setBreakThreshold] = useState("2.5");
  const [overdueDisplay, setOverdueDisplay] = useState("180");
  const [reverseTrackDirection, setReverseTrackDirection] = useState(false);
  const { toast } = useToast();

  // Fetch current config values
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/race/config");
        if (res.ok) {
          const data = await res.json();
          if (data.course_distance_km)
            setCourseDistance(String(data.course_distance_km));
          if (data.crew_spot_offset_meters !== undefined)
            setCrewSpotOffset(String(data.crew_spot_offset_meters));
          if (data.timing_mat_lat) setTimingMatLat(String(data.timing_mat_lat));
          if (data.timing_mat_lon) setTimingMatLon(String(data.timing_mat_lon));
          if (data.break_detection_threshold_multiplier)
            setBreakThreshold(
              String(data.break_detection_threshold_multiplier)
            );
          if (data.overdue_display_seconds)
            setOverdueDisplay(String(data.overdue_display_seconds));
          if (data.reverse_track_direction !== undefined)
            setReverseTrackDirection(data.reverse_track_direction);
        }
      } catch (err) {
        console.error("Failed to fetch config:", err);
      }
    };
    fetchConfig();
  }, []);

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
          <TabsTrigger value="map-config">Map Config</TabsTrigger>
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
                        value={courseDistance}
                        onChange={(e) => setCourseDistance(e.target.value)}
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
                        const value = parseFloat(courseDistance);
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
                        value={crewSpotOffset}
                        onChange={(e) => setCrewSpotOffset(e.target.value)}
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
                        const value = parseInt(crewSpotOffset);
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

        <TabsContent value="map-config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Live Map Configuration
              </CardTitle>
              <CardDescription>
                Configure the live map display, timing mat location, and break
                detection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timing Mat Location */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Timing Mat Location</h3>
                <p className="text-sm text-muted-foreground">
                  📍 Click on the map to set the timing mat location, or enter
                  coordinates manually below.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ <strong>Important:</strong> The timing mat must be placed
                    within <strong>10 meters</strong> of the course track. This
                    ensures runner positions are calculated correctly relative
                    to their actual position on the course.
                  </p>
                </div>

                {/* Interactive Map */}
                <TimingMatLocationPicker
                  initialLat={parseFloat(timingMatLat) || 43.9232716}
                  initialLon={parseFloat(timingMatLon) || 2.1670189}
                  onLocationChange={(lat, lon) => {
                    setTimingMatLat(lat.toFixed(7));
                    setTimingMatLon(lon.toFixed(7));
                  }}
                />

                {/* Manual Coordinate Input */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="timing-mat-lat">Latitude</Label>
                    <Input
                      id="timing-mat-lat"
                      type="number"
                      step="0.0000001"
                      placeholder="43.9232716"
                      value={timingMatLat}
                      onChange={(e) => setTimingMatLat(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timing-mat-lon">Longitude</Label>
                    <Input
                      id="timing-mat-lon"
                      type="number"
                      step="0.0000001"
                      placeholder="2.1670189"
                      value={timingMatLon}
                      onChange={(e) => setTimingMatLon(e.target.value)}
                    />
                  </div>
                </div>

                {/* Direction Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="reverse-direction" className="text-base">
                      Reverse Track Direction
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable if runners go opposite to how the GPX was recorded
                    </p>
                  </div>
                  <Switch
                    id="reverse-direction"
                    checked={reverseTrackDirection}
                    onCheckedChange={setReverseTrackDirection}
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={async () => {
                    const lat = parseFloat(timingMatLat);
                    const lon = parseFloat(timingMatLon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                      setLoading(true);
                      try {
                        // Validate distance first
                        const validateRes = await fetch(
                          "/api/race/validate-timing-mat",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ lat, lon }),
                          }
                        );

                        if (validateRes.ok) {
                          const validation = await validateRes.json();

                          if (!validation.valid) {
                            toast({
                              title: "⚠️ Timing mat too far from course",
                              description: `The timing mat is ${validation.distance.toFixed(
                                1
                              )}m from the track (max: ${
                                validation.maxDistance
                              }m). Please move it closer to the course.`,
                              variant: "destructive",
                            });
                            setLoading(false);
                            return;
                          }

                          // Show warning if close to limit
                          if (
                            validation.distance > 5 &&
                            validation.distance <= 10
                          ) {
                            toast({
                              title: "⚠️ Close to limit",
                              description: `Timing mat is ${validation.distance.toFixed(
                                1
                              )}m from track. Consider moving it closer.`,
                            });
                          }
                        }

                        // Save configuration
                        const res = await fetch("/api/race/config", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            timingMatLat: lat,
                            timingMatLon: lon,
                            reverseTrackDirection: reverseTrackDirection,
                          }),
                        });

                        if (!res.ok) {
                          const errorData = await res.json();
                          throw new Error(
                            errorData.error ||
                              `HTTP error! status: ${res.status}`
                          );
                        }

                        toast({
                          title: "✅ Map configuration updated",
                          description: `Position: ${lat.toFixed(
                            4
                          )}, ${lon.toFixed(4)} | Direction: ${
                            reverseTrackDirection ? "REVERSED" : "Normal"
                          }`,
                        });
                      } catch (err) {
                        console.error("Update error:", err);
                        const errorMessage =
                          err instanceof Error
                            ? err.message
                            : "Failed to update map configuration";
                        toast({
                          title: "Error updating configuration",
                          description: errorMessage,
                          variant: "destructive",
                        });
                      } finally {
                        setLoading(false);
                      }
                    } else {
                      toast({
                        title: "Invalid coordinates",
                        description:
                          "Please enter valid latitude and longitude values",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  Update Map Configuration
                </Button>
              </div>

              {/* Break Detection Settings */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="text-sm font-medium">
                  Break Detection Settings
                </h3>
                <div>
                  <Label htmlFor="break-threshold">
                    Break Detection Threshold Multiplier
                  </Label>
                  <Input
                    id="break-threshold"
                    type="number"
                    step="0.1"
                    min="1.5"
                    max="5"
                    placeholder="2.5"
                    value={breakThreshold}
                    onChange={(e) => setBreakThreshold(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A lap is considered a "break" if it's longer than{" "}
                    {breakThreshold}x the predicted lap time. Lower = more
                    sensitive, Higher = less sensitive. (Range: 1.5 - 5.0)
                  </p>
                </div>
                <div>
                  <Label htmlFor="overdue-display">
                    Overdue Display Time (seconds)
                  </Label>
                  <Input
                    id="overdue-display"
                    type="number"
                    step="30"
                    min="60"
                    max="600"
                    placeholder="180"
                    value={overdueDisplay}
                    onChange={(e) => setOverdueDisplay(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How many seconds to show a runner as "overdue" near the
                    timing mat before marking them as "on break". (Range: 60 -
                    600)
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const threshold = parseFloat(breakThreshold);
                    const displaySecs = parseInt(overdueDisplay);
                    if (
                      !isNaN(threshold) &&
                      !isNaN(displaySecs) &&
                      threshold >= 1.5 &&
                      threshold <= 5 &&
                      displaySecs >= 60 &&
                      displaySecs <= 600
                    ) {
                      setLoading(true);
                      try {
                        const res = await fetch("/api/race/config", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            breakDetectionThresholdMultiplier: threshold,
                            overdueDisplaySeconds: displaySecs,
                          }),
                        });

                        if (!res.ok) {
                          throw new Error(`HTTP error! status: ${res.status}`);
                        }

                        toast({
                          title: "Break detection settings updated",
                          description: `Threshold: ${threshold}x, Overdue: ${displaySecs}s`,
                        });
                      } catch (err) {
                        console.error("Update error:", err);
                        toast({
                          title: "Error",
                          description:
                            "Failed to update break detection settings",
                          variant: "destructive",
                        });
                      } finally {
                        setLoading(false);
                      }
                    } else {
                      toast({
                        title: "Invalid values",
                        description:
                          "Please check the input ranges and try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  Update Break Detection Settings
                </Button>
              </div>

              {/* Quick Link to Map */}
              <div className="border-t pt-4">
                <Button
                  variant="secondary"
                  onClick={() => window.open("/live/map", "_blank")}
                  className="w-full"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Open Live Map
                </Button>
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
