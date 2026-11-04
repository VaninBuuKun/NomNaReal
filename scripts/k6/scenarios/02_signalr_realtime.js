import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metric tracking
const messageReceivedCounter = new Counter('nomna_signalr_messages_received');
const connectionErrors = new Counter('nomna_signalr_connection_errors');
const messageLatency = new Trend('nomna_signalr_message_latency_ms');

export const options = {
  stages: [
    { duration: '15s', target: 100 },  // Ramp to 100 concurrent WebSocket clients
    { duration: '30s', target: 300 },  // Push to 300 concurrent WebSocket clients
    { duration: '20s', target: 500 },  // Peak 500 concurrent connections
    { duration: '10s', target: 0 },    // Graceful disconnect
  ],
  thresholds: {
    'nomna_signalr_connection_errors': ['count<20'],
    'nomna_signalr_message_latency_ms': ['p(95)<250'],
  },
};

const BASE_HTTP_URL = __ENV.TARGET_URL || 'http://localhost:5050';
const SIGNALR_HUB_URL = __ENV.WS_URL || 'ws://localhost:5050/hubs/chat';
const RECORD_SEPARATOR = String.fromCharCode(0x1e); // SignalR 0x1E record separator

export function setup() {
  console.log(`[k6 Setup] Authenticating to get channel ID for WebSocket test...`);
  const loginRes = http.post(
    `${BASE_HTTP_URL}/api/auth/login`,
    JSON.stringify({
      emailOrUsername: 'alex@nomna.local',
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const serversRes = http.get(`${BASE_HTTP_URL}/api/servers`);
  const servers = serversRes.json();
  const serverId = servers[0].id;

  const channelsRes = http.get(`${BASE_HTTP_URL}/api/servers/${serverId}/channels`);
  const channels = channelsRes.json();
  const channelId = channels[0].id;

  console.log(`[k6 Setup] SignalR test target channel: ${channelId}`);
  return { channelId };
}

export default function (data) {
  const channelId = data.channelId;
  const params = { tags: { client_type: 'signalr_bench' } };

  const res = ws.connect(SIGNALR_HUB_URL, params, function (socket) {
    let handshakeCompleted = false;

    socket.on('open', () => {
      // 1. Send SignalR Protocol Handshake
      const handshakeMsg =
        JSON.stringify({ protocol: 'json', version: 1 }) + RECORD_SEPARATOR;
      socket.send(handshakeMsg);
    });

    socket.on('message', (rawData) => {
      const messages = rawData.split(RECORD_SEPARATOR).filter(Boolean);

      for (const raw of messages) {
        if (!handshakeCompleted) {
          // Handshake acknowledged with empty object {}
          handshakeCompleted = true;

          // 2. Join the chat channel group
          const joinInvocation =
            JSON.stringify({
              type: 1, // Invocation
              target: 'JoinChannel',
              arguments: [channelId],
            }) + RECORD_SEPARATOR;
          socket.send(joinInvocation);
          continue;
        }

        try {
          const parsed = JSON.parse(raw);

          // 3. Heartbeat / Ping response (SignalR Type 6 = Ping)
          if (parsed.type === 6) {
            socket.send(JSON.stringify({ type: 6 }) + RECORD_SEPARATOR);
            continue;
          }

          // 4. Handle incoming message broadcast
          if (parsed.type === 1 && parsed.target === 'ReceiveMessage') {
            messageReceivedCounter.add(1);
            const msg = parsed.arguments[0];
            if (msg && msg.createdAt) {
              const sentAt = new Date(msg.createdAt).getTime();
              const now = Date.now();
              const latency = now - sentAt;
              if (latency >= 0) {
                messageLatency.add(latency);
              }
            }
          }
        } catch {
          // Ignore non-json frames
        }
      }
    });

    socket.on('error', (err) => {
      connectionErrors.add(1);
    });

    // Hold connection alive for 30s session before reconnect
    socket.setTimeout(function () {
      socket.close();
    }, 30000);
  });

  check(res, {
    'WebSocket 101 Switching Protocols': (r) => r && r.status === 101,
  });

  sleep(1);
}
