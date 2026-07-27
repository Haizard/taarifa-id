import { Heart, Phone, MapPin, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props { profile: Record<string, unknown> }

export default function PublicProfileView({ profile }: Props) {
  const name = (profile.commonName as string) ||
    [(profile.firstName as string), (profile.middleName as string), (profile.lastName as string)].filter(Boolean).join(" ");
  const isOrg = ["Family", "School", "Business", "Institution"].includes(profile.accountType as string);
  const health = profile.health as Record<string, string> | undefined;
  const residence = profile.residence as Record<string, string> | undefined;
  const desperateConditions = profile.desperateConditions as Record<string, string>[] | undefined;
  const emergencyContacts = profile.emergencyContacts as Record<string, string>[] | undefined;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-blue-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="bg-blue-700 text-white py-3 px-4 text-center">
        <p className="text-sm font-medium">TAARIFA_ID — Emergency Profile</p>
        <p className="text-xs opacity-75 mt-0.5">Powered by Sunriver Systems</p>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardContent className="pt-6 text-center">
            {profile.picUrl ? (
              <img src={profile.picUrl as string} alt={name} className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-blue-100 mb-4" />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto bg-blue-700 flex items-center justify-center text-white text-3xl font-bold mb-4 border-4 border-blue-100">
                {name[0]?.toUpperCase() || "?"}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{name}</h1>
            <p className="text-xs text-gray-500 font-mono mt-1">{profile.profileId as string}</p>
            <div className="flex justify-center gap-2 mt-2">
              <Badge>{profile.accountType as string}</Badge>
              {profile.gender && <Badge variant="secondary">{profile.gender as string}</Badge>}
            </div>
            {isOrg && profile.orgName && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Building2 size={14} /><span>{profile.orgName as string}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {health?.bloodGroup && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-red-700"><Heart size={16} /> Health Information</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="bg-red-50 dark:bg-red-950 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-red-600 dark:text-red-300 font-medium">Blood Group</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{health.bloodGroup}</p>
                </div>
                {health.height && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Height: <span className="font-medium text-gray-900 dark:text-gray-100">{health.height}</span></p>
                    <p>Weight: <span className="font-medium text-gray-900 dark:text-gray-100">{health.weight}</span></p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(desperateConditions?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-amber-700"><AlertCircle size={16} /> Medical Conditions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {desperateConditions!.map((cond, i) => (
                <div key={i} className="p-3 bg-amber-50 dark:bg-amber-950 rounded-xl">
                  <p className="font-medium text-sm text-amber-900 dark:text-amber-100">{cond.acuteCondition}</p>
                  {cond.notes && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{cond.notes}</p>}
                  {cond.unconsciousTreatmentRemedy && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded-lg">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">Emergency Treatment:</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{cond.unconsciousTreatmentRemedy}</p>
                    </div>
                  )}
                  {cond.hospital && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">Hospital: {cond.hospital}{cond.hospitalContacts && ` · ${cond.hospitalContacts}`}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {(emergencyContacts?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-green-700"><Phone size={16} /> Emergency Contacts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {emergencyContacts!.slice(0, 3).map((contact, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 dark:text-green-300 font-bold text-sm shrink-0">{contact.fullName?.[0] || "?"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{contact.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{contact.relationType}</p>
                    {contact.mobile1 && <a href={`tel:${contact.mobile1}`} className="text-xs text-blue-700 dark:text-blue-400 font-medium">{contact.mobile1}</a>}
                  </div>
                  {i === 0 && <Badge variant="success" className="shrink-0">Prime</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {residence?.region && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-purple-700"><MapPin size={16} /> Location</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300">{[residence.street, residence.ward, residence.district, residence.region].filter(Boolean).join(", ")}</p>
            </CardContent>
          </Card>
        )}

        <div className="text-center py-4">
          <p className="text-xs text-gray-400">This profile is verified by TAARIFA_ID · Sunriver Systems</p>
          <p className="text-xs text-gray-400 mt-0.5">ID: {profile.profileId as string}</p>
        </div>
      </div>
    </div>
  );
}
