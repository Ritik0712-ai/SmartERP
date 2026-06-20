import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/prisma';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const server = app.listen(env.port, () => {
    console.log('');
    console.log('🚀 SmartERP API started');
    console.log(`   Environment: ${env.nodeEnv}`);
    console.log(`   Local:        http://localhost:${env.port}`);
    console.log(`   Health:       http://localhost:${env.port}/health`);
    console.log(`   API base:     ${env.apiBaseUrl}`);
    console.log('');
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('HTTP server closed, database disconnected');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
