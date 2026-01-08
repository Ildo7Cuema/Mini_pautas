/**
 * Municipal Education Module - Main Entry Point
 * 
 * This module provides enhanced functionality for the Municipal Education Direction profile.
 * All exports are isolated and modular - the module can be removed without affecting the system.
 */

// Types
export * from './types';

// API Functions
export * from './api/escolasManagement';
export * from './api/pedagogicSupervision';
export * from './api/funcionariosQuery';
export * from './api/documentosOficiais';
export * from './api/circulares';
export * from './api/relatorios';

// Hooks
export { useEscolasManagement } from './hooks/useEscolasManagement';
export { usePedagogicData } from './hooks/usePedagogicData';
export { useFuncionarios } from './hooks/useFuncionarios';
export { useCirculares } from './hooks/useCirculares';
export { useRelatoriosMunicipais } from './hooks/useRelatoriosMunicipais';
