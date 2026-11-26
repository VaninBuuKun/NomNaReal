import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { initTokenPool, getVuSession } from '../lib/auth-pool.js';

// Custom SRE telemetry metrics for real-time SignalR fan-out evaluation
const fanoutReceived = new Counter('nomna_ws_fanout_messages_received');
const fanoutLatency = new Trend('nomna_ws_fanout_e2e_latency_ms', true);
const wsHandshakeSuccess = new Rate('nomna_ws_handshake_success_rate');
const publishLatency = new Trend('nomna_ws_publish_duration_ms', true);

const RECORD_SEPARATOR = String.fromCharCode(0x1e);
const BASE_HTTP_URL = __ENV.TARGET_URL || 'http://localhost:5050';
const SIGNALR_HUB_URL = __ENV.WS_URL || 'ws://localhost:5050/hubs/chat';

export const options = {
  scenarios: {
    // 1. Concurrent WebSocket listeners joined to the target channel group
    ws_subscribers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 100 },
        { duration: '30s', target: 300 },
        { duration: '25s', target: 500 },
        { duration: '10s', target: 0 },
      ],
      exec: 'runSubscriber',
    },
    // 2. Dedicated message publishers injecting 10 messages/sec into the channel
    message_publishers: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '65s',
      preAllocatedVUs: 10,
      maxVUs: 30,
      startTime: '10s',
      exec: 'runPublisher',
    },
  },
  thresholds: {
    'nomna_ws_handshake_success_rate': ['rate>0.99'],
    'nomna_ws_fanout_e2e_latency_ms': ['p(95)<150', 'p(99)<300'],
    'nomna_ws_publish_duration_ms': ['p(95)<120'],
  },
};

export function setup() {
  const seedUsers = [
    { email: 'alex@nomna.local', password: 'Password123!' },
    { email: 'minh@nomna.local', password: 'Password123!' },
    { email: 'van@nomna.local', password: 'Password123!' },
  ];
  const tokenPool = initTokenPool(BASE_HTTP_URL, seedUsers);
  const adminHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `access_token=${tokenPool[0].token}`,
  };

  const servers = http.get(`${BASE_HTTP_URL}/api/servers`, { headers: adminHeaders }).json();
  if (!servers || servers.length === 0) {
    throw new Error('[k6 Setup] No servers found. Ensure database is seeded.');
  }

  const serverId = servers[0].id;
  const channels = http.get(`${BASE_HTTP_URL}/api/servers/${serverId}/channels`, { headers: adminHeaders }).json();
  const textChannel = channels.find((c) => c.type === 0) || channels[0];

  return { channelId: textChannel.id, tokenPool };
}

export function runSubscriber(data) {
  const session = getVuSession(data.tokenPool, __VU);
  const url = `${SIGNALR_HUB_URL}?access_token=${encodeURIComponent(session.token)}`;

  const res = ws.connect(url, { headers: { Cookie: `access_token=${session.token}` } }, function (socket) {
    let handshakeDone = false;

    socket.on('open', () => {
      socket.send(JSON.stringify({ protocol: 'json', version: 1 }) + RECORD_SEPARATOR);
    });

    // Periodic presence heartbeat renewal every 25s
    socket.setInterval(() => {
      if (handshakeDone) {
        socket.send(JSON.stringify({ type: 1, target: 'PingPresence', arguments: [] }) + RECORD_SEPARATOR);
      }
    }, 25000);

    socket.on('message', (rawData) => {
      const frames = rawData.split(RECORD_SEPARATOR).filter(Boolean);
      for (const frame of frames) {
        if (!handshakeDone) {
          handshakeDone = true;
          wsHandshakeSuccess.add(1);
          socket.send(
            JSON.stringify({ type: 1, target: 'JoinChannel', arguments: [data.channelId] }) + RECORD_SEPARATOR
          );
          continue;
        }
        try {
          const parsed = JSON.parse(frame);
          if (parsed.type === 6) {
            socket.send(JSON.stringify({ type: 6 }) + RECORD_SEPARATOR);
            continue;
          }
          if (parsed.type === 1 && parsed.target === 'ReceiveMessage') {
            fanoutReceived.add(1);
            const msg = parsed.arguments[0];
            const match = msg && msg.content && msg.content.match(/\[ts:(\d+)\]/);
            if (match) {
              const sentTs = parseInt(match[1], 10);
              const e2eMs = Date.now() - sentTs;
              if (e2eMs >= 0) fanoutLatency.add(e2eMs);
            }
          }
        } catch (_) {
          // Ignore non-JSON control frames
        }
      }
    });

    socket.setTimeout(() => socket.close(), 35000);
  });

  if (!res || res.status !== 101) {
    wsHandshakeSuccess.add(0);
  }
  sleep(1);
}

export function runPublisher(data) {
  const session = getVuSession(data.tokenPool, __VU);
  const start = Date.now();
  const payload = JSON.stringify({
    content: `[Fanout-Bench] [ts:${start}] Broadcast test from VU ${__VU}`,
  });

  const res = http.post(`${BASE_HTTP_URL}/api/channels/${data.channelId}/messages`, payload, {
    headers: session.headers,
  });
  publishLatency.add(Date.now() - start);
  check(res, { 'Publish 200 OK': (r) => r.status === 200 });
}

