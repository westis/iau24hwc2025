'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { AlertCircle, Lock, LogOut } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, login, logout } = useAuth()
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const success = login(password)
    if (success) {
      router.push('/matching')
    } else {
      setError('Invalid password')
      setPassword('')
    }
  }

  const handleLogout = () => {
    logout()
    setPassword('')
    setError('')
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access
            </CardTitle>
            <CardDescription>
              You are logged in as administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ Authenticated successfully
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-600">Admin features enabled:</p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>Access to Matching page</li>
                <li>Edit runner information</li>
                <li>Manual matching controls</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/matching')}
                className="flex-1"
              >
                Go to Matching
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex-1"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Admin Login
          </CardTitle>
          <CardDescription>
            Enter admin password to access protected features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full">
              <Lock className="mr-2 h-4 w-4" />
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
