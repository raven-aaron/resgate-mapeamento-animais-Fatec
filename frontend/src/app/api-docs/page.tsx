import { redirect } from "next/navigation";

export default function ApiDocsPage() {
  redirect("/swagger/index.html");
}
