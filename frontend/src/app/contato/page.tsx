'use client';

import React, { useState } from 'react';
import styles from './contato.module.css';
import CustomButton from '../../components/CustomButton';
import AppIcon from '../../components/AppIcon';

export default function Contato() {
  const [mensagem, setMensagem] = useState('');
  const [aviso, setAviso] = useState('');

  const manipularEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (mensagem.trim() !== '') {
      const assunto = encodeURIComponent('Contato - Bem-Estar Animal');
      const corpo = encodeURIComponent(mensagem.trim());
      window.location.href = `mailto:bemestaranimal@votorantim.sp.gov.br?subject=${assunto}&body=${corpo}`;
      setAviso('Seu aplicativo de e-mail foi solicitado. A mensagem só será enviada após sua confirmação nele.');
    }
  };

  return (
    <>
      <main className={styles.main}>
        <h1 className={styles.tituloPagina}>CONTATE-NOS</h1>

        <div className={styles.contatoWrapper}>
          
          <div className={styles.cardInformacoes}>
            <div className={styles.linhaContato}>
              <AppIcon name="mail" className={`ui-icon ${styles.iconeContato}`} />
              <a className={styles.textoContato} href="mailto:bemestaranimal@votorantim.sp.gov.br">bemestaranimal@votorantim.sp.gov.br</a>
            </div>

            <div className={styles.linhaContato}>
              <AppIcon name="call" className={`ui-icon ${styles.iconeContato}`} />
              <p className={styles.textoContato}>(15) 3243-5612</p>
            </div>

            <div className={styles.linhaContato}>
              <AppIcon name="location" className={`ui-icon ${styles.iconeContato}`} />
              <p className={styles.textoContato}>Rua Ângelo Delapasi, 117 - Parque Bela Vista - Votorantim/SP</p>
            </div>

            <div className={styles.mapaContainer}>
             <iframe 
  src="https://maps.google.com/maps?q=Rua%20%C3%82ngelo%20Delapasi%2C%20117%20Parque%20Bela%20Vista%20Votorantim%20SP&t=&z=15&ie=UTF8&iwloc=&output=embed"
  loading="lazy"
  referrerPolicy="no-referrer-when-downgrade"
></iframe>
            </div>
          </div>

          <div className={styles.cardFormulario}>
            <h4 className={styles.tituloFormulario}>Formulário para Contatos</h4>
            
            <form onSubmit={manipularEnvio}>
              <label htmlFor="textareaContato" className={styles.labelCampo}>
                Mensagem
              </label>
              <textarea 
                id="textareaContato" 
                className={styles.textareaContato}
                placeholder="Digite Aqui..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                required
              ></textarea>

              <div className={styles.wrapperBtn}>
                <CustomButton type="submit" variant="green" fullWidth>Enviar Formulário</CustomButton>
              </div>
              {aviso && <p role="status">{aviso}</p>}
            </form>
          </div>

        </div>
      </main>

    </>
  );
}