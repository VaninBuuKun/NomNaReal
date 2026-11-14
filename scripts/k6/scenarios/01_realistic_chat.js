import http from 'k6/http';
import { check } from 'k6';
import { initTokenPool, getVuSession } from '../lib/auth-pool.js';
import { sleepWithJitter, randomChoice } from '../lib/helpers.js';
import {
  readMessageTrend,
  sendMessageTrend,
  successfulOps,
  failedOps,
  failureRate,
} from '../lib/metrics.js';

export const options = {
  stages: [
    { duration: '15s', target: 50 },   // Warm-up ramp: 50 concurrent users
    { duration: '30s', target: 150 },  // Steady load: 150 concurrent users
    { duration: '20s', target: 300 },  // Peak load: 300 concurrent users
    { duration: '10s', target: 0 },    // Graceful ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<800'],
    'nomna_failure_rate': ['rate<0.05'],
    'nomna_read_messages_duration_ms': ['p(95)<150'],
    'nomna_send_message_duration_ms': ['p(95)<250'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5050';

export function setup() {
  console.log(`[k6 Setup] Targeting backend at ${BASE_URL}...`);

  // 1. Authenticate seed users to create a robust Token Pool
  const seedUsers = [
    { email: 'alex@nomna.local', password: 'Password123!' },
    { email: 'minh@nomna.local', password: 'Password123!' },
    { email: 'van@nomna.local', password: 'Password123!' },
  ];
  const tokenPool = initTokenPool(BASE_URL, seedUsers);

  // 2. Locate active servers and channels for the benchmark
  const adminHeaders = {
    'Content-Type': 'application/json',
    'Cookie': `access_token=${tokenPool[0].token}`,
    'Authorization': `Bearer ${tokenPool[0].token}`,
  };

  const serversRes = http.get(`${BASE_URL}/api/servers`, { headers: adminHeaders });
  const servers = serversRes.json();
  if (!servers || servers.length === 0) {
    throw new Error('[k6 Setup] No servers found in database. Seed data may be missing.');
  }

  const serverId = servers[0].id;
  const channelsRes = http.get(`${BASE_URL}/api/servers/${serverId}/channels`, { headers: adminHeaders });
  const channels = channelsRes.json();

  if (!channels || channels.length === 0) {
    throw new Error('[k6 Setup] No channels found on default server.');
  }

  const channelList = channels.map((c) => c.id);
  console.log(`[k6 Setup] Registered ${channelList.length} channels on Server ${serverId} for testing.`);

  return {
    tokenPool,
    channelList,
  };
}

export default function (data) {
  const session = getVuSession(data.tokenPool, __VU);
  const channelId = randomChoice(data.channelList);

  // Weighted Action Distribution:
  // 75% Probability: Read message history (Browse chat)
  // 25% Probability: Send a new message (Active typing)
  const isReadAction = Math.random() < 0.75;

  if (isReadAction) {
    // 1. READ ACTION: Fetch 25 messages
    const getStart = Date.now();
    const res = http.get(`${BASE_URL}/api/channels/${channelId}/messages?limit=25`, {
      headers: session.headers,
    });
    readMessageTrend.add(Date.now() - getStart);

    const ok = check(res, {
      'GET /messages status 200': (r) => r.status === 200,
    });

    if (ok) {
      successfulOps.add(1);
      failureRate.add(0);
    } else {
      failedOps.add(1);
      failureRate.add(1);
    }

    // Realistic human pause after reading chat history (0.8s - 2.5s)
    sleepWithJitter(0.8, 2.5);
  } else {
    // 2. WRITE ACTION: Send a chat message
    const sendStart = Date.now();
    const payload = JSON.stringify({
      content: `[Enterprise k6] Message from VU ${__VU} (${session.userEmail}) at ${new Date().toISOString()}`,
    });

    const res = http.post(`${BASE_URL}/api/channels/${channelId}/messages`, payload, {
      headers: session.headers,
    });
    sendMessageTrend.add(Date.now() - sendStart);

    const ok = check(res, {
      'POST /messages status 200': (r) => r.status === 200,
    });

    if (ok) {
      successfulOps.add(1);
      failureRate.add(0);
    } else {
      failedOps.add(1);
      failureRate.add(1);
    }

    // Realistic human pause after sending message (1.0s - 3.0s)
    sleepWithJitter(1.0, 3.0);
  }
}
