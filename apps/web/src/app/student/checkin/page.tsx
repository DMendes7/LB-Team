import { redirect } from "next/navigation";

/** Check-in passou a ser só após concluir o treino; mantém URL antiga. */
export default function CheckinRedirectPage() {
  redirect("/student/workout");
}
