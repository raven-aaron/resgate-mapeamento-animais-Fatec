import { redirect } from "next/navigation";
import { listarUsuariosAdmin } from "../../../models/usuarios";
import { administradorAtual } from "../../../lib/auth";
import AdminShell from "../../../components/admin/AdminShell";
import ControleUsuario from "../../../components/admin/ControleUsuario";
import CustomButton from "../../../components/CustomButton";

export const dynamic="force-dynamic";
const POR_PAGINA=10;
export default async function UsuariosAdmin({searchParams}:{
  searchParams:Promise<{busca?:string;situacao?:string;pagina?:string}>;
}){
  const usuario=await administradorAtual();
  if(!usuario?.adminResgate)redirect("/admin/login");
  const params=await searchParams;
  const busca=(params.busca||"").trim().slice(0,60);
  const status=["ATIVO","SUSPENSO","DESATIVADO"].includes(params.situacao||"")?params.situacao||"":"";
  const paginaSolicitada=/^[1-9]\d*$/.test(params.pagina||"")?Number(params.pagina):1;
  const { rows, total, totalPaginas, pagina } = await listarUsuariosAdmin(busca, status, paginaSolicitada, POR_PAGINA);
  return <AdminShell nome={usuario.nome} titulo="CONTAS CADASTRADAS">
    <form className="filtros-usuarios-admin" method="GET">
      <label className="form-field">Nome ou e-mail<input name="busca" type="search" defaultValue={busca} maxLength={60}/></label>
      <label className="form-field">Situação da conta<select name="situacao" defaultValue={status||""}>
        <option value="">Todas</option><option value="ATIVO">Ativa</option>
        <option value="SUSPENSO">Suspensa</option><option value="DESATIVADO">Desativada</option>
      </select></label>
      <CustomButton type="submit" size="small">BUSCAR</CustomButton>
      <CustomButton href="/admin/usuarios" size="small" variant="gray">LIMPAR</CustomButton>
    </form>
    <p>
      <strong>{total}</strong> conta(s) nesta consulta.
      {total>0&&<> Exibindo {(pagina-1)*POR_PAGINA+1}–{Math.min(pagina*POR_PAGINA,total)}.</>}
      {" "}Permissões editáveis somente no módulo Resgate.
    </p>
    <div className="tabela-usuarios-wrap">
      <table className="tabela-usuarios">
        <thead><tr><th>Conta</th><th>Situação</th><th>Papel no resgate</th><th>Ocorrências</th><th>Cadastro</th><th>Gerenciar</th></tr></thead>
        <tbody>{rows.map(u=><tr key={u.id}>
          <td><strong>{u.nome}</strong><small>{u.email}</small></td>
          <td>{u.situacao==="ATIVO"?"Ativa":u.situacao==="SUSPENSO"?"Suspensa":"Desativada"}</td>
          <td>{u.admin_resgate?"Administrador":"Cidadão"}</td>
          <td>{u.ocorrencias}</td>
          <td>{String(u.criada).replace("T"," ").slice(0,10).split("-").reverse().join("/")}</td>
          <td><ControleUsuario key={u.id+"-"+u.situacao+"-"+u.admin_resgate}
            id={u.id} email={u.email} situacao={u.situacao}
            adminResgate={Boolean(u.admin_resgate)} proprio={u.id===usuario.id}/></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!rows.length&&<p className="note">Nenhuma conta corresponde aos filtros.</p>}
    {totalPaginas>1&&<nav className="paginacao-usuarios-admin" aria-label="Paginação de contas">
      <a aria-label="Página anterior" aria-disabled={pagina<=1}
        tabIndex={pagina<=1?-1:undefined}
        className={pagina<=1?"desabilitada":""}
        href={`/admin/usuarios?busca=${encodeURIComponent(busca)}&situacao=${encodeURIComponent(status)}&pagina=${Math.max(1,pagina-1)}`}>←</a>
      {Array.from({length:Math.min(5,totalPaginas)},(_,indice)=>
        Math.max(1,Math.min(pagina-2,totalPaginas-4))+indice
      ).map(numero=><a key={numero} aria-label={`Página ${numero}`}
        aria-current={numero===pagina?"page":undefined}
        className={numero===pagina?"atual":""}
        href={`/admin/usuarios?busca=${encodeURIComponent(busca)}&situacao=${encodeURIComponent(status)}&pagina=${numero}`}>{numero}</a>)}
      <a aria-label="Próxima página" aria-disabled={pagina>=totalPaginas}
        tabIndex={pagina>=totalPaginas?-1:undefined}
        className={pagina>=totalPaginas?"desabilitada":""}
        href={`/admin/usuarios?busca=${encodeURIComponent(busca)}&situacao=${encodeURIComponent(status)}&pagina=${Math.min(totalPaginas,pagina+1)}`}>→</a>
    </nav>}
  </AdminShell>;
}
