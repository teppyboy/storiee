import { treaty } from '@elysiajs/eden';
import type { App } from '../../../apps/server';

export const api = treaty<App>('http://0.0.0.0:8080/');