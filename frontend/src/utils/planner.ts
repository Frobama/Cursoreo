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
    console.log(`Added node for course: ${r.prereq} in ${r.asignatura}`);
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
      const pn = map.get(p);
      const rn = map.get(r.codigo);
      if (!rn) continue;
      if (pn) {
        pn.deps.push(r.codigo);
        rn.indegree++;
      } else {
        // prereq no encontrado: lo contamos igual para detectar error luego
        rn.indegree++;
      }
    }
  }
  console.log("Graph built:", map);
  return map;
}

export function hasCycle(graph: Map<string, Node>) {
  const q: string[] = [];
  const indeg = new Map<string, number>();
  for (const [k, v] of graph) {
    indeg.set(k, v.indegree);
    if (v.indegree === 0) q.push(k);
  }
  let removed = 0;
  while (q.length) {
    const cur = q.shift()!;
    removed++;
    for (const nxt of graph.get(cur)!.deps) {
      indeg.set(nxt, (indeg.get(nxt) ?? 0) - 1);
      if ((indeg.get(nxt) ?? 0) === 0) q.push(nxt);
    }
  }
  if (removed !== graph.size) {
    console.log(`Cycle detected: removed ${removed} out of ${graph.size} nodes`);
  }
  return removed !== graph.size;
}

export function planSemesters(
  malla: Ramo[],
  completedSet: Set<string>,
  maxCreditsPerSemester = 30
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

  for (const done of completedSet) {
    if (!graph.has(done)) continue;
    for (const dep of graph.get(done)!.deps) {
      indeg.set(dep, (indeg.get(dep) ?? 0) - 1);
    }
    indeg.set(done, -Infinity);
  }

  const available = new Set<string>();
  for (const [k, d] of indeg.entries()) {
    if (d <= 0 && !completedSet.has(k)) available.add(k);
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
      if (scheduled.has(r.codigo) || completedSet.has(r.codigo)) continue;
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
        if ((indeg.get(dep) ?? 0) <= 0 && !completedSet.has(dep) && !scheduled.has(dep)) {
          available.add(dep);
        }
      }
    }

    semester++;
  }

  const remaining: string[] = [];
  for (const [k] of graph) {
    if (!completedSet.has(k) && !scheduled.has(k)) remaining.push(k);
  }

  return { plan, remaining, errors };
}
