"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { RichTextEditor } from "@/components/editors/RichTextEditor";
import type { RaceInfo } from "@/types/race";

export default function AdminRacePage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [raceInfo, setRaceInfo] = useState<RaceInfo | null>(null);
  const [formData, setFormData] = useState({
    raceNameEn: "",
    raceNameSv: "",
    descriptionEn: "",
    descriptionSv: "",
    startDate: "",
    endDate: "",
    locationName: "",
    locationAddress: "",
    liveResultsUrl: "",
    registrationUrl: "",
    officialWebsiteUrl: "",
    courseMapUrl: "",
    heroImageUrl: "",
    rulesEn: "",
    rulesSv: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    if (isAdmin) {
      fetchRaceInfo();
    } else if (!isAdmin && typeof window !== "undefined") {
      router.push("/");
    }
  }, [isAdmin, router]);

  // Helper function to format UTC timestamp for datetime-local input in race's timezone
  function formatDateTimeForInput(isoString: string | null): string {
    if (!isoString) return "";

    // The race is in Albi, France (Europe/Paris timezone)
    // Convert UTC to local time in Europe/Paris for display in the form
    const date = new Date(isoString);

    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    // We need to get the local time in the race timezone (Europe/Paris)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    const formatter = new Intl.DateTimeFormat("sv-SE", options);
    const parts = formatter.formatToParts(date);

    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  async function fetchRaceInfo() {
    try {
      const response = await fetch("/api/race");
      if (response.ok) {
        const data = await response.json();
        setRaceInfo(data);
        setFormData({
          raceNameEn: data.raceNameEn || "",
          raceNameSv: data.raceNameSv || "",
          descriptionEn: data.descriptionEn || "",
          descriptionSv: data.descriptionSv || "",
          startDate: formatDateTimeForInput(data.startDate),
          endDate: formatDateTimeForInput(data.endDate),
          locationName: data.locationName || "",
          locationAddress: data.locationAddress || "",
          liveResultsUrl: data.liveResultsUrl || "",
          registrationUrl: data.registrationUrl || "",
          officialWebsiteUrl: data.officialWebsiteUrl || "",
          courseMapUrl: data.courseMapUrl || "",
          heroImageUrl: data.heroImageUrl || "",
          rulesEn: data.rulesEn || "",
          rulesSv: data.rulesSv || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch race info:", error);
    } finally {
      setLoading(false);
    }
  }

  // Helper function to convert datetime-local value to ISO string in race's timezone
  function datetimeLocalToISO(datetimeLocal: string): string | null {
    if (!datetimeLocal) return null;

    // The datetime-local value is in format YYYY-MM-DDTHH:mm
    // We need to interpret this as being in the race's timezone (Europe/Paris)
    // and convert it to UTC for storage

    // Parse the datetime-local value
    const [datePart, timePart] = datetimeLocal.split("T");
    const [year, month, day] = datePart.split("-");
    const [hour, minute] = timePart.split(":");

    // Create a date string in ISO format WITH timezone offset for Europe/Paris
    // We'll use a library approach: format the string as if it's in Europe/Paris
    // Note: This is a simplified approach. For production, consider using a library like date-fns-tz

    // Europe/Paris is UTC+1 in winter, UTC+2 in summer (CEST)
    // The race is in October, so it could be either depending on DST rules
    // For October 2025, DST ends on Oct 26, so Oct 18 is still CEST (UTC+2)
    const raceTimezoneOffset = "+02:00"; // CEST for October 18, 2025

    // Create ISO string with timezone
    const isoWithTZ = `${year}-${month}-${day}T${hour}:${minute}:00${raceTimezoneOffset}`;

    // Convert to UTC
    return new Date(isoWithTZ).toISOString();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!raceInfo) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/race/${raceInfo.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          startDate: datetimeLocalToISO(formData.startDate),
          endDate: datetimeLocalToISO(formData.endDate),
        }),
      });

      if (response.ok) {
        // Trigger cache revalidation
        await fetch("/api/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paths: ["/", "/loppet", "/participants"],
          }),
        });

        alert("Race information updated successfully!");
        fetchRaceInfo();
      } else {
        alert("Failed to update race information");
      }
    } catch (error) {
      console.error("Error updating race info:", error);
      alert("Failed to update race information");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">Edit Race Information</h1>
          <p className="text-muted-foreground">
            Manage race details for IAU 24h WC 2025
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="raceNameEn">Race Name (English)</Label>
                  <Input
                    id="raceNameEn"
                    value={formData.raceNameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, raceNameEn: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="raceNameSv">Race Name (Swedish)</Label>
                  <Input
                    id="raceNameSv"
                    value={formData.raceNameSv}
                    onChange={(e) =>
                      setFormData({ ...formData, raceNameSv: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <RichTextEditor
                  content={formData.descriptionEn}
                  onChange={(content) =>
                    setFormData({ ...formData, descriptionEn: content })
                  }
                  placeholder="Enter course description, add images, and links..."
                />
              </div>

              <div>
                <Label htmlFor="descriptionSv">Description (Swedish)</Label>
                <RichTextEditor
                  content={formData.descriptionSv}
                  onChange={(content) =>
                    setFormData({ ...formData, descriptionSv: content })
                  }
                  placeholder="Ange banebeskrivning, lägg till bilder och länkar..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Date & Location */}
          <Card>
            <CardHeader>
              <CardTitle>Date & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date & Time</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date & Time</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="locationName">Location Name</Label>
                <Input
                  id="locationName"
                  value={formData.locationName}
                  onChange={(e) =>
                    setFormData({ ...formData, locationName: e.target.value })
                  }
                  placeholder="e.g., Albi, France"
                />
              </div>

              <div>
                <Label htmlFor="locationAddress">Location Address</Label>
                <Input
                  id="locationAddress"
                  value={formData.locationAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      locationAddress: e.target.value,
                    })
                  }
                  placeholder="Full address"
                />
              </div>
            </CardContent>
          </Card>

          {/* Links & Media */}
          <Card>
            <CardHeader>
              <CardTitle>Links & Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="liveResultsUrl">Live Results URL</Label>
                <Input
                  id="liveResultsUrl"
                  type="url"
                  value={formData.liveResultsUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, liveResultsUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="registrationUrl">Registration URL</Label>
                <Input
                  id="registrationUrl"
                  type="url"
                  value={formData.registrationUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registrationUrl: e.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="officialWebsiteUrl">Official Website URL</Label>
                <Input
                  id="officialWebsiteUrl"
                  type="url"
                  value={formData.officialWebsiteUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      officialWebsiteUrl: e.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="courseMapUrl">Course Map URL</Label>
                <Input
                  id="courseMapUrl"
                  type="url"
                  value={formData.courseMapUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, courseMapUrl: e.target.value })
                  }
                  placeholder="https://... (image URL)"
                />
              </div>

              <div>
                <Label htmlFor="heroImageUrl">Hero Image URL</Label>
                <Input
                  id="heroImageUrl"
                  type="url"
                  value={formData.heroImageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, heroImageUrl: e.target.value })
                  }
                  placeholder="https://... (image URL)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Rules & Regulations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rulesEn">Rules (English)</Label>
                <Textarea
                  id="rulesEn"
                  value={formData.rulesEn}
                  onChange={(e) =>
                    setFormData({ ...formData, rulesEn: e.target.value })
                  }
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="rulesSv">Rules (Swedish)</Label>
                <Textarea
                  id="rulesSv"
                  value={formData.rulesSv}
                  onChange={(e) =>
                    setFormData({ ...formData, rulesSv: e.target.value })
                  }
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
