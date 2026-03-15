export async function health(): Promise<{
  status: string;
  timestamp: string;
  uptime: number;
}> {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
