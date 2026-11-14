import { redirect } from "next/navigation";

// The proxy sends signed-out visitors to /login, so signed-in users land here.
export default function Home() {
  redirect("/dashboard");
}
