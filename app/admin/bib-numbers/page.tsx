"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Save, Check, Loader2, Hash, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RunnerBib {
  id: number;
  entryId: string;
  firstname: string;
  lastname: string;
  nationality: string;
  gender: string;
  bib: number | null;
}

export default function BibNumbersPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [runners, setRunners] = useState<RunnerBib[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<"all" | "M" | "W">("all");

  useEffect(() => {
    if (!isAdmin) {
      router.push("/");
      return;
    }

    loadRunners();
  }, [isAdmin, router]);

  async function loadRunners() {
    try {
      const response = await fetch("/api/runners");
      if (!response.ok) throw new Error("Failed to fetch runners");

      const data = await response.json();
      const runnersData: RunnerBib[] = data.runners.map((r: any) => ({
        id: r.id,
        entryId: r.entryId,
        firstname: r.firstname,
        lastname: r.lastname,
        nationality: r.nationality,
        gender: r.gender,
        bib: r.bib || null,
      }));

      setRunners(runnersData);
    } catch (err) {
      console.error("Error loading runners:", err);
    } finally {
      setLoading(false);
    }
  }

  const updateBib = (id: number, bibValue: string) => {
    const bib = bibValue === "" ? null : parseInt(bibValue);
    setRunners(
      runners.map((r) => (r.id === id ? { ...r, bib: bib || null } : r))
    );
  };

  const clearBib = (id: number) => {
    setRunners(runners.map((r) => (r.id === id ? { ...r, bib: null } : r)));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save all runners with their bib numbers
      const updates = runners.map(async (runner) => {
        const response = await fetch(`/api/runners/${runner.entryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bib: runner.bib }),
        });
        return response.ok;
      });

      const results = await Promise.all(updates);
      const allSuccess = results.every((r) => r);

      if (allSuccess) {
        alert("All bib numbers saved successfully!");
      } else {
        alert("Some updates failed. Please check and try again.");
      }
    } catch (err) {
      console.error("Error saving bib numbers:", err);
      alert("Error saving bib numbers");
    } finally {
      setSaving(false);
    }
  };

  // Filter runners
  const filteredRunners = runners.filter((runner) => {
    const matchesSearch =
      searchQuery === "" ||
      runner.firstname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      runner.lastname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      runner.nationality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      runner.bib?.toString().includes(searchQuery);

    const matchesGender =
      filterGender === "all" || runner.gender === filterGender;

    return matchesSearch && matchesGender;
  });

  // Check for duplicate bib numbers
  const bibCounts = new Map<number, number>();
  runners.forEach((r) => {
    if (r.bib) {
      bibCounts.set(r.bib, (bibCounts.get(r.bib) || 0) + 1);
    }
  });

  const hasDuplicates = Array.from(bibCounts.values()).some(
    (count) => count > 1
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bib Number Assignment</h1>
            <p className="text-muted-foreground mt-2">
              Assign race bib numbers to runners for live timing identification
            </p>
          </div>
          <Button onClick={saveAll} disabled={saving || hasDuplicates}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save All
          </Button>
        </div>

        {hasDuplicates && (
          <div className="bg-red-500/20 border-l-4 border-red-500 px-4 py-3 mt-4 rounded">
            <p className="text-sm text-red-900 dark:text-red-100 font-medium">
              ⚠️ Duplicate bib numbers detected! Please ensure each bib number
              is unique.
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search by name, country, or bib number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterGender === "all" ? "default" : "outline"}
                onClick={() => setFilterGender("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterGender === "M" ? "default" : "outline"}
                onClick={() => setFilterGender("M")}
                size="sm"
              >
                Men
              </Button>
              <Button
                variant={filterGender === "W" ? "default" : "outline"}
                onClick={() => setFilterGender("W")}
                size="sm"
              >
                Women
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Runners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runners.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {runners.filter((r) => r.bib !== null).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {runners.filter((r) => r.bib === null).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Runners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Runners ({filteredRunners.length})</CardTitle>
          <CardDescription>
            Enter bib numbers for each runner. These will be used to match live
            timing data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredRunners.map((runner) => {
              const isDuplicate =
                runner.bib !== null && (bibCounts.get(runner.bib) || 0) > 1;

              return (
                <div
                  key={runner.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border",
                    isDuplicate && "bg-red-50 dark:bg-red-950/20 border-red-500"
                  )}
                >
                  <div className="w-20">
                    <div className="relative">
                      <Hash className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        max="9999"
                        placeholder="Bib"
                        value={runner.bib || ""}
                        onChange={(e) => updateBib(runner.id, e.target.value)}
                        className={cn("pl-8", isDuplicate && "border-red-500")}
                      />
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <div className="font-medium">
                        {runner.firstname} {runner.lastname}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {runner.entryId}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Country
                      </div>
                      <div className="font-medium">{runner.nationality}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Gender
                      </div>
                      <div className="font-medium">{runner.gender}</div>
                    </div>
                  </div>

                  {runner.bib && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearBib(runner.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}

                  {runner.bib && !isDuplicate && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



