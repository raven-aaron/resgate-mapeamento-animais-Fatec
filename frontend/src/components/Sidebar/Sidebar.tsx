'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppIcon from '../AppIcon';
import CustomButton from '../CustomButton';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [acessoAdministrativo, setAcessoAdministrativo] = useState(false);

  useEffect(() => {
    let ativo = true;
    const verificarAcesso = async () => {
      try {
        const resposta = await fetch('/api/auth/admin/me', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const dados = await resposta.json() as { usuario?: { adminResgate?: boolean } | null };
        if (ativo) setAcessoAdministrativo(resposta.ok && dados.usuario?.adminResgate === true);
      } catch (error) {
        console.error('Falha ao verificar acesso administrativo do menu.', error);
        if (ativo) setAcessoAdministrativo(false);
      }
    };
    void verificarAcesso();
    window.addEventListener('resgate-auth', verificarAcesso);
    return () => {
      ativo = false;
      window.removeEventListener('resgate-auth', verificarAcesso);
    };
  }, []);

  const itensMenu = [
    { href: '/', label: 'Página Inicial' },
    { href: '/adote', label: 'Adote' },
    { href: '/banco-de-racao', label: 'Banco de Ração' },
    { href: '/', label: 'Resgate e Mapeamento' },
    { href: '/castracao', label: 'Castração' },
    { href: '/mapa', label: 'Mapa' },
    { href: '/registro-pet-perdido', label: 'Perdi meu Pet' },
    { href: '/registro-pet-encontrado', label: 'Encontrei um Pet' },
    { href: '/entrar', label: 'Entrar' },
    { href: '/minha-conta', label: 'Meu perfil' },
  ];

  return (
    <>
      <div 
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`} 
        onClick={onClose} 
      />
      
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <header className={styles.headerMenu}>
          <div className={styles.badgeMenu}>
            <AppIcon name="pets" className="ui-icon" />
            <span>MENU</span>
          </div>
          <CustomButton type="button" size="icon" variant="red" className={styles.btnClose} aria-label="Fechar menu" onClick={onClose}>&times;</CustomButton>
        </header>

        <div className={styles.conteudo}>
          <h2 className={styles.tituloMenu}>NAVEGAÇÃO</h2>
          <ul className={styles.listaMenu}>
            {itensMenu.map((item) => (
              <li key={`${item.href}-${item.label}`} className={styles.itemMenu}>
                <Link href={item.href} className={styles.linkMenu} onClick={onClose}>{item.label}</Link>
              </li>
            ))}
            {acessoAdministrativo && <li className={styles.itemMenu}>
              <Link href="/admin" className={styles.linkMenu} onClick={onClose}>Painel administrativo</Link>
            </li>}
          </ul>
        </div>
      </aside>
    </>
  );
}