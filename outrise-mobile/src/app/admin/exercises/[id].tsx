import { useLocalSearchParams } from "expo-router";
import { AdminExerciseEditor } from "@/components/admin-exercise-form";
export default function EditExercise() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminExerciseEditor exerciseId={id} />;
}
