export type Ramo = {
  codigo: string;
  asignatura: string;
  creditos: number;
  nivel?: number;
  // prereq puede ser cadena separada por comas o arreglo
  prereq?: string | string[];
};

export type PlanSemester = {
  semester: number;
  courses: Ramo[];
  totalCredits: number;
};

type Node = {
  ramo: Ramo;
  indegree: number;
  deps: string[];
};

function normalizePrereqs(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(s => String(s).trim().toUpperCase()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  return [];
}

<<<<<<< Updated upstream
export function buildGraph(malla: Ramo[]) {
=======
/**
 * Detecta automáticamente los prerequisitos falsos/problemáticos que causan ciclos.
 * Itera removiendo prerequisitos hasta que no haya ciclos.
 * Retorna la lista de prerequisitos que fueron removidos (falseprereqs).
 */
function detectCyclePrereqs(malla: Ramo[]): string[] {
  const falsePrereqs = new Set<string>();
  let currentMalla = malla;
  let iterations = 0;
  const maxIterations = 100; // Evitar bucle infinito

  while (iterations < maxIterations) {
    iterations++;
    
    // Construir grafo sin falseprereqs conocidos
    const graph = buildGraphWithExclusions(currentMalla, Array.from(falsePrereqs));
    
    // Verificar si hay ciclos
    if (!hasCycle(graph)) {
      
      return Array.from(falsePrereqs);
    }
    
    // Encontrar qué prerequisitos están causando ciclos
    const cyclePrereqs = findCycleEdges(currentMalla, Array.from(falsePrereqs));
    
    if (cyclePrereqs.length === 0) {
      // No se encontraron más prerequisitos que remover
      break;
    }
    
    // Agregar los primeros prerequisitos problemáticos a la lista de exclusión
    cyclePrereqs.slice(0, Math.max(1, Math.ceil(cyclePrereqs.length / 3))).forEach(p => {
      falsePrereqs.add(p);
    });
    
    console.log(`🔄 Iteración ${iterations}: Excluyendo ${cyclePrereqs.length} prerequisitos problemáticos`);
  }

  
  return Array.from(falsePrereqs);
}

/**
 * Construye un grafo excluyendo los prerequisitos en la lista de exclusión.
 */
function buildGraphWithExclusions(malla: Ramo[], excludedPrereqs: string[]): Map<string, Node> {
  const map = new Map<string, Node>();
  for (const r of malla) {
    map.set(r.codigo, { ramo: r, indegree: 0, deps: [] });
  }
  
  for (const r of malla) {
    const raw = r.prereq;
    let prereqs: string[] = [];
    
    if (Array.isArray(raw)) {
      prereqs = raw.map(s => String(s).trim().toUpperCase()).filter(Boolean);
    } else if (typeof raw === 'string') {
      prereqs = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }

    for (const p of prereqs) {
      const rn = map.get(r.codigo);
      if (!rn) continue;

      // Ignorar si está en la lista de exclusión
      if (excludedPrereqs.includes(p)) continue;

      const pn = map.get(p);
      if (pn) {
        pn.deps.push(r.codigo);
        rn.indegree++;
      } else {
        // Prerequisito no encontrado en la malla
        rn.indegree++;
      }
    }
    
  }
  
  return map;
}

/**
 * Identifica los prerequisitos que están formando ciclos.
 * Usa Kahn's para identificar nodos en ciclos y luego sus aristas.
 */
function findCycleEdges(malla: Ramo[], excludedPrereqs: string[]): string[] {
  const graph = buildGraphWithExclusions(malla, excludedPrereqs);
  const indeg = new Map<string, number>();
  const processed = new Set<string>();
  const q: string[] = [];

  for (const [k, v] of graph) {
    indeg.set(k, v.indegree);
    if (v.indegree === 0) q.push(k);
  }

  while (q.length) {
    const cur = q.shift()!;
    processed.add(cur);
    
    for (const nxt of graph.get(cur)!.deps) {
      const newIndeg = (indeg.get(nxt) ?? 0) - 1;
      indeg.set(nxt, newIndeg);
      
      if (newIndeg === 0) {
        q.push(nxt);
      }
    }
  }

  // Nodos que quedaron sin procesar están en ciclos
  const cycleNodes = new Set<string>();
  for (const [k] of graph) {
    if (!processed.has(k)) {
      cycleNodes.add(k);
    }
  }

  // Encontrar los prerequisitos (aristas) de los nodos en ciclos
  const cyclePrereqs = new Set<string>();
  for (const node of cycleNodes) {
    const ramo = graph.get(node)?.ramo;
    if (ramo) {
      const prereqs = normalizePrereqs(ramo.prereq);
      for (const p of prereqs) {
        if (cycleNodes.has(p)) {
          cyclePrereqs.add(p);
        }
      }
    }
  }

  return Array.from(cyclePrereqs);
}

/**
 * Detecta automáticamente los prerequisitos que no existen en la malla.
 * Retorna la lista de prerequisitos faltantes que deben ser excluidos.
 */
function detectMissingPrereqs(malla: Ramo[]): string[] {
  const mallaCodigosSet = new Set(malla.map(r => r.codigo.trim().toUpperCase()));
  const missingPrereqs = new Set<string>();

  for (const ramo of malla) {
    const prereqs = normalizePrereqs(ramo.prereq);
    for (const p of prereqs) {
      // Si el prerequisito no está en la malla, agregarlo a la lista de exclusión
      if (!mallaCodigosSet.has(p)) {
        missingPrereqs.add(p);
      }
    }
  }

  if (missingPrereqs.size > 0) {
    console.log(`⚠️ Detectados ${missingPrereqs.size} prerequisitos no encontrados en malla:`, Array.from(missingPrereqs));
  }

  return Array.from(missingPrereqs);
}

export function buildGraph(malla: Ramo[], falseprereqlist: String[]) {
  console.log("Building graph with falseprereqs:", falseprereqlist);
>>>>>>> Stashed changes
  const map = new Map<string, Node>();
  for (const r of malla) {
    map.set(r.codigo, { ramo: r, indegree: 0, deps: [] });
    
  }
  const falseprereq: string[] = ["DDOC-01184", "EAIN-01184", "UNFG-01183", "UNFG-01184", "UNFI-01001", 
      "UNFI-01184", "DDOC-00102", "DCTE-00002", "UNFG-02294", "DATE-00015", "DCCB-00261", "DCTE-00002", 
      "SSED-00202", "UNFV-00001", "UNFV-01001", "UNFG-03294", "UNFV-03003", "ECIN-00805", "ECIN-08616",
      "ECIN-00512", "ECIN-00618", "DAIS-00305", "ECIN-00301", "ECIN-00606", "ECIN-00700", "ECIN-00703",
      "ECIN-00800", "ECIN-00803", "ECIN-00804", "ECIN-00806", "ECIN-00808", "ECIN-00809", "ECIN-00901",
      "ECIN-00903", "ECIN-00905", "ECIN-00907", "ECIN-00910", "ECIN-08606"];
    
  
  for (const r of malla) {
    const raw = r.prereq;
    
    let prereqs: string[] = [];
    if (Array.isArray(raw)) {
      prereqs = raw.map(s => String(s).trim().toUpperCase()).filter(Boolean);
    } else if (typeof raw === 'string') {
      prereqs = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }

    for (const p of prereqs) {
      
      const rn = map.get(r.codigo);
      if (!rn) continue;

      // Si el prerequisito está en la lista de excepciones, lo ignoramos completamente
      if (falseprereq.includes(p)) {
        
        // Ignorar prerequisito falso
        continue;
      }

      const pn = map.get(p);
      if (pn) {
        pn.deps.push(r.codigo);
        rn.indegree++;
      } else {
        // prereq no encontrado: lo contamos para detectar error luego
        rn.indegree++;
      }
    }
  }
  
  return map;
}

export function hasCycle(graph: Map<string, Node>) {
  const q: string[] = [];
  const indeg = new Map<string, number>();
  // Track processed nodes to identify cycle members
  const processed = new Set<string>();

  // Initialize indegrees and queue
  for (const [k, v] of graph) {
    indeg.set(k, v.indegree);
    if (v.indegree === 0) q.push(k);
    
  }

  let removed = 0;
  while (q.length) {
    const cur = q.shift()!;
    processed.add(cur);
    removed++;
    
    
    for (const nxt of graph.get(cur)!.deps) {
      const newIndeg = (indeg.get(nxt) ?? 0) - 1;
      indeg.set(nxt, newIndeg);
      
      if (newIndeg === 0) {
        q.push(nxt);
        
      }
    }
  }

  

  return removed !== graph.size;
}

function sanitizeMalla(malla: Ramo[]): Ramo[] {
  const falseprereq: string[] = ["DDOC-01184", "EAIN-01184", "UNFG-01183", "UNFG-01184", "UNFI-01001", 
  "UNFI-01184", "DDOC-00102", "DCTE-00002", "UNFG-02294", "DATE-00015", "DCCB-00261", "DCTE-00002", 
  "SSED-00202", "UNFV-00001", "UNFV-01001", "UNFG-03294", "UNFV-03003", "ECIN-00805", "ECIN-08616",
  "ECIN-00512", "ECIN-00618", "DAIS-00305", "ECIN-00301", "ECIN-00606", "ECIN-00700", "ECIN-00703",
  "ECIN-00800", "ECIN-00803", "ECIN-00804", "ECIN-00806", "ECIN-00808", "ECIN-00809", "ECIN-00901",
  "ECIN-00903", "ECIN-00905", "ECIN-00907", "ECIN-00910", "ECIN-08606"];

  return malla.map(r => {
    const prereqs = normalizePrereqs(r.prereq);
    const filtered = prereqs.filter(p => !falseprereq.includes(p));
    
    return {
      ...r,
      prereq: filtered.length > 0 ? filtered : undefined
    };
  });
}

export function planSemesters(
  malla: Ramo[],
  _inscriptedSet: Set<string>,
  approvedSet: Set<string>,
  maxCreditsPerSemester = 35
): { plan: PlanSemester[]; remaining: string[]; errors: string[] } {
<<<<<<< Updated upstream
  const cleanMalla = sanitizeMalla(malla);
  const graph = buildGraph(cleanMalla);
=======
  // Detectar automáticamente los prerequisitos que causan ciclos Y los que no están en la malla
  const cyclePrereqs = detectCyclePrereqs(malla);
  const missingPrereqs = detectMissingPrereqs(malla);
  
  // Combinar ambas listas en una sola lista de exclusión
  const falseprereq = Array.from(new Set([...cyclePrereqs, ...missingPrereqs]));
  
  const cleanMalla = sanitizeMalla(malla, falseprereq);
  const graph = buildGraph(cleanMalla, falseprereq);
>>>>>>> Stashed changes
  const errors: string[] = [];
  
  console.log("Graph construido para planificacion:", graph);
  console.log(`✅ Exclusiones aplicadas: ${falseprereq.length} prerequisitos excluidos (${cyclePrereqs.length} ciclos, ${missingPrereqs.length} faltantes)`);
  
  // Verificar que no hay ciclos después de limpiar
  if (hasCycle(graph)) {
    errors.push('Ciclo detectado en prerequisitos (imposible planificar).');
    return { plan: [], remaining: [], errors };
  }
  
  const indeg = new Map<string, number>();
  for (const [k, v] of graph) indeg.set(k, v.indegree);

  for (const done of approvedSet) {
    
    if (!graph.has(done)) continue; //ignorar un ramo aprobado que no esta en la malla
    for (const dep of graph.get(done)!.deps) {
      
      indeg.set(dep, (indeg.get(dep) ?? 0) - 1);
    }
    
    indeg.set(done, -Infinity);
  }

  const available = new Set<string>();
  for (const [k, d] of indeg.entries()) {
    if (d <= 0 && !approvedSet.has(k) ) available.add(k);
  }

  const plan: PlanSemester[] = [];
  const scheduled = new Set<string>();
  let semester = 1;

  while (available.size > 0) {
    const candidates = Array.from(available).map(c => graph.get(c)!.ramo);
    candidates.sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0) || a.creditos - b.creditos);

    // Snapshot de lo que ya estaba programado antes de este semestre
    const scheduledBefore = new Set(scheduled);

    let credits = 0;
    const thisSemester: Ramo[] = [];

    for (const r of candidates) {
      if (scheduled.has(r.codigo) || approvedSet.has(r.codigo) ) continue;

      // Verificar que todos los prerequisitos estén satisfechos ANTES de este semestre
      const prereqs = normalizePrereqs(r.prereq);
      
      
      const unmet = prereqs.some(p => !(approvedSet.has(p) || scheduledBefore.has(p) ));
      if (unmet) continue;

      if (credits + r.creditos > maxCreditsPerSemester) continue;
      thisSemester.push(r);
      scheduled.add(r.codigo);
      credits += r.creditos;
    }

    if (thisSemester.length === 0) {
      errors.push(`No se pueden asignar cursos en semestre ${semester} (revisa maxCredits o cursos con créditos muy altos)`);
      break;
    }

    plan.push({ semester, courses: thisSemester, totalCredits: credits });

    for (const r of thisSemester) {
      available.delete(r.codigo);
      for (const dep of graph.get(r.codigo)!.deps) {
        indeg.set(dep, (indeg.get(dep) ?? 0) - 1);
        if ((indeg.get(dep) ?? 0) <= 0 && !approvedSet.has(dep) && !scheduled.has(dep)) {
          available.add(dep);
        }
      }
    }

    semester++;
  }

  
  const remaining: string[] = [];
  for (const [k] of graph) {
    if (!approvedSet.has(k) && !scheduled.has(k)) remaining.push(k);
  }

  return { plan, remaining, errors };
}
