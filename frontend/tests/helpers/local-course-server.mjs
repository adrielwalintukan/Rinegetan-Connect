import { startLocalApp } from './local-course-fixture.mjs';
startLocalApp(process.argv.includes('--quality') ? 'quality' : process.argv.includes('--build') ? 'build' : 'start');
