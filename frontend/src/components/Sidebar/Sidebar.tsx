'use client';

import Link from 'next/link';
import AppIcon from '../AppIcon';
import CustomButton from '../CustomButton';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
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
            <li className={styles.itemMenu}>
              <Link href="/" className={styles.linkMenu} onClick={onClose}>Página Inicial</Link>
            </li>
            <li className={styles.itemMenu}>
              <Link href="/registro-pet-perdido" className={styles.linkMenu} onClick={onClose}>Perdi meu Pet</Link>
            </li>
            <li className={styles.itemMenu}>
              <Link href="/registro-pet-encontrado" className={styles.linkMenu} onClick={onClose}>Encontrei um Pet</Link>
            </li>
            <li className={styles.itemMenu}>
              <Link href="/mapa" className={styles.linkMenu} onClick={onClose}>Mapa</Link>
            </li>
            <li className={styles.itemMenu}>
              <Link href="/admin" className={styles.linkMenu} onClick={onClose}>Painel administrativo</Link>
            </li>
            <li className={styles.itemMenu}>
              <Link href="/minha-conta" className={styles.linkMenu} onClick={onClose}>Meu perfil</Link>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}