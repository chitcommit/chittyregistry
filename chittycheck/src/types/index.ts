export interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface CheckOptions {
  verbose?: boolean;
  timeout?: number;
  skipCache?: boolean;
}

export interface SystemCheck {
  name: string;
  description: string;
  validator: () => Promise<ValidationResult>;
  category: CheckCategory;
  priority: Priority;
}

export enum CheckCategory {
  SYSTEM = "system",
  NETWORK = "network",
  SECURITY = "security",
  CHITTYOS = "chittyos",
  DEVELOPMENT = "development",
}

export enum Priority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

export interface ChittyOSConfig {
  version: string;
  environment: "development" | "production" | "test";
  mcpServers: string[];
  chittyIdEnabled: boolean;
  hooks: HookConfig[];
}

export interface HookConfig {
  name: string;
  event: string;
  script: string;
  enabled: boolean;
}
