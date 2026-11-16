import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metric tracking
const messageReadTrend = new Trend('nomna_get_messages_duration_ms');
const messageSendTrend = new Trend('nomna_send_message_duration_ms');
const successfulOperations = new Counter('nomna_successful_ops');
const failedOperations = new Counter('nomna_failed_ops');
const failureRate = new Rate('nomna_failure_rate');

export const options = {
  stages: [
    { duration: '15s', target: 50 },   // Warm-up ramp: 50 concurrent users
    { duration: '30s', target: 150 },  // Steady load: 150 concurrent users
    { duration: '20s', target: 300 },  // Peak load: 300 concurrent users
    { duration: '10s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300', 'p(99)<800'],
    'nomna_failure_rate': ['rate<0.05'], // Max 5% failures under peak
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5050';

export function setup() {
  console.log(`[k6 Setup] Targeting backend at ${BASE_URL}...`);

  // Log in as seed admin user to obtain channel and auth credentials
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      emailOrUsername: 'alex@nomna.local',
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'Setup Login Successful (200)': (r) => r.status === 200,
  });

  if (loginRes.status !== 200) {
    throw new Error(`Setup failed to authenticate. Status: ${loginRes.status}`);
  }

  // Fetch servers to locate general channel ID
  const serversRes = http.get(`${BASE_URL}/api/servers`);
  const servers = serversRes.json();
  if (!servers || servers.length === 0) {
    throw new Error('No servers found in database. Seed data may be missing.');
  }

  const serverId = servers[0].id;
  const channelsRes = http.get(`${BASE_URL}/api/servers/${serverId}/channels`);
  const channels = channelsRes.json();

  if (!channels || channels.length === 0) {
    throw new Error('No channels found on default server.');
  }

  const channelId = channels[0].id;
  console.log(`[k6 Setup] Initialized test on Server: ${serverId}, Channel: ${channelId}`);

  return { channelId };
}

export default function (data) {
  const channelId = data.channelId;

  // 1. Authenticate virtual user
  const userIndex = (__VU % 3) + 1;
  const userEmail =
    userIndex === 1
      ? 'alex@nomna.local'
      : userIndex === 2
      ? 'minh@nomna.local'
      : 'van@nomna.local';

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      emailOrUsername: userEmail,
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginOk = check(loginRes, { 'Login 200': (r) => r.status === 200 });
  if (!loginOk) {
    failedOperations.add(1);
    failureRate.add(1);
    sleep(1);
    return;
  }

  // 2. Read messages (Simulate user scrolling chat / viewing history)
  const getStart = Date.now();
  const getMessagesRes = http.get(`${BASE_URL}/api/channels/${channelId}/messages?limit=25`);
  messageReadTrend.add(Date.now() - getStart);

  const getOk = check(getMessagesRes, {
    'GET /messages status 200': (r) => r.status === 200,
  });

  if (getOk) {
    successfulOperations.add(1);
    failureRate.add(0);
  } else {
    failedOperations.add(1);
    failureRate.add(1);
  }

  // 3. Send message (Simulate user typing and sending)
  const sendStart = Date.now();
  const sendRes = http.post(
    `${BASE_URL}/api/channels/${channelId}/messages`,
    JSON.stringify({
      content: `[k6 Load Test] Message from VU ${__VU} Iteration ${__ITER} at ${new Date().toISOString()}`,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  messageSendTrend.add(Date.now() - sendStart);

  const sendOk = check(sendRes, {
    'POST /messages status 200': (r) => r.status === 200,
  });

  if (sendOk) {
    successfulOperations.add(1);
    failureRate.add(0);
  } else {
    failedOperations.add(1);
    failureRate.add(1);
  }

  // Realistic human pause before next message
  sleep(0.3);
}
