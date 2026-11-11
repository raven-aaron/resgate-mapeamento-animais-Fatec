import styles from '../app/mapa/mapa.module.css';
import CustomButton from './CustomButton';

interface FiltroMapaProps {
  onFechar: () => void;
  especie: string;
  status: string;
  onAlterarEspecie: (valor: string) => void;
  onAlterarStatus: (valor: string) => void;
}

export function FiltroMapa({
  onFechar,
  especie,
  status,
  onAlterarEspecie,
  onAlterarStatus,
}: FiltroMapaProps) {
  return (
    <div className={styles['modal-filtro']}>
      <div className={styles['fechar-overlay']} onClick={onFechar}></div>
      
      <div className={styles['conteudo-modal']}>
        <h4>FILTRO DE MAPA</h4>
        
        <div style={{ marginTop: '20px' }}>
          <p className={styles['texto-card-mapa']} style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            ESPÉCIE
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="radio" name="especie" value="" checked={!especie} onChange={() => onAlterarEspecie("")} style={{ accentColor: 'var(--cor-verde-agua)' }} /> Todos
            </label>
            <label style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="radio" name="especie" value="Cachorro" checked={especie === "Cachorro"} onChange={() => onAlterarEspecie("Cachorro")} style={{ accentColor: 'var(--cor-verde-agua)' }} /> Cachorros
            </label>
            <label style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="radio" name="especie" value="Gato" checked={especie === "Gato"} onChange={() => onAlterarEspecie("Gato")} style={{ accentColor: 'var(--cor-verde-agua)' }} /> Gatos
            </label>
          </div>

          <p className={styles['texto-card-mapa']} style={{ fontWeight: 'bold', marginBottom: '10px' }}>
            STATUS
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="radio" name="status" value="" checked={!status} onChange={() => onAlterarStatus("")} style={{ accentColor: 'var(--cor-verde-agua)' }} /> Todos
            </label>
            <label style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="radio" name="status" value="PERDIDO" checked={status === "PERDIDO"} onChange={() => onAlterarStatus("PERDIDO")} style={{ accentColor: 'var(--cor-vermelho)' }} /> Perdidos
            </label>
            <label style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="radio" name="status" value="ENCONTRADO" checked={status === "ENCONTRADO"} onChange={() => onAlterarStatus("ENCONTRADO")} style={{ accentColor: 'var(--cor-verde-agua)' }} /> Encontrados
            </label>
          </div>
        </div>

        <CustomButton
          variant="green"
          fullWidth
          onClick={onFechar}
          style={{ marginTop: '30px' }}
        >
          APLICAR FILTROS
        </CustomButton>
      </div>
    </div>
  );
}
