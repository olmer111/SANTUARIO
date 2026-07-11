import { ProviderRegistry } from "@santuario/providers";
import { crearHiggsfieldProvider } from "./higgsfield";
import { crearFalProvider } from "./fal";

const globalForRegistry = globalThis as unknown as {
  providerRegistry?: ProviderRegistry;
};

/** Selector inteligente de proveedores (sección 8): un solo registro para
 * toda la app. Higgsfield y fal.ai se registran si hay credenciales
 * configuradas — con los dos activos, el selector puede hacer fallback
 * real si uno falla 2 veces o se queda sin cuota. */
export function getProviderRegistry(): ProviderRegistry {
  if (!globalForRegistry.providerRegistry) {
    const registry = new ProviderRegistry();
    const higgsfield = crearHiggsfieldProvider();
    if (higgsfield) registry.registrar(higgsfield);
    const fal = crearFalProvider();
    if (fal) registry.registrar(fal);
    globalForRegistry.providerRegistry = registry;
  }
  return globalForRegistry.providerRegistry;
}
