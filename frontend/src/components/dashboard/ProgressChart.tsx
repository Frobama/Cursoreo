import { useMemo } from 'react';
import type { RamoAvanceCompleto } from '../../types';
import styles from './ProgressChart.module.css';

interface ProgressChartProps {
  ramosAprobados: RamoAvanceCompleto[];
  ramosInscritos: RamoAvanceCompleto[];
  totalCreditos: number;
  creditosAprobados: number;
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  ramosAprobados,
  ramosInscritos,
  totalCreditos,
  creditosAprobados
}) => {
  // Calcular porcentajes
  const porcentajeAprobado = useMemo(() => {
    return totalCreditos > 0 ? (creditosAprobados / totalCreditos) * 100 : 0;
  }, [creditosAprobados, totalCreditos]);

  const creditosInscritos = useMemo(() => {
    return ramosInscritos.reduce((sum, ramo) => sum + (ramo.creditos || 0), 0);
  }, [ramosInscritos]);

  const porcentajeInscrito = useMemo(() => {
    return totalCreditos > 0 ? (creditosInscritos / totalCreditos) * 100 : 0;
  }, [creditosInscritos, totalCreditos]);

  const creditosPendientes = totalCreditos - creditosAprobados - creditosInscritos;
  const porcentajePendiente = 100 - porcentajeAprobado - porcentajeInscrito;

  // Agrupar ramos aprobados por período
  const ramosPorPeriodo = useMemo(() => {
    const grupos: Record<string, RamoAvanceCompleto[]> = {};
    
    ramosAprobados.forEach(ramo => {
      const periodo = ramo.period || 'Sin período';
      if (!grupos[periodo]) {
        grupos[periodo] = [];
      }
      grupos[periodo].push(ramo);
    });

    return grupos;
  }, [ramosAprobados]);

  // Ordenar períodos cronológicamente
  const periodosOrdenados = useMemo(() => {
    return Object.keys(ramosPorPeriodo).sort((a, b) => {
      if (a === 'Sin período') return 1;
      if (b === 'Sin período') return -1;
      return a.localeCompare(b);
    });
  }, [ramosPorPeriodo]);

  // Calcular créditos acumulados por período
  const creditosPorPeriodo = useMemo(() => {
    let acumulado = 0;
    return periodosOrdenados.map(periodo => {
      const creditosPeriodo = ramosPorPeriodo[periodo].reduce(
        (sum, ramo) => sum + (ramo.creditos || 0),
        0
      );
      acumulado += creditosPeriodo;
      return {
        periodo,
        creditos: creditosPeriodo,
        acumulado,
        porcentaje: (acumulado / totalCreditos) * 100
      };
    });
  }, [periodosOrdenados, ramosPorPeriodo, totalCreditos]);

  return (
    <div className={styles.progressChart}>
      <h2 className={styles.title}>Progreso Curricular</h2>

      {/* Barra de progreso principal */}
      <div className={styles.mainProgress}>
        <div className={styles.progressLabels}>
          <span>0%</span>
          <span className={styles.currentProgress}>
            {porcentajeAprobado.toFixed(1)}% completado
          </span>
          <span>100%</span>
        </div>

        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${styles.aprobado}`}
            style={{ width: `${porcentajeAprobado}%` }}
            title={`${creditosAprobados} créditos aprobados`}
          ></div>
          <div
            className={`${styles.progressFill} ${styles.inscrito}`}
            style={{ width: `${porcentajeInscrito}%` }}
            title={`${creditosInscritos} créditos inscritos`}
          ></div>
          <div
            className={`${styles.progressFill} ${styles.pendiente}`}
            style={{ width: `${porcentajePendiente}%` }}
            title={`${creditosPendientes} créditos pendientes`}
          ></div>
        </div>

        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.aprobado}`}></div>
            <span>Aprobado: {creditosAprobados} cr ({porcentajeAprobado.toFixed(1)}%)</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.inscrito}`}></div>
            <span>Inscrito: {creditosInscritos} cr ({porcentajeInscrito.toFixed(1)}%)</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.pendiente}`}></div>
            <span>Pendiente: {creditosPendientes} cr ({porcentajePendiente.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Gráfico de progreso por período */}
      {creditosPorPeriodo.length > 0 && (
        <div className={styles.periodProgress}>
          <h3 className={styles.subtitle}>Progreso por Período</h3>
          
          <div className={styles.periodChart}>
            {creditosPorPeriodo.map((item, index) => (
              <div key={item.periodo} className={styles.periodItem}>
                <div className={styles.periodHeader}>
                  <span className={styles.periodLabel}>{item.periodo}</span>
                  <span className={styles.periodCredits}>{item.creditos} cr</span>
                </div>
                
                <div className={styles.periodBar}>
                  <div
                    className={styles.periodFill}
                    style={{ 
                      width: `${(item.creditos / totalCreditos) * 100}%`,
                      animationDelay: `${index * 0.1}s`
                    }}
                  ></div>
                </div>

                <div className={styles.periodStats}>
                  <span className={styles.periodAcum}>
                    Acumulado: {item.acumulado} cr
                  </span>
                  <span className={styles.periodPercent}>
                    {item.porcentaje.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas adicionales */}
      <div className={styles.stats}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{ramosAprobados.length}</div>
          <div className={styles.statLabel}>Ramos Aprobados</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>{ramosInscritos.length}</div>
          <div className={styles.statLabel}>Ramos Inscritos</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>
            {Math.ceil(creditosPendientes / 30)}
          </div>
          <div className={styles.statLabel}>Semestres Restantes (aprox)</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>
            {creditosAprobados > 0 
              ? (creditosAprobados / ramosAprobados.length).toFixed(1)
              : '0'
            }
          </div>
          <div className={styles.statLabel}>Créditos promedio/ramo</div>
        </div>
      </div>
    </div>
  );
};

export default ProgressChart;