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
import { ACUTE_CONDITIONS, TZ_REGIONS } from "@/lib/utils";
import { AlertCircle, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const conditionSchema = z.object({
  acuteCondition: z.string().min(1, "Condition required"),
  notes: z.string().optional(),
  occurrence: z.string().optional(),
  unconsciousTreatmentRemedy: z.string().optional(),
  hospital: z.string().optional(),
  hospitalRegion: z.string().optional(),
  hospitalDistrict: z.string().optional(),
  hospitalContacts: z.string().optional(),
  doctorName: z.string().optional(),
  doctorContacts: z.string().optional(),
});

const schema = z.object({
  desperateConditions: z.array(conditionSchema),
});

type FormData = z.infer<typeof schema>;

const OCCURRENCE_OPTIONS = [
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "Occasionally", label: "Occasionally" },
  { value: "Rarely", label: "Rarely" },
  { value: "Under Stress", label: "Under Stress" },
];

export default function DesperateConditionsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { desperateConditions: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "desperateConditions",
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        const conditions = data.desperateConditions || [];
        reset({ desperateConditions: conditions });
        if (conditions.length > 0) setExpanded(0);
      } catch {
        toast.error("Failed to load conditions");
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
        body: JSON.stringify({ desperateConditions: data.desperateConditions }),
      });
      if (res.ok) {
        toast.success("Medical conditions saved!");
      } else {
        toast.error("Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  const emptyCondition = {
    acuteCondition: "",
    notes: "",
    occurrence: "",
    unconsciousTreatmentRemedy: "",
    hospital: "",
    hospitalRegion: "",
    hospitalDistrict: "",
    hospitalContacts: "",
    doctorName: "",
    doctorContacts: "",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950 rounded-2xl">
        <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
        <div className="text-sm text-rose-800 dark:text-rose-200">
          <p className="font-semibold">Critical emergency information</p>
          <p className="text-xs mt-0.5 opacity-80">
            This information is shown to first responders when your QR code is scanned.
            Be as accurate as possible — it could save your life.
          </p>
        </div>
      </div>

      {/* Condition cards */}
      {fields.map((field, index) => {
        const isExpanded = expanded === index;
        return (
          <Card key={field.id} className="border-rose-100 dark:border-rose-900">
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : index)}
              className="w-full text-left"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm text-rose-800 dark:text-rose-200">
                    <AlertCircle size={14} />
                    Condition {index + 1}
                    {errors.desperateConditions?.[index] && (
                      <Badge variant="destructive" className="text-xs">Incomplete</Badge>
                    )}
                  </CardTitle>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </CardHeader>
            </button>

            {isExpanded && (
              <CardContent className="pt-0 space-y-3">
                <Select
                  label="Acute Condition *"
                  options={ACUTE_CONDITIONS.map((c) => ({ value: c, label: c }))}
                  placeholder="Select condition"
                  error={errors.desperateConditions?.[index]?.acuteCondition?.message}
                  {...register(`desperateConditions.${index}.acuteCondition`)}
                />

                <Input
                  label="Notes / Description"
                  placeholder="Additional details about this condition"
                  {...register(`desperateConditions.${index}.notes`)}
                />

                <Select
                  label="Occurrence / Frequency"
                  options={OCCURRENCE_OPTIONS}
                  placeholder="How often does this occur?"
                  {...register(`desperateConditions.${index}.occurrence`)}
                />

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Emergency / Unconscious Treatment Remedy
                  </label>
                  <textarea
                    rows={3}
                    placeholder="What should first responders do if you are unconscious? e.g. Inject adrenaline, give sugar..."
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-colors resize-none"
                    {...register(`desperateConditions.${index}.unconsciousTreatmentRemedy`)}
                  />
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    This field is always shown publicly — it is critical for emergency responders.
                  </p>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                    Treatment Hospital
                  </p>
                  <div className="space-y-3">
                    <Input
                      label="Hospital Name"
                      {...register(`desperateConditions.${index}.hospital`)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Hospital Region"
                        options={TZ_REGIONS.map((r) => ({ value: r, label: r }))}
                        placeholder="Select region"
                        {...register(`desperateConditions.${index}.hospitalRegion`)}
                      />
                      <Input
                        label="Hospital District"
                        {...register(`desperateConditions.${index}.hospitalDistrict`)}
                      />
                    </div>
                    <Input
                      label="Hospital Contacts"
                      type="tel"
                      {...register(`desperateConditions.${index}.hospitalContacts`)}
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
                    Doctor Details
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Doctor Name"
                      {...register(`desperateConditions.${index}.doctorName`)}
                    />
                    <Input
                      label="Doctor Contacts"
                      type="tel"
                      {...register(`desperateConditions.${index}.doctorContacts`)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  fullWidth
                  onClick={() => remove(index)}
                >
                  <Trash2 size={14} /> Remove Condition
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}

      {fields.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-4">
          No medical conditions added yet.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={() => {
          append(emptyCondition);
          setExpanded(fields.length);
        }}
      >
        <Plus size={16} /> Add Medical Condition
      </Button>

      <Button type="submit" fullWidth loading={saving}>
        Save Medical Conditions
      </Button>
    </form>
  );
}
