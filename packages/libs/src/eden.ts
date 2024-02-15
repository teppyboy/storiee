import { edenTreaty } from '@elysiajs/eden';
import type { App } from '../../../apps/server';
import { EdenTreaty } from '@elysiajs/eden/src/treaty';

export const api: EdenTreaty.Create<App> = edenTreaty<App>('http://0.0.0.0:8080/');