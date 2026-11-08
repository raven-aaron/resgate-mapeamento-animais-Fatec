'use client';
import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ModalContato.module.css';
import { ErroApi, solicitarApi } from '../../lib/frontend-api';
import CustomButton from '../CustomButton';

interface PropriedadesModal {
  exibir: boolean;
  aoFechar: () => void;
  ocorrenciaId: number;
}

export default function ModalContato({ exibir, aoFechar, ocorrenciaId }: PropriedadesModal) {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  if (!exibir) return null;

  async function iniciarConversa() {
    setErro('');
    setEnviando(true);
    try {
      const resultado = await solicitarApi<{ id: unknown }>('/api/conversas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocorrencia: ocorrenciaId }),
      });
      const idConversa = Number(resultado.id);
      if (!Number.isSafeInteger(idConversa) || idConversa < 1) {
        throw new Error('Conversa inválida.');
      }
      aoFechar();
      router.push(`/mensagens/${idConversa}`);
    } catch (error) {
      if (error instanceof ErroApi && error.status === 401) {
        router.push(`/login?retorno=${encodeURIComponent(`/ocorrencias/${ocorrenciaId}`)}`);
        return;
      }
      setErro(error instanceof Error ? error.message : 'Não foi possível iniciar a conversa.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={aoFechar}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <CustomButton type="button" size="icon" variant="red" className={styles.btnClose} aria-label="Fechar" onClick={aoFechar}>
          &times;
        </CustomButton>
        <div className={styles.body}>
          <h1 className={styles.titulo}>CONTATO DO USUÁRIO</h1>
          <p className={styles.label}>Conversa protegida</p>
          <p className={styles.valor}>Inicie uma conversa pela plataforma. Telefone e e-mail não são divulgados.</p>
          {erro && <p role="alert">{erro}</p>}
          <CustomButton type="button" variant="green" onClick={iniciarConversa} disabled={enviando}>
            {enviando ? 'Abrindo conversa...' : 'Iniciar conversa'}
          </CustomButton>
        </div>
      </div>
    </div>
  );
}