import { useLocalSearchParams } from "expo-router";
import { AdminWotwEditor } from "@/components/admin-wotw-form";
export default function EditWotw() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminWotwEditor templateId={id} />;
}
