/* Catálogo único de servicios cobrables de Themora. Importes en centavos. */
const SERVICIOS = {
  listar: { centavos: 4999, descripcion: "Ficha de negocio en Google Maps y Apple Maps — configuración y verificación" },
  formar: { centavos: 14900, descripcion: "Formación de LLC y trámite del EIN — honorarios de Themora" },
};
const MAX_TASAS_CENTAVOS = 100000;
module.exports = { SERVICIOS, MAX_TASAS_CENTAVOS };
