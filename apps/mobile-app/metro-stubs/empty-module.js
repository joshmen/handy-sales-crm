// Audit 2026-05-20 — Stub vacío para css-tree y mdn-data.
//
// Ver metro.config.js para el contexto. Estas deps son arrastradas por
// react-native-svg para inline-styles dentro de <svg> — feature que no
// usamos en este app — pero su tamaño (~10K líneas de CSS data) hace que
// Hermes dev fail a parsear el bundle.
//
// Si algún componente eventualmente importa css-tree directamente y trata
// de usarlo, se rompe en runtime obvio (csstree.parse is not a function).

module.exports = {};
module.exports.default = {};
module.exports.List = class {};
module.exports.parse = () => {
  throw new Error('css-tree stubbed in dev bundle (see metro.config.js)');
};
