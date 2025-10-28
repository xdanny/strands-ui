export type WSEventType =
  | "session_start"
  | "session_end"
  | "user_input"
  | "message"
  | "thinking_start"
  | "thinking_end"
  | "tool_call_start"
  | "tool_call_end"
  | "error"
  | "agent_initialized"
  | "invocation_start"
  | "invocation_end"
  | "interrupt";

export type WSEvent = {
  type: WSEventType | string;
  timestamp: string;
  session_id: string;

  // For user_input and message events
  content?: string;
  role?: string;

  // For tool_call events
  tool_id?: string;
  tool_name?: string;
  tool_input?: Record<string, any>;
  result?: string;

  // For error events
  error?: string;

  // For interrupt events (plan mode)
  interrupts?: Array<{
    id: string;
    name: string;
    reason: string;
  }>;

  // For agent_initialized
  agent_name?: string;

  // Legacy support
  data?: any;
};

export type WSEventHandler = (event: WSEvent) => void;

export class StrandsWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private url: string;
  private handlers: Set<WSEventHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(sessionId: string, baseUrl: string = "ws://localhost:8000") {
    this.sessionId = sessionId;
    this.url = `${baseUrl}/ws/${sessionId}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log(`WebSocket connected to session ${this.sessionId}`);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WSEvent;
            this.handlers.forEach((handler) => handler(data));
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("WebSocket closed");
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    // Don't auto-reconnect if explicitly closed
    if (!this.ws) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not open");
    }
  }

  sendInput(content: string) {
    this.send({
      type: "input",
      content,
    });
  }

  on(handler: WSEventHandler) {
    this.handlers.add(handler);
  }

  off(handler: WSEventHandler) {
    this.handlers.delete(handler);
  }

  close() {
    if (this.ws) {
      // Set to null first to prevent auto-reconnect
      const ws = this.ws;
      this.ws = null;
      ws.close();
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
