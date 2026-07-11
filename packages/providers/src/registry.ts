import type { CapacidadesProveedor, VideoProvider } from "./types";

export interface EstadisticasProveedor {
  tasaExitoHistorica: number;
  fallosConsecutivos: number;
}

/**
 * Registro + selector inteligente de proveedores.
 * Elige por capacidades requeridas, cuota restante y tasa de éxito histórica.
 * Si un proveedor falla 2 veces o agota cuota, el Generador pasa al siguiente
 * con el prompt re-adaptado (el ADN permanece idéntico).
 */
export class ProviderRegistry {
  private proveedores = new Map<string, VideoProvider>();
  private estadisticas = new Map<string, EstadisticasProveedor>();

  registrar(proveedor: VideoProvider): void {
    this.proveedores.set(proveedor.id, proveedor);
    if (!this.estadisticas.has(proveedor.id)) {
      this.estadisticas.set(proveedor.id, {
        tasaExitoHistorica: 1,
        fallosConsecutivos: 0,
      });
    }
  }

  obtener(id: string): VideoProvider | undefined {
    return this.proveedores.get(id);
  }

  listar(): VideoProvider[] {
    return [...this.proveedores.values()];
  }

  registrarResultado(id: string, exito: boolean): void {
    const stats = this.estadisticas.get(id);
    if (!stats) return;
    stats.fallosConsecutivos = exito ? 0 : stats.fallosConsecutivos + 1;
    // media móvil simple; suficiente para ordenar candidatos
    stats.tasaExitoHistorica =
      stats.tasaExitoHistorica * 0.8 + (exito ? 1 : 0) * 0.2;
  }

  /**
   * Devuelve candidatos ordenados que cumplen los requisitos, excluyendo los
   * que acumulan 2+ fallos consecutivos o no tienen cuota.
   */
  async seleccionar(
    requisitos: Partial<CapacidadesProveedor>
  ): Promise<VideoProvider[]> {
    const candidatos: { proveedor: VideoProvider; puntaje: number }[] = [];
    for (const proveedor of this.proveedores.values()) {
      const stats = this.estadisticas.get(proveedor.id);
      if (stats && stats.fallosConsecutivos >= 2) continue;
      if (requisitos.imageToVideo && !proveedor.capacidades.imageToVideo)
        continue;
      if (requisitos.textToVideo && !proveedor.capacidades.textToVideo)
        continue;
      if (requisitos.soportaSeed && !proveedor.capacidades.soportaSeed)
        continue;
      if (
        requisitos.duracionMaxSeg !== undefined &&
        proveedor.capacidades.duracionMaxSeg < requisitos.duracionMaxSeg
      )
        continue;
      if (
        requisitos.formatos &&
        !requisitos.formatos.every((f) =>
          proveedor.capacidades.formatos.includes(f)
        )
      )
        continue;

      const cuota = await proveedor.cuotaRestante().catch(() => 0);
      if (cuota <= 0) continue;
      const puntaje =
        (stats?.tasaExitoHistorica ?? 1) * Math.min(cuota, 100);
      candidatos.push({ proveedor, puntaje });
    }
    return candidatos
      .sort((a, b) => b.puntaje - a.puntaje)
      .map((c) => c.proveedor);
  }
}
