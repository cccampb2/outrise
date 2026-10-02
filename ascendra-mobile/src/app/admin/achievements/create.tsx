import { AppText as Text } from "@/components/app-text";

import { useSelector } from "react-redux";
import { Screen } from "@/components/screen";
import { AdminAchievementForm } from "@/components/admin-achievement-form";
import { adminAchievementStyles } from "@/components/admin-achievement-ui";

export default function CreateAchievementScreen() {
  const isAdmin = useSelector((state: { auth: { user: { role: string } | null } }) => state.auth.user?.role === "admin");
  return isAdmin ? <AdminAchievementForm /> : <Screen><Text style={adminAchievementStyles.error}>Admin access required.</Text></Screen>;
}
