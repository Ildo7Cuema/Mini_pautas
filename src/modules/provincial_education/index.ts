/**
 * Provincial Education Module
 * 
 * This module provides functionality for Provincial Education Directorates,
 * including management of municipal directorates, school oversight,
 * pedagogic supervision, provincial circulars, and reports.
 */

// Types
export * from './types';

// API Functions
export * from './api/direcoesMunicipaisManagement';
export * from './api/escolasProvincialQuery';
export * from './api/pedagogicSupervisionProvincial';
export * from './api/circularesProvinciais';
export * from './api/relatoriosProvinciais';

// Hooks
export { useDirecoesMunicipais } from './hooks/useDirecoesMunicipais';
export { useEscolasProvincial } from './hooks/useEscolasProvincial';
export { usePedagogicDataProvincial } from './hooks/usePedagogicDataProvincial';
export { useCircularesProvinciais } from './hooks/useCircularesProvinciais';
export { useRelatoriosProvinciais } from './hooks/useRelatoriosProvinciais';

// Components
export * from './components';
