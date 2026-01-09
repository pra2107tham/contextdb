import { LoginForm } from '@/components/LoginForm'

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const initialError = searchParams?.error ?? null
  return <LoginForm initialError={initialError} />
}

