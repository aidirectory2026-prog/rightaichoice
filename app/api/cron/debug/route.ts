import { NextResponse } from 'next/server'

export async function GET() {
  const cronSecret = process.env.CRON_SECRET
  return NextResponse.json({
    hasCronSecret: !!cronSecret,
    cronSecretLength: cronSecret?.length ?? 0,
    cronSecretPrefix: cronSecret?.slice(0, 4) ?? 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
    allCronEnvKeys: Object.keys(process.env).filter(k => k.includes('CRON')),
  })
}
