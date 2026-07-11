import { ProviderRegistry } from "@santuario/providers";
import { crearHiggsfieldProvider } from "./higgsfield";

const globalForRegistry = globalThis as unknown as {
  providerRegistry?: ProviderRegistry;
};

/** Selector inteligente de proveedores (sección 8): un solo registro para
 * toda la app, con Higgsfield registrado si hay credenciales configuradas. */
export function getProviderRegistry(): ProviderRegistry {
  if (!globalForRegistry.providerRegistry) {
    const registry = new ProviderRegistry();
    const higgsfield = crearHiggsfieldProvider();
    if (higgsfield) registry.registrar(higgsfield);
    globalForRegistry.providerRegistry = registry;
  }
  return globalForRegistry.providerRegistry;
}
