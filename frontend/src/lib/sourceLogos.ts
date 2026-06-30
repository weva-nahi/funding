import gcfLogo from '@/assets/images/GCF.png'
import gefLogo from '@/assets/images/GEF.png'
import oecdLogo from '@/assets/images/OECD.png'
import worldBankLogo from '@/assets/images/World_Bank.jpg'
import richatLogo from '@/assets/images/richat_partners_logo.png'

export const SOURCE_LOGOS: Record<string, string> = {
  GCF: gcfLogo,
  GEF: gefLogo,
  OECD: oecdLogo,
  WORLD_BANK: worldBankLogo,
}

export function getSourceLogo(source?: string | null): string | undefined {
  if (!source) return undefined
  const key = source.trim().toUpperCase().replace(/[\s-]+/g, '_')
  return SOURCE_LOGOS[key]
}

export { richatLogo }