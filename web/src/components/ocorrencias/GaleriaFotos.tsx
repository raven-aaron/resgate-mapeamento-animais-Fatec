"use client";
import Image from "next/image";
import { useState } from "react";
import styles from "./CartazPet.module.css";

export default function GaleriaFotos({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [indice,setIndice]=useState(0);
  if(!fotos.length)return <div className={styles.semFoto} role="img" aria-label="Animal sem fotografia cadastrada">🐾</div>;
  const img=fotos[indice] || fotos[0];
  return <div className={styles.galeria}>
    <Image unoptimized src={img} width={740} height={470} alt={"Foto "+(indice+1)+" de "+fotos.length+" de "+nome} />
    {fotos.length>1&&<div className={styles.controles}>
      <button type="button" aria-label="Foto anterior" onClick={()=>setIndice(v=>(v-1+fotos.length)%fotos.length)}>←</button>
      <span>{indice+1} / {fotos.length}</span>
      <button type="button" aria-label="Próxima foto" onClick={()=>setIndice(v=>(v+1)%fotos.length)}>→</button>
    </div>}
  </div>;
}
