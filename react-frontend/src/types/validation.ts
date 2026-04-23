// src/types/validation.ts - Types d'erreurs et validation
// ✅ Validation complète avec types stricts, zéro 'any'

/**
 * ==========================================
 * TYPES D'ERREURS HIÉRARCHIQUES
 * ==========================================
 */

// Catégories principales d'erreurs
export type ErrorCategory = 
  | 'validation'
  | 'network' 
  | 'file'
  | 'processing'
  | 'auth'
  | 'business'
  | 'system'
  | 'user';

// Sous-catégories pour validation
export type ValidationErrorType =
  | 'required_field'
  | 'invalid_format'
  | 'out_of_range'
  | 'type_mismatch'
  | 'constraint_violation'
  | 'dependency_error';

// Sous-catégories pour fichiers
export type FileErrorType =
  | 'invalid_type'
  | 'too_large'
  | 'too_small'
  | 'corrupted'
  | 'empty'
  | 'duplicate'
  | 'unsupported_format'
  | 'password_protected'
  | 'virus_detected';

// Sous-catégories pour traitement
export type ProcessingErrorType =
  | 'text_extraction_failed'
  | 'ai_analysis_failed'
  | 'timeout'
  | 'quota_exceeded'
  | 'model_unavailable'
  | 'insufficient_content'
  | 'content_policy_violation';

// Sous-catégories pour réseau
export type NetworkErrorType =
  | 'connection_failed'
  | 'request_timeout'
  | 'server_unavailable'
  | 'rate_limited'
  | 'proxy_error'
  | 'dns_error'
  | 'ssl_error';

/**
 * ==========================================
 * STRUCTURES D'ERREURS DÉTAILLÉES
 * ==========================================
 */

// Erreur de base avec contexte
export interface BaseError {
  id: string;                     // ID unique de l'erreur
  category: ErrorCategory;
  type: string;                   // Type spécifique selon la catégorie
  code: string;                   // Code d'erreur standardisé
  message: string;                // Message technique
  userMessage: string;            // Message utilisateur friendly
  timestamp: string;              // Date ISO de l'erreur
  severity: ErrorSeverity;
  retryable: boolean;
  context: ErrorContext;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  component?: string;             // Composant où l'erreur s'est produite
  action?: string;                // Action en cours
  userId?: number;                // ID utilisateur
  sessionId?: string;             // ID de session
  documentId?: number;            // ID document (si applicable)
  filename?: string;              // Nom fichier (si applicable)
  uploadTaskId?: string;          // ID tâche upload
  requestId?: string;             // ID requête API
  stackTrace?: string;            // Stack trace (développement)
  userAgent?: string;             // User agent
  url?: string;                   // URL courante
  metadata?: Record<string, unknown>; // Métadonnées additionnelles
}

/**
 * ==========================================
 * ERREURS SPÉCIALISÉES
 * ==========================================
 */

// Erreur de validation avec détails
export interface ValidationError extends BaseError {
  category: 'validation';
  type: ValidationErrorType;
  validationDetails: {
    field: string;                // Champ en erreur
    value: unknown;               // Valeur fournie
    expectedType?: string;        // Type attendu
    constraints?: ValidationConstraint[];
    suggestions?: string[];       // Suggestions de correction
  };
}

export interface ValidationConstraint {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: unknown;
  message: string;
}

// Erreur de fichier avec métadonnées
export interface FileError extends BaseError {
  category: 'file';
  type: FileErrorType;
  fileDetails: {
    filename: string;
    size: number;
    mimeType?: string;
    extension?: string;
    maxAllowedSize?: number;
    allowedTypes?: string[];
    detectedIssues?: string[];
  };
}

// Erreur de traitement avec progression
export interface ProcessingError extends BaseError {
  category: 'processing';
  type: ProcessingErrorType;
  processingDetails: {
    phase: 'upload' | 'extraction' | 'analysis' | 'saving';
    progress: number;             // Progression avant erreur (0-100)
    elapsedTime: number;          // Temps écoulé en ms
    estimatedTimeRemaining?: number;
    resourcesUsed?: {
      tokensConsumed?: number;
      memoryUsed?: number;
      processingUnits?: number;
    };
    partialResults?: unknown;     // Résultats partiels si disponibles
  };
}

// Erreur réseau avec détails techniques
export interface NetworkError extends BaseError {
  category: 'network';
  type: NetworkErrorType;
  networkDetails: {
    statusCode?: number;
    httpMethod?: string;
    url?: string;
    responseTime?: number;
    retryAttempt?: number;
    maxRetries?: number;
    connectionType?: 'wifi' | 'ethernet' | 'mobile' | 'unknown';
    isOnline?: boolean;
  };
}

/**
 * ==========================================
 * VALIDATION DE FICHIERS
 * ==========================================
 */

// Configuration de validation
export interface FileValidationConfig {
  maxSize: number;                // Taille max en bytes
  minSize: number;                // Taille min en bytes
  allowedTypes: string[];         // Types MIME autorisés
  allowedExtensions: string[];    // Extensions autorisées
  maxFiles: number;               // Nombre max de fichiers
  scanForVirus: boolean;          // Scanner antivirus
  validateContent: boolean;       // Valider le contenu
  strictTypeChecking: boolean;    // Vérification stricte du type
}

// Résultat de validation
export interface FileValidationResult {
  isValid: boolean;
  file: File;
  errors: FileError[];
  warnings: FileWarning[];
  metadata: FileMetadata;
  suggestions: string[];
}

export interface FileWarning {
  type: 'large_size' | 'old_format' | 'low_quality' | 'potential_issue';
  message: string;
  severity: 'info' | 'warning';
  canProceed: boolean;
}

export interface FileMetadata {
  detectedType: string;           // Type détecté
  actualExtension: string;        // Extension réelle
  isTextBased: boolean;           // Contient du texte
  hasMetadata: boolean;           // A des métadonnées
  estimatedPages?: number;        // Nombre de pages estimé
  language?: string;              // Langue détectée
  encoding?: string;              // Encodage détecté
  createdDate?: string;           // Date de création
  lastModified?: string;          // Dernière modification
}

/**
 * ==========================================
 * VALIDATION DES DONNÉES
 * ==========================================
 */

// Schéma de validation générique
export interface ValidationSchema<T> {
  fields: Record<keyof T, FieldValidation>;
  customValidators?: CustomValidator<T>[];
  errorMessages?: Record<string, string>;
}

export interface FieldValidation {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file';
  required: boolean;
  constraints?: FieldConstraint[];
  customValidator?: (value: unknown) => ValidationResult;
}

export interface FieldConstraint {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'length' | 'format';
  value: unknown;
  message?: string;
}

export interface CustomValidator<T> {
  name: string;
  validate: (data: Partial<T>) => ValidationResult;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  data?: unknown;                 // Données nettoyées/transformées
}

/**
 * ==========================================
 * GESTION GLOBALE DES ERREURS
 * ==========================================
 */

// Gestionnaire central d'erreurs
export interface ErrorManager {
  logError: (error: BaseError) => void;
  getErrors: (filters?: ErrorFilters) => BaseError[];
  clearErrors: (filters?: ErrorFilters) => void;
  getStats: () => ErrorStatistics;
  exportErrors: (format: 'json' | 'csv') => string;
}

export interface ErrorFilters {
  category?: ErrorCategory[];
  severity?: ErrorSeverity[];
  dateFrom?: string;
  dateTo?: string;
  component?: string;
  userId?: number;
  retryableOnly?: boolean;
}

export interface ErrorStatistics {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byComponent: Record<string, number>;
  retryableCount: number;
  recentCount: number;            // Dernières 24h
  trends: {
    hourly: number[];
    daily: number[];
  };
}

/**
 * ==========================================
 * REPORTING ET MONITORING
 * ==========================================
 */

// Rapport d'erreur pour monitoring externe
export interface ErrorReport {
  id: string;
  summary: string;
  description: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  stackTrace?: string;
  userActions: UserAction[];      // Actions utilisateur avant erreur
  systemState: SystemState;
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
}

export interface UserAction {
  type: string;
  timestamp: string;
  details: Record<string, unknown>;
}

export interface SystemState {
  browserInfo: {
    name: string;
    version: string;
    os: string;
  };
  performance: {
    memoryUsage?: number;
    connectionSpeed?: string;
    isOnline: boolean;
  };
  appState: {
    currentRoute: string;
    authStatus: boolean;
    featuresEnabled: string[];
  };
}

/**
 * ==========================================
 * UTILITAIRES DE VALIDATION
 * ==========================================
 */

// Validateurs de fichiers prêts à l'emploi
export const FILE_VALIDATORS = {
  // Validation de base
  basic: (config: Partial<FileValidationConfig> = {}) => {
    const defaultConfig: FileValidationConfig = {
      maxSize: 10 * 1024 * 1024, // 10MB
      minSize: 1024,              // 1KB
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv'
      ],
      allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.csv'],
      maxFiles: 10,
      scanForVirus: false,
      validateContent: true,
      strictTypeChecking: true
    };
    
    return { ...defaultConfig, ...config };
  },

  // Validation stricte pour documents sensibles
  strict: (config: Partial<FileValidationConfig> = {}) => ({
    ...FILE_VALIDATORS.basic(config),
    scanForVirus: true,
    strictTypeChecking: true,
    validateContent: true,
    maxSize: 5 * 1024 * 1024     // 5MB max
  }),

  // Validation permissive pour tests
  permissive: (config: Partial<FileValidationConfig> = {}) => ({
    ...FILE_VALIDATORS.basic(config),
    maxSize: 50 * 1024 * 1024,   // 50MB
    minSize: 0,                   // Pas de limite min
    scanForVirus: false,
    strictTypeChecking: false
  })
};

// Validateurs de données communs
export const DATA_VALIDATORS = {
  email: (value: string): ValidationResult => ({
    isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    errors: [],
    warnings: []
  }),

  filename: (value: string): ValidationResult => {
    const invalidChars = /[<>:"/\\|?*]/;
    return {
      isValid: !invalidChars.test(value) && value.length > 0 && value.length <= 255,
      errors: [],
      warnings: value.length > 100 ? ['Nom de fichier très long'] : []
    };
  },

  fileSize: (size: number, max: number = 10 * 1024 * 1024): ValidationResult => ({
    isValid: size > 0 && size <= max,
    errors: [],
    warnings: size > max * 0.8 ? ['Fichier proche de la limite'] : []
  })
};

/**
 * ==========================================
 * FACTORY POUR CRÉER DES ERREURS
 * ==========================================
 */

export class ErrorFactory {
  static createValidationError(
    field: string,
    value: unknown,
    constraint: ValidationConstraint,
    context: Partial<ErrorContext> = {}
  ): ValidationError {
    return {
      id: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'validation',
      type: 'constraint_violation',
      code: `VAL_${constraint.type.toUpperCase()}`,
      message: `Validation failed for field '${field}': ${constraint.message}`,
      userMessage: `Le champ ${field} est invalide.`,
      timestamp: new Date().toISOString(),
      severity: 'medium',
      retryable: false,
      context: {
        component: 'validation',
        action: 'field_validation',
        ...context
      },
      validationDetails: {
        field,
        value,
        constraints: [constraint]
      }
    };
  }

  static createFileError(
    file: File,
    type: FileErrorType,
    details: Partial<FileError['fileDetails']> = {},
    context: Partial<ErrorContext> = {}
  ): FileError {
    const errorMessages: Record<FileErrorType, string> = {
      invalid_type: 'Type de fichier non supporté',
      too_large: 'Fichier trop volumineux',
      too_small: 'Fichier trop petit',
      corrupted: 'Fichier corrompu',
      empty: 'Fichier vide',
      duplicate: 'Fichier déjà présent',
      unsupported_format: 'Format non supporté',
      password_protected: 'Fichier protégé par mot de passe',
      virus_detected: 'Virus détecté'
    };

    return {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'file',
      type,
      code: `FILE_${type.toUpperCase()}`,
      message: `File error: ${type} for ${file.name}`,
      userMessage: errorMessages[type],
      timestamp: new Date().toISOString(),
      severity: type === 'virus_detected' ? 'critical' : 'medium',
      retryable: false,
      context: {
        component: 'file_validation',
        action: 'file_check',
        filename: file.name,
        ...context
      },
      fileDetails: {
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        ...details
      }
    };
  }

  static createProcessingError(
    type: ProcessingErrorType,
    phase: ProcessingError['processingDetails']['phase'],
    progress: number,
    context: Partial<ErrorContext> = {}
  ): ProcessingError {
    const errorMessages: Record<ProcessingErrorType, string> = {
      text_extraction_failed: 'Échec de l\'extraction du texte',
      ai_analysis_failed: 'Échec de l\'analyse IA',
      timeout: 'Délai d\'attente dépassé',
      quota_exceeded: 'Quota dépassé',
      model_unavailable: 'Modèle IA indisponible',
      insufficient_content: 'Contenu insuffisant',
      content_policy_violation: 'Violation de la politique de contenu'
    };

    return {
      id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'processing',
      type,
      code: `PROC_${type.toUpperCase()}`,
      message: `Processing error: ${type} at ${phase} phase`,
      userMessage: errorMessages[type],
      timestamp: new Date().toISOString(),
      severity: 'high',
      retryable: !['content_policy_violation', 'insufficient_content'].includes(type),
      context: {
        component: 'document_processor',
        action: `${phase}_processing`,
        ...context
      },
      processingDetails: {
        phase,
        progress,
        elapsedTime: 0
      }
    };
  }
}

/**
 * ==========================================
 * TYPE GUARDS
 * ==========================================
 */

export function isValidationError(error: BaseError): error is ValidationError {
  return error.category === 'validation';
}

export function isFileError(error: BaseError): error is FileError {
  return error.category === 'file';
}

export function isProcessingError(error: BaseError): error is ProcessingError {
  return error.category === 'processing';
}

export function isNetworkError(error: BaseError): error is NetworkError {
  return error.category === 'network';
}

export function isRetryableError(error: BaseError): boolean {
  return error.retryable && error.severity !== 'critical';
}

export function isCriticalError(error: BaseError): boolean {
  return error.severity === 'critical';
}