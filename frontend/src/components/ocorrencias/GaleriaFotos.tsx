"use client";
import Image from "next/image";
import { useState } from "react";
import styles from "./CartazPet.module.css";
import CustomButton from "../CustomButton";

export default function GaleriaFotos({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [indice,setIndice]=useState(0);
  if(!fotos.length)return <div className={styles.semFoto} role="img" aria-label="Animal sem fotografia cadastrada">🐾</div>;
  const img=fotos[indice] || fotos[0];
  return <div className={styles.galeria}>
    <Image unoptimized src={img} width={740} height={470} alt={"Foto "+(indice+1)+" de "+fotos.length+" de "+nome} />
    {fotos.length>1&&<div className={styles.controles}>
      <CustomButton type="button" size="icon" variant="gray" aria-label="Foto anterior" onClick={()=>setIndice(v=>(v-1+fotos.length)%fotos.length)}>←</CustomButton>
      <span>{indice+1} / {fotos.length}</span>
      <CustomButton type="button" size="icon" variant="gray" aria-label="Próxima foto" onClick={()=>setIndice(v=>(v+1)%fotos.length)}>→</CustomButton>
    </div>}
  </div>;
}
