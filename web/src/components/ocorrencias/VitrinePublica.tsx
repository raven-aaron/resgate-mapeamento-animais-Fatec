"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Ocorrencia } from "../../lib/tipos";
import styles from "./VitrinePublica.module.css";

function dataPublicacao(valor:string){
  const formato=String(valor).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(formato))return "Data não informada";
  return formato.split("-").reverse().join("/");
}

export default function VitrinePublica(){
  const [ocorrencias,setOcorrencias]=useState<Ocorrencia[]>([]);
  const [carregando,setCarregando]=useState(true);
  const [erro,setErro]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    async function consultar(){
      try{
        const resposta=await fetch("/api/ocorrencias",{cache:"no-store",signal:controller.signal});
        const dados=await resposta.json() as {ocorrencias?:Ocorrencia[];erro?:string};
        if(!resposta.ok)throw new Error(dados.erro||"Falha ao consultar os animais.");
        if(!controller.signal.aborted)setOcorrencias((dados.ocorrencias||[]).slice(0,4));
      }catch(error){
        if(!controller.signal.aborted)setErro(error instanceof Error?error.message:"Falha ao consultar ocorrências.");
      }finally{if(!controller.signal.aborted)setCarregando(false);}
    }
    void consultar();
    return ()=>controller.abort();
  },[]);

  return <section className={styles.fundo} aria-labelledby="titulo-vitrine">
    <div className={styles.container}>
      <div className={styles.topo}>
        <div>
          <span className={styles.sobretitulo}>Módulo de Resgate</span>
          <h2 id="titulo-vitrine">Animais perdidos e encontrados</h2>
          <p>Confira os animais cadastrados e aprovados pela comunidade de Votorantim.</p>
        </div>
        <Link href="/ocorrencias/nova?tipo=PERDIDO" className={styles.cadastrar}>
          <span aria-hidden="true">＋</span>Cadastrar ocorrência
        </Link>
      </div>
      {carregando&&<p className={styles.estado} role="status">Carregando animais cadastrados…</p>}
      {erro&&<p className={styles.estado} role="alert">Não foi possível carregar os animais agora. <Link href="/mapa">Consultar mapa</Link></p>}
      {!carregando&&!erro&&ocorrencias.length===0&&<div className={styles.vazio}>
        Ainda não há ocorrências aprovadas para exibir. Você pode consultar o mapa ou registrar uma ocorrência.
      </div>}
      {ocorrencias.length>0&&<div className={styles.grade}>
        {ocorrencias.map(o=><Link href={"/ocorrencias/"+o.id} className={styles.item} key={o.id}
          aria-label={(o.tipo==="PERDIDO"?"Animal perdido: ":"Animal encontrado: ")+(o.nome||o.especie)+", "+o.bairro}>
          {o.foto?<Image src={o.foto} unoptimized width={108} height={112} className={styles.foto}
            alt={"Foto de "+(o.nome||"animal")+" ("+o.especie+")"}/>:<span className={styles.semFoto} aria-hidden="true">🐾</span>}
          <span className={styles.conteudo}>
            <span className={o.tipo==="PERDIDO"?styles.perdido:styles.encontrado}>
              {o.tipo==="PERDIDO"?"Perdido":"Encontrado"}</span>
            <strong>{o.nome||o.especie}</strong>
            <small>{o.bairro} · Votorantim/SP</small>
            <small>{dataPublicacao(o.data)}</small>
          </span>
          <span className={styles.seta} aria-hidden="true">›</span>
        </Link>)}
      </div>}
      <div className={styles.rodape}>
        <Link href="/mapa">Ver todos os animais e mapa interativo</Link>
        <span>Consulta pública: não é necessário entrar na conta para visualizar os pets.</span>
      </div>
    </div>
  </section>;
}
