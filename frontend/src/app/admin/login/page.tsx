import { Suspense } from "react";
import LoginForm from "../../../components/auth/LoginForm";
export default function AdminLoginPage(){return <Suspense fallback={<main className="form-shell"><p>Carregando acesso...</p></main>}><LoginForm admin/></Suspense>;}
