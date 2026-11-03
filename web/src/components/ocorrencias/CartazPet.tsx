import Link from "next/link";
import type { Ocorrencia } from "../../lib/tipos";
import GaleriaFotos from "./GaleriaFotos";
import ContatoUsuario from "./ContatoUsuario";
import styles from "./CartazPet.module.css";

function exibir(valor: string | null | undefined) {
  return valor && valor.trim() ? valor : "Não informado";
}
function rotulo(valor: string | null | undefined) {
  if (!valor || valor === "INDETERMINADO") return "Não informado";
  return valor.charAt(0).toUpperCase() + valor.slice(1).toLowerCase();
}
function dataPt(valor: string) {
  return String(valor).slice(0,10).split("-").reverse().join("/");
}
function Campo({ titulo, valor }: { titulo: string; valor: string }) {
  return <div className={styles.campo}><dt>{titulo}</dt><dd>{valor}</dd></div>;
}

export default function CartazPet({ o, fotos, administrativo=false }: { o: Ocorrencia; fotos: string[]; administrativo?: boolean }) {
  const perdido=o.tipo==="PERDIDO";
  return <div className={styles.cartaz}>
    {administrativo && <div className={styles.avisoAdm} role="status">
      <strong>PRÉ-VISUALIZAÇÃO ADMINISTRATIVA</strong> · Situação: {o.status_aprovacao} / {o.status_caso}.
      Este é o cartaz que será exibido à população após a aprovação.
    </div>}
    <section className={styles.hero}>
      <div className={styles.introducao}>
        <span className={styles.selo}>{perdido?"PROCURA-SE":"ENCONTRADO"}</span>
        <h1>{o.nome || (perdido ? "Animal perdido" : "Animal encontrado")}</h1>
        <p>{perdido?"Animal desaparecido":"Animal encontrado"} em Votorantim/SP</p>
        <p><strong>Sexo:</strong> {rotulo(o.sexo)}</p>
        <p className={styles.descricao}>{exibir(o.descricao)}</p>
        <Link className="action action-primary" href="/mapa">VER NO MAPA</Link>
      </div>
      <GaleriaFotos fotos={fotos} nome={o.nome || o.especie} />
    </section>
    <section className={styles.detalhes}>
      <div>
        <h2>INFORMAÇÕES GERAIS</h2>
        <dl>
          <Campo titulo="NOME" valor={exibir(o.nome)} />
          <Campo titulo="ESPÉCIE" valor={o.especie} />
          <Campo titulo="RAÇA" valor={exibir(o.raca)} />
          <Campo titulo="PORTE" valor={rotulo(o.porte)} />
          <Campo titulo="SEXO" valor={rotulo(o.sexo)} />
          <Campo titulo="IDADE APROXIMADA" valor={exibir(o.idade)} />
          <Campo titulo="COR/PELAGEM" valor={exibir(o.cores)} />
          <Campo titulo="MICROCHIP" valor={o.microchip === 1 ? "Sim" : o.microchip === 0 ? "Não" : "Não informado"} />
        </dl>
      </div>
      <div>
        <h2>LOCAL E DATA</h2>
        <dl>
          <Campo titulo={perdido?"DATA DO DESAPARECIMENTO":"DATA EM QUE FOI ENCONTRADO"} valor={dataPt(o.data)} />
          <Campo titulo={perdido?"ÚLTIMO LOCAL ONDE FOI VISTO":"LOCAL EM QUE FOI ENCONTRADO"} valor={(o.referencia ? o.referencia+" · " : "") + o.bairro + ", Votorantim/SP"} />
        </dl>
        <h2>{perdido?"CONTATO DO TUTOR":"CONTATO DO RESPONSÁVEL"}</h2>
        <dl><Campo titulo="NOME" valor={exibir(o.autor)} /></dl>
        {!administrativo && <ContatoUsuario ocorrencia={o.id} />}
        {administrativo && <p className={styles.nota}>A opção de contato ficará disponível após a aprovação; somente usuários autenticados poderão conversar.</p>}
        <p className={styles.nota}>Telefone e e-mail ficam protegidos na conta e não são divulgados no cartaz. A posição pública do mapa é aproximada.</p>
      </div>
    </section>
    <div className={styles.voltar}>
      <Link href={administrativo?"/admin/solicitacoes":"/mapa"}>← {administrativo?"Voltar às solicitações":"Voltar aos animais"}</Link>
    </div>
  </div>;
}
