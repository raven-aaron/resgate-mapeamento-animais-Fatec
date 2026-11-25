import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "../../../components/auth/LoginForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="form-shell"><p>Carregando acesso...</p></main>}>
      <LoginForm admin />
    </Suspense>
  );
}
