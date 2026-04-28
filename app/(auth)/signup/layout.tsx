import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a free RightAIChoice account to save stacks and join the community.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
