"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BLOOD_GROUPS, TZ_REGIONS, EMPLOYMENT_TYPES
} from "@/lib/utils";
import { Heart, MapPin, Phone, AlertCircle, Briefcase, User } from "lucide-react";
import EmergencyContactsForm from "./EmergencyContactsForm";
import DesperateConditionsForm from "./DesperateConditionsForm";

interface Props {
  session: Session;
  section: string;
}

const SECTIONS = [
  { id: "basic", label: "Basic Details", icon: User },
  { id: "health", label: "Health Info", icon: Heart },
  { id: "residence", label: "Residence", icon: MapPin },
  { id: "emergency", label: "Emergency Contacts", icon: Phone },
  { id: "desperate", label: "Medical Conditions", icon: AlertCircle },
  { id: "employment", label: "Employment", icon: Briefcase },
];

export default function ProfileEditForm({ session, section }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(section);

  const { register, handleSubmit, reset, watch } = useForm();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        setProfile(data);
        reset(flattenProfile(data));
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reset]);

  function flattenProfile(p: any) {
    return {
      commonName: p.commonName || "",
      firstName: p.firstName || "",
      middleName: p.middleName || "",
      lastName: p.lastName || "",
      gender: p.gender || "",
      mobile1: p.mobile1 || "",
      mobile2: p.mobile2 || "",
      "health.bloodGroup": p.health?.bloodGroup || "",
      "health.height": p.health?.height || "",
      "health.weight": p.health?.weight || "",
      "residence.region": p.residence?.region || "",
      "residence.district": p.residence?.district || "",
      "residence.ward": p.residence?.ward || "",
      "residence.localAuthorityName": p.residence?.localAuthorityName || "",
      "residence.street": p.residence?.street || "",
      "residence.neighborhoodDetails": p.residence?.neighborhoodDetails || "",
      "employment.employmentType": p.employment?.employmentType || "",
      "employment.employerName": p.employment?.employerName || "",
      "employment.employmentPosition": p.employment?.employmentPosition || "",
    };
  }

  async function onSubmit(data: any) {
    setSaving(true);
    try {
      // Reconstruct nested object
      const update = buildNestedObject(data);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });

      if (res.ok) {
        toast.success("Profile saved!");
        const updated = await res.json();
        setProfile(updated);
      } else {
        toast.error("Failed to save profile");
      }
    } finally {
      setSaving(false);
    }
  }

  function buildNestedObject(flat: any) {
    const result: any = {};
    for (const key of Object.keys(flat)) {
      const parts = key.split(".");
      if (parts.length === 1) {
        result[key] = flat[key];
      } else {
        if (!result[parts[0]]) result[parts[0]] = {};
        result[parts[0]][parts[1]] = flat[key];
      }
    }
    return result;
  }

  const employmentType = watch("employment.employmentType");
  const isNotWorking = employmentType === "Not Working";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeSection === s.id
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <s.icon size={12} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Basic Details */}
      {activeSection === "basic" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User size={16} /> Basic Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Input label="Common Name (Nickname)" {...register("commonName")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" {...register("firstName")} />
              <Input label="Last Name" {...register("lastName")} />
            </div>
            <Input label="Middle Name" {...register("middleName")} />
            <Select
              label="Gender"
              options={[
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
              ]}
              {...register("gender")}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Mobile 1" type="tel" {...register("mobile1")} />
              <Input label="Mobile 2" type="tel" {...register("mobile2")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Info */}
      {activeSection === "health" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-700"><Heart size={16} /> Health Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Select
              label="Blood Group"
              options={BLOOD_GROUPS.map((g) => ({ value: g, label: g }))}
              placeholder="Select blood group"
              {...register("health.bloodGroup")}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Height (e.g. 175cm)" {...register("health.height")} />
              <Input label="Weight (e.g. 70kg)" {...register("health.weight")} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Residence */}
      {activeSection === "residence" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><MapPin size={16} /> Residence</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Select
              label="Region"
              options={TZ_REGIONS.map((r) => ({ value: r, label: r }))}
              placeholder="Select region"
              {...register("residence.region")}
            />
            <Input label="District" {...register("residence.district")} />
            <Input label="Ward" {...register("residence.ward")} />
            <Input label="Local Authority Name" {...register("residence.localAuthorityName")} />
            <Input label="Street" {...register("residence.street")} />
            <Input label="Extra Neighborhood Details" {...register("residence.neighborhoodDetails")} />
          </CardContent>
        </Card>
      )}

      {/* Emergency contacts — delegated to dedicated form */}
      {activeSection === "emergency" && (
        <EmergencyContactsForm />
      )}

      {/* Medical Conditions — delegated to dedicated form */}
      {activeSection === "desperate" && (
        <DesperateConditionsForm />
      )}

      {/* Employment */}
      {activeSection === "employment" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-purple-700"><Briefcase size={16} /> Employment Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Select
              label="Employment Type"
              options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder="Select employment type"
              {...register("employment.employmentType")}
            />
            {!isNotWorking && (
              <>
                <Input label="Employer Name" {...register("employment.employerName")} />
                <Input label="Employment Position" {...register("employment.employmentPosition")} />
                <Input label="Office Contacts" {...register("employment.officeContacts")} />
                <Input label="Supervisor Name" {...register("employment.supervisorName")} />
                <Input label="Supervisor Contacts" {...register("employment.supervisorContacts1")} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Button type="submit" fullWidth loading={saving}>
        Save Changes
      </Button>
    </form>
  );
}
