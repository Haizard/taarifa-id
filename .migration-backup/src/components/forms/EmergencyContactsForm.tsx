"use client";

import { useState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RELATION_TYPES, TZ_REGIONS } from "@/lib/utils";
import { Phone, Plus, Trash2, Star } from "lucide-react";

const contactSchema = z.object({
  fullName: z.string().min(2, "Name required"),
  mobile1: z.string().min(9, "Mobile required"),
  mobile2: z.string().optional(),
  altMobile1: z.string().optional(),
  altMobile2: z.string().optional(),
  relationType: z.string().min(1, "Relation required"),
  fluentLanguage: z.string().optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  ward: z.string().optional(),
  localAuthorityName: z.string().optional(),
  extraNotes: z.string().optional(),
});

const schema = z.object({
  emergencyContacts: z.array(contactSchema).max(3, "Maximum 3 contacts"),
});

type FormData = z.infer<typeof schema>;

export default function EmergencyContactsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { emergencyContacts: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergencyContacts",
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        reset({ emergencyContacts: data.emergencyContacts || [] });
        if ((data.emergencyContacts || []).length > 0) setExpanded(0);
      } catch {
        toast.error("Failed to load contacts");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reset]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emergencyContacts: data.emergencyContacts }),
      });
      if (res.ok) {
        toast.success("Emergency contacts saved!");
      } else {
        toast.error("Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Header info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-2xl">
        <Phone size={18} className="text-blue-700 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-semibold">Up to 3 emergency contacts</p>
          <p className="text-xs mt-0.5 opacity-80">
            The first entry will be the <strong>Prime</strong> contact shown when your QR is scanned.
          </p>
        </div>
      </div>

      {/* Contact cards */}
      {fields.map((field, index) => {
        const isExpanded = expanded === index;
        const label = index === 0 ? "Prime Contact" : `Option ${index + 1}`;
        return (
          <Card key={field.id}>
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : index)}
              className="w-full text-left"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {index === 0 && <Star size={14} className="text-amber-500 fill-amber-500" />}
                    {label}
                    {(errors.emergencyContacts?.[index]) && (
                      <Badge variant="destructive" className="text-xs">Incomplete</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>
              </CardHeader>
            </button>

            {isExpanded && (
              <CardContent className="pt-0 space-y-3">
                <Input
                  label="Full Name *"
                  error={errors.emergencyContacts?.[index]?.fullName?.message}
                  {...register(`emergencyContacts.${index}.fullName`)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Mobile 1 *"
                    type="tel"
                    error={errors.emergencyContacts?.[index]?.mobile1?.message}
                    {...register(`emergencyContacts.${index}.mobile1`)}
                  />
                  <Input
                    label="Mobile 2"
                    type="tel"
                    {...register(`emergencyContacts.${index}.mobile2`)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Alt Mobile 1"
                    type="tel"
                    {...register(`emergencyContacts.${index}.altMobile1`)}
                  />
                  <Input
                    label="Alt Mobile 2"
                    type="tel"
                    {...register(`emergencyContacts.${index}.altMobile2`)}
                  />
                </div>

                <Select
                  label="Relation Type *"
                  options={RELATION_TYPES.map((r) => ({ value: r, label: r }))}
                  placeholder="Select relation"
                  error={errors.emergencyContacts?.[index]?.relationType?.message}
                  {...register(`emergencyContacts.${index}.relationType`)}
                />

                <Input
                  label="Fluent Language"
                  placeholder="e.g. Swahili, English"
                  {...register(`emergencyContacts.${index}.fluentLanguage`)}
                />

                <Select
                  label="Region"
                  options={TZ_REGIONS.map((r) => ({ value: r, label: r }))}
                  placeholder="Select region"
                  {...register(`emergencyContacts.${index}.region`)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="District"
                    {...register(`emergencyContacts.${index}.district`)}
                  />
                  <Input
                    label="Ward"
                    {...register(`emergencyContacts.${index}.ward`)}
                  />
                </div>

                <Input
                  label="Local Authority Name"
                  {...register(`emergencyContacts.${index}.localAuthorityName`)}
                />

                <Input
                  label="Extra Notes"
                  {...register(`emergencyContacts.${index}.extraNotes`)}
                />

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(index)}
                  className="w-full mt-2"
                >
                  <Trash2 size={14} /> Remove Contact
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Add contact */}
      {fields.length < 3 && (
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => {
            append({
              fullName: "",
              mobile1: "",
              mobile2: "",
              altMobile1: "",
              altMobile2: "",
              relationType: "",
              fluentLanguage: "",
              region: "",
              district: "",
              ward: "",
              localAuthorityName: "",
              extraNotes: "",
            });
            setExpanded(fields.length);
          }}
        >
          <Plus size={16} />
          Add {fields.length === 0 ? "Prime Contact" : `Option ${fields.length + 1}`}
        </Button>
      )}

      {fields.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          No emergency contacts added yet.
        </p>
      )}

      <Button type="submit" fullWidth loading={saving}>
        Save Emergency Contacts
      </Button>
    </form>
  );
}
