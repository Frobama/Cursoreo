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

export function buildGraph(malla: Ramo[]) {
  const map = new Map<string, Node>();
  for (const r of malla) {
    map.set(r.codigo, { ramo: r, indegree: 0, deps: [] });
    
  }

  for (const r of malla) {
    const raw = r.prereq;
    let falseprereq: string[] = ["DDOC-01184", "EAIN-01184", "UNFG-01183", "UNFG-01184", "UNFI-01001", 
      "UNFI-01184", "DDOC-00102", "DCTE-00002", "UNFG-02294", "DATE-00015", "DCCB-00261", "DCTE-00002", 
      "SSED-00202", "UNFV-00001", "UNFV-01001", "UNFG-03294", "UNFV-03003", "ECIN-00805", "ECIN-08616",
      "ECIN-00512", "ECIN-00618", "DAIS-00305", "ECIN-00301", "ECIN-00606", "ECIN-00700", "ECIN-00703",
      "ECIN-00800", "ECIN-00803", "ECIN-00804", "ECIN-00806", "ECIN-00808", "ECIN-00809", "ECIN-00901",
      "ECIN-00903", "ECIN-00905", "ECIN-00907", "ECIN-00910", "ECIN-08606"];
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

  {/*if (removed !== graph.size) {
    console.log("\n=== CICLO DETECTADO ===");
    console.log("Ramos involucrados en ciclos:");
    for (const [k, v] of graph) {
      if (!processed.has(k)) {
        const node = graph.get(k)!;
        console.log(`\nRamo: ${k} (${node.ramo.asignatura})`);
        console.log(`  Prerrequisitos:`, normalizePrereqs(node.ramo.prereq));
        console.log(`  Es prerrequisito de:`, node.deps);
        console.log(`  Indegree final:`, indeg.get(k));
      }
    }
    console.log("=====================\n");
  }*/}

  return removed !== graph.size;
}

export function planSemesters(
  malla: Ramo[],
  InscriptedSet: Set<string>,
  approvedSet: Set<string>,
  maxCreditsPerSemester = 35
): { plan: PlanSemester[]; remaining: string[]; errors: string[] } {
  const graph = buildGraph(malla);
  const errors: string[] = [];

  for (const [codigo, node] of graph.entries()) {
    const prereqs = normalizePrereqs(node.ramo.prereq);
    for (const p of prereqs) {
      
      if (!graph.has(p)) {
        errors.push(`Prereq ${p} of ${codigo} not found in malla`);
      }
    }
  }

  if (hasCycle(graph)) {
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

    let credits = 0;
    const thisSemester: Ramo[] = [];

    for (const r of candidates) {
      if (scheduled.has(r.codigo) || approvedSet.has(r.codigo)) continue;
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
