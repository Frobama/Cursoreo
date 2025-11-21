export type Ramo = {  
  codigo: string;  
  asignatura: string;  
  creditos: number;  
  nivel?: number;  
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
  
/**  
 * Detecta automáticamente los prerequisitos falsos/problemáticos que causan ciclos.  
 * Itera removiendo prerequisitos hasta que no haya ciclos.  
 * Retorna la lista de prerequisitos que fueron removidos (falseprereqs).  
 */  
function detectCyclePrereqs(malla: Ramo[]): string[] {  
  const falsePrereqs = new Set<string>();  
  let iterations = 0;  
  const maxIterations = 100;  
  
  while (iterations < maxIterations) {  
    iterations++;  
      
    const graph = buildGraphWithExclusions(malla, Array.from(falsePrereqs));  
      
    if (!hasCycle(graph)) {  
      return Array.from(falsePrereqs);  
    }  
      
    const cyclePrereqs = findCycleEdges(malla, Array.from(falsePrereqs));  
      
    if (cyclePrereqs.length === 0) {  
      break;  
    }  
      
    // Agregar TODOS los prerequisitos problemáticos  
    cyclePrereqs.forEach(p => {  
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
    const prereqs = normalizePrereqs(r.prereq);  
  
    for (const p of prereqs) {  
      const rn = map.get(r.codigo);  
      if (!rn) continue;  
  
      if (excludedPrereqs.includes(p)) continue;  
  
      const pn = map.get(p);  
      if (pn) {  
        pn.deps.push(r.codigo);  
        rn.indegree++;  
      } else {  
        rn.indegree++;  
      }  
    }  
  }  
    
  return map;  
}  
  
/**  
 * Identifica los prerequisitos que están formando ciclos.  
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
  
  const cycleNodes = new Set<string>();  
  for (const [k] of graph) {  
    if (!processed.has(k)) {  
      cycleNodes.add(k);  
    }  
  }  
  
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
 */  
function detectMissingPrereqs(malla: Ramo[]): string[] {  
  const mallaCodigosSet = new Set(malla.map(r => r.codigo.trim().toUpperCase()));  
  const missingPrereqs = new Set<string>();  
  
  for (const ramo of malla) {  
    const prereqs = normalizePrereqs(ramo.prereq);  
    for (const p of prereqs) {  
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
  
export function buildGraph(malla: Ramo[], falseprereqlist: string[]): Map<string, Node> {  
  const map = new Map<string, Node>();  
  for (const r of malla) {  
    map.set(r.codigo, { ramo: r, indegree: 0, deps: [] });  
  }  
    
  for (const r of malla) {  
    const prereqs = normalizePrereqs(r.prereq);  
  
    for (const p of prereqs) {  
      const rn = map.get(r.codigo);  
      if (!rn) continue;  
  
      if (falseprereqlist.includes(p)) continue;  
  
      const pn = map.get(p);  
      if (pn) {  
        pn.deps.push(r.codigo);  
        rn.indegree++;  
      } else {  
        rn.indegree++;  
      }  
    }  
  }  
    
  return map;  
}  
  
export function hasCycle(graph: Map<string, Node>): boolean {  
  const q: string[] = [];  
  const indeg = new Map<string, number>();  
  const processed = new Set<string>();  
  
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
  
function sanitizeMalla(malla: Ramo[], falseprereq: string[]): Ramo[] {  
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
  // Detectar automáticamente prerequisitos problemáticos  
  const cyclePrereqs = detectCyclePrereqs(malla);  
  const missingPrereqs = detectMissingPrereqs(malla);  
    
  // Combinar ambas listas  
  const falseprereq = Array.from(new Set([...cyclePrereqs, ...missingPrereqs]));  
    
  const cleanMalla = sanitizeMalla(malla, falseprereq);  
  const graph = buildGraph(cleanMalla, falseprereq);  
  const errors: string[] = [];  
    
  console.log("Graph construido para planificacion:", graph);  
  console.log(`✅ Exclusiones aplicadas: ${falseprereq.length} prerequisitos excluidos (${cyclePrereqs.length} ciclos, ${missingPrereqs.length} faltantes)`);  
    
  // Esta verificación debería pasar ahora  
  if (hasCycle(graph)) {  
    console.error('❌ ERROR: Ciclo detectado después de limpieza automática');  
    errors.push('Ciclo detectado en prerequisitos (imposible planificar).');  
    return { plan: [], remaining: [], errors };  
  }  
    
  const indeg = new Map<string, number>();  
  for (const [k, v] of graph) indeg.set(k, v.indegree);  
  
  for (const done of approvedSet) {  
    if (!graph.has(done)) continue;  
    for (const dep of graph.get(done)!.deps) {  
      indeg.set(dep, (indeg.get(dep) ?? 0) - 1);  
    }  
    indeg.set(done, -Infinity);  
  }  
  
  const available = new Set<string>();  
  for (const [k, d] of indeg.entries()) {  
    if (d <= 0 && !approvedSet.has(k)) available.add(k);  
  }  
  
  const plan: PlanSemester[] = [];  
  const scheduled = new Set<string>();  
  let semester = 1;  
  
  while (available.size > 0) {  
    const candidates = Array.from(available).map(c => graph.get(c)!.ramo);  
    candidates.sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0) || a.creditos - b.creditos);  
  
    const scheduledBefore = new Set(scheduled);  
  
    let credits = 0;  
    const thisSemester: Ramo[] = [];  
  
    for (const r of candidates) {  
      if (scheduled.has(r.codigo) || approvedSet.has(r.codigo)) continue;  
  
      const prereqs = normalizePrereqs(r.prereq);  
      const unmet = prereqs.some(p => !(approvedSet.has(p) || scheduledBefore.has(p)));  
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