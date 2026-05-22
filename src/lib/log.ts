type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEvent {
  level: LogLevel;
  message: string;
  workspaceId?: string;
  userId?: string;
  meta?: Record<string, unknown>;
}

export function log(event: LogEvent) {
  const { level, message, ...rest } = event;
  const payload = { level, message, timestamp: new Date().toISOString(), ...rest };
  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}
