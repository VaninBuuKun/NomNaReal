import { Trend, Counter, Rate } from 'k6/metrics';

export const readMessageTrend = new Trend('nomna_read_messages_duration_ms');
export const sendMessageTrend = new Trend('nomna_send_message_duration_ms');
export const successfulOps = new Counter('nomna_successful_ops');
export const failedOps = new Counter('nomna_failed_ops');
export const failureRate = new Rate('nomna_failure_rate');
